import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluateConditionsRequest {
  recipientId: string;
  campaignId: string;
  eventType?: 'mail_delivered' | 'call_completed' | 'qr_scanned' | 'purl_visited' | 'form_submitted';
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { recipientId, campaignId, eventType, metadata = {} } = await req.json() as EvaluateConditionsRequest;

    console.log('Evaluating conditions:', { recipientId, campaignId, eventType });

    // Get all conditions for this campaign
    const { data: conditions, error: conditionsError } = await supabase
      .from('campaign_conditions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sequence_order');

    if (conditionsError) {
      throw conditionsError;
    }

    if (!conditions || conditions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No conditions to evaluate' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient's current condition status
    const { data: statuses, error: statusError } = await supabase
      .from('recipient_condition_status')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('campaign_id', campaignId);

    if (statusError) {
      throw statusError;
    }

    const statusMap = new Map(statuses?.map(s => [s.condition_id, s]) || []);

    // Check each condition in sequence
    for (const condition of conditions) {
      const currentStatus = statusMap.get(condition.id);

      // If this condition is already completed, skip it
      if (currentStatus?.status === 'completed') {
        continue;
      }

      // Check if this condition should be evaluated based on event type
      if (eventType && condition.condition_type !== eventType) {
        continue;
      }

      // Check if previous conditions are met (for sequential flow)
      if (condition.sequence_order > 1) {
        const previousConditions = conditions.filter(c => c.sequence_order < condition.sequence_order);
        const allPreviousMet = previousConditions.every(pc => {
          const prevStatus = statusMap.get(pc.id);
          return prevStatus?.status === 'completed';
        });

        if (!allPreviousMet && condition.is_required) {
          console.log('Previous conditions not met, skipping', condition.condition_number);
          continue;
        }
      }

      // Mark condition as completed
      const { error: upsertError } = await supabase
        .from('recipient_condition_status')
        .upsert({
          recipient_id: recipientId,
          campaign_id: campaignId,
          condition_id: condition.id,
          condition_number: condition.condition_number,
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata_json: metadata,
        }, {
          onConflict: 'recipient_id,condition_id'
        });

      if (upsertError) {
        console.error('Error updating condition status:', upsertError);
        throw upsertError;
      }

      console.log('Condition met:', condition.condition_number, 'Trigger:', condition.trigger_action);

      // Execute trigger action
      const triggerId = await executeTriggerAction(supabase, {
        recipientId,
        campaignId,
        condition,
        metadata,
      });

      console.log('Trigger executed:', triggerId);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Conditions evaluated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error evaluating conditions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeTriggerAction(
  supabase: any,
  {
    recipientId,
    campaignId,
    condition,
    metadata,
  }: {
    recipientId: string;
    campaignId: string;
    condition: any;
    metadata: Record<string, any>;
  }
): Promise<string> {
  // Create trigger log
  const { data: trigger, error: triggerError } = await supabase
    .from('condition_triggers')
    .insert({
      recipient_id: recipientId,
      campaign_id: campaignId,
      condition_id: condition.id,
      condition_number: condition.condition_number,
      trigger_action: condition.trigger_action,
      status: 'processing',
      metadata_json: metadata,
    })
    .select()
    .single();

  if (triggerError) {
    throw triggerError;
  }

  try {
    // Execute the appropriate action
    switch (condition.trigger_action) {
      case 'send_gift_card':
        await sendGiftCard(supabase, recipientId, campaignId, condition, trigger.id);
        break;

      case 'send_sms':
        await sendSMS(supabase, recipientId, condition, trigger.id);
        break;

      case 'trigger_webhook':
        await triggerWebhook(supabase, recipientId, campaignId, condition, trigger.id);
        break;

      case 'update_crm':
        await updateCRM(supabase, recipientId, campaignId, condition, trigger.id);
        break;

      case 'send_email':
        await sendEmail(supabase, recipientId, condition, trigger.id);
        break;

      default:
        console.log('Unknown trigger action:', condition.trigger_action);
    }

    // Mark trigger as completed
    await supabase
      .from('condition_triggers')
      .update({ status: 'completed' })
      .eq('id', trigger.id);

    return trigger.id;

  } catch (error) {
    console.error('Error executing trigger action:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Mark trigger as failed
    await supabase
      .from('condition_triggers')
      .update({ 
        status: 'failed',
        error_message: errorMessage 
      })
      .eq('id', trigger.id);

    throw error;
  }
}

async function sendGiftCard(
  supabase: any,
  recipientId: string,
  campaignId: string,
  condition: any,
  triggerId: string
) {
  if (!condition.gift_card_pool_id) {
    throw new Error('No gift card pool configured');
  }

  // Get recipient details
  const { data: recipient } = await supabase
    .from('recipients')
    .select('phone')
    .eq('id', recipientId)
    .single();

  if (!recipient?.phone) {
    throw new Error('Recipient has no phone number');
  }

  // Claim a gift card
  const { data: giftCard, error: claimError } = await supabase
    .rpc('claim_available_card', {
      p_pool_id: condition.gift_card_pool_id,
      p_recipient_id: recipientId,
    });

  if (claimError || !giftCard || giftCard.length === 0) {
    throw new Error('No available gift cards');
  }

  const card = giftCard[0];

  // Create delivery record
  const { data: delivery, error: deliveryError } = await supabase
    .from('gift_card_deliveries')
    .insert({
      gift_card_id: card.card_id,
      recipient_id: recipientId,
      campaign_id: campaignId,
      condition_number: condition.condition_number,
      delivery_method: 'sms',
      delivery_address: recipient.phone,
      delivery_status: 'pending',
      sms_message: condition.sms_template || `Your reward code: ${card.card_code}`,
    })
    .select()
    .single();

  if (deliveryError) {
    throw deliveryError;
  }

  // Send SMS
  await supabase.functions.invoke('send-gift-card-sms', {
    body: { deliveryId: delivery.id },
  });

  // Link delivery to trigger
  await supabase
    .from('condition_triggers')
    .update({ gift_card_delivery_id: delivery.id })
    .eq('id', triggerId);

  console.log('Gift card sent:', card.card_code);
}

async function sendSMS(supabase: any, recipientId: string, condition: any, triggerId: string) {
  const { data: recipient } = await supabase
    .from('recipients')
    .select('phone, first_name')
    .eq('id', recipientId)
    .single();

  if (!recipient?.phone) {
    throw new Error('Recipient has no phone number');
  }

  const message = condition.sms_template || 'Thank you for your response!';
  
  // TODO: Implement actual SMS sending
  console.log('SMS would be sent to:', recipient.phone, 'Message:', message);
}

async function triggerWebhook(
  supabase: any,
  recipientId: string,
  campaignId: string,
  condition: any,
  triggerId: string
) {
  if (!condition.webhook_url) {
    throw new Error('No webhook URL configured');
  }

  const { data: recipient } = await supabase
    .from('recipients')
    .select('*')
    .eq('id', recipientId)
    .single();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .single();

  const webhookPayload = {
    event: 'condition_met',
    condition_number: condition.condition_number,
    condition_type: condition.condition_type,
    campaign_id: campaignId,
    campaign_name: campaign?.name,
    recipient,
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(condition.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });

  const responseData = await response.json().catch(() => ({}));

  await supabase
    .from('condition_triggers')
    .update({ webhook_response_json: responseData })
    .eq('id', triggerId);

  console.log('Webhook triggered:', condition.webhook_url);
}

async function updateCRM(
  supabase: any,
  recipientId: string,
  campaignId: string,
  condition: any,
  triggerId: string
) {
  // Get CRM integration for campaign
  const { data: integration } = await supabase
    .from('crm_integrations')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_active', true)
    .single();

  if (!integration) {
    console.log('No active CRM integration found');
    return;
  }

  // Trigger the webhook with CRM-specific data
  await triggerWebhook(supabase, recipientId, campaignId, {
    ...condition,
    webhook_url: integration.webhook_url,
  }, triggerId);
}

async function sendEmail(supabase: any, recipientId: string, condition: any, triggerId: string) {
  const { data: recipient } = await supabase
    .from('recipients')
    .select('email, first_name')
    .eq('id', recipientId)
    .single();

  if (!recipient?.email) {
    throw new Error('Recipient has no email');
  }

  // TODO: Implement actual email sending
  console.log('Email would be sent to:', recipient.email);
}