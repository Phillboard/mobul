import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

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

// =====================================================
// PERFORMANCE OPTIMIZATION: Cache and connection reuse
// =====================================================

// Cache for campaign conditions (reduces DB queries)
const conditionCache = new Map<string, { data: any[]; expires: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCachedConditions(campaignId: string): any[] | null {
  const cached = conditionCache.get(campaignId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  conditionCache.delete(campaignId);
  return null;
}

function setCachedConditions(campaignId: string, conditions: any[]): void {
  // Limit cache size to prevent memory issues
  if (conditionCache.size > 100) {
    // Remove oldest entry
    const firstKey = conditionCache.keys().next().value;
    if (firstKey) conditionCache.delete(firstKey);
  }
  conditionCache.set(campaignId, {
    data: conditions,
    expires: Date.now() + CACHE_TTL,
  });
}

// Reuse Supabase client across requests (reduces cold start)
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const supabase = getSupabaseClient();

    const { recipientId, campaignId, eventType, metadata = {} } = await req.json() as EvaluateConditionsRequest;

    console.log('Evaluating conditions:', { recipientId, campaignId, eventType });

    // PERFORMANCE: Try cache first for conditions
    let conditions = getCachedConditions(campaignId);
    
    if (!conditions) {
      // Cache miss - fetch from database
      const { data: fetchedConditions, error: conditionsError } = await supabase
        .from('campaign_conditions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sequence_order');

      if (conditionsError) {
        throw conditionsError;
      }

      conditions = fetchedConditions || [];
      
      // Store in cache for subsequent requests
      if (conditions.length > 0) {
        setCachedConditions(campaignId, conditions);
      }
    }

    if (conditions.length === 0) {
      const duration = performance.now() - startTime;
      console.log(`Condition evaluation completed in ${duration.toFixed(2)}ms (no conditions)`);
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

    const duration = performance.now() - startTime;
    console.log(`Condition evaluation completed in ${duration.toFixed(2)}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conditions evaluated successfully',
        performance: { durationMs: Math.round(duration) }
      }),
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

  // Get recipient details (including fields needed for SMS)
  const { data: recipient } = await supabase
    .from('recipients')
    .select('phone, first_name, last_name, email, client_id')
    .eq('id', recipientId)
    .single();

  if (!recipient?.phone) {
    throw new Error('Recipient has no phone number');
  }

  // ========================================
  // DUPLICATE PREVENTION: Check if recipient already has a card for this condition
  // ========================================
  const { data: hasCard } = await supabase
    .rpc('recipient_has_card_for_condition', {
      p_recipient_id: recipientId,
      p_condition_id: condition.id
    });

  if (hasCard) {
    // Already assigned - get existing card info and skip claiming
    const { data: existingCard } = await supabase
      .rpc('get_recipient_gift_card_for_condition', {
        p_recipient_id: recipientId,
        p_condition_id: condition.id
      });

    console.log('DUPLICATE PREVENTED: Recipient already has card for this condition', {
      recipientId,
      conditionId: condition.id,
      existingCardId: existingCard?.[0]?.gift_card_id,
    });

    // Update trigger to note duplicate was prevented
    await supabase
      .from('condition_triggers')
      .update({ 
        metadata_json: { 
          duplicate_prevented: true, 
          existing_card_id: existingCard?.[0]?.gift_card_id 
        } 
      })
      .eq('id', triggerId);

    return; // Exit without claiming new card
  }

  // ========================================
  // CLAIM WITH DUPLICATE CHECK: Use safe claiming function
  // ========================================
  const { data: giftCard, error: claimError } = await supabase
    .rpc('claim_card_with_duplicate_check', {
      p_pool_id: condition.gift_card_pool_id,
      p_recipient_id: recipientId,
      p_campaign_id: campaignId,
      p_condition_id: condition.id,
    });

  if (claimError) {
    console.error('Failed to claim gift card:', claimError);
    throw new Error(`Failed to claim gift card: ${claimError.message}`);
  }

  if (!giftCard || giftCard.length === 0) {
    throw new Error('No available gift cards');
  }

  const card = giftCard[0];

  // Check if this was a duplicate that was handled by the RPC
  if (card.already_assigned) {
    console.log('DUPLICATE HANDLED BY RPC: Returning existing card', card.card_id);
    
    await supabase
      .from('condition_triggers')
      .update({ 
        metadata_json: { 
          duplicate_prevented: true, 
          existing_card_id: card.card_id 
        } 
      })
      .eq('id', triggerId);
    
    return; // Exit - card was already delivered previously
  }

  // ========================================
  // NEW CARD CLAIMED: Create delivery record and send
  // ========================================
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

  // Update recipient_gift_cards with delivery info
  await supabase
    .from('recipient_gift_cards')
    .update({
      delivery_method: 'sms',
      delivery_address: recipient.phone,
    })
    .eq('recipient_id', recipientId)
    .eq('condition_id', condition.id);

  // Send SMS with all necessary data including conditionId for link URL resolution
  await supabase.functions.invoke('send-gift-card-sms', {
    body: { 
      deliveryId: delivery.id,
      giftCardCode: card.card_code,
      giftCardValue: card.card_value,
      recipientPhone: recipient.phone,
      recipientName: recipient.first_name,
      recipientId,
      giftCardId: card.card_id,
      clientId: recipient.client_id,
      conditionId: condition.id,
      brandName: card.brand_name,
    },
  });

  // Link delivery to trigger
  await supabase
    .from('condition_triggers')
    .update({ gift_card_delivery_id: delivery.id })
    .eq('id', triggerId);

  console.log('Gift card sent (NEW):', card.card_code);
}

async function sendSMS(supabase: any, recipientId: string, condition: any, triggerId: string) {
  const { data: recipient } = await supabase
    .from('recipients')
    .select('phone, first_name, campaign_id')
    .eq('id', recipientId)
    .single();

  if (!recipient?.phone) {
    throw new Error('Recipient has no phone number');
  }

  const message = condition.sms_template || 'Thank you for your response!';
  
  // Format phone number for Twilio (E.164 format)
  const formattedPhone = recipient.phone.startsWith('+') 
    ? recipient.phone 
    : `+1${recipient.phone.replace(/\D/g, '')}`;

  // Get Twilio credentials
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error('Twilio credentials not configured');
  }

  // Log SMS attempt to sms_delivery_log
  const { data: logEntry, error: logError } = await supabase
    .from('sms_delivery_log')
    .insert({
      recipient_id: recipientId,
      campaign_id: recipient.campaign_id,
      phone_number: formattedPhone,
      message_body: message,
      delivery_status: 'pending',
      retry_count: 0,
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to create SMS delivery log:', logError);
  }

  // Send SMS via Twilio API
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

  const twilioResponse = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: formattedPhone,
      From: twilioPhoneNumber,
      Body: message,
    }),
  });

  const twilioData = await twilioResponse.json();

  if (!twilioResponse.ok) {
    console.error('Twilio error:', twilioData);
    
    // Update SMS delivery log with failure
    if (logEntry) {
      await supabase
        .from('sms_delivery_log')
        .update({
          delivery_status: 'failed',
          error_message: twilioData.message || 'Unknown Twilio error',
          last_retry_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    throw new Error(`Twilio API error: ${twilioData.message}`);
  }

  console.log('SMS sent successfully:', twilioData.sid);

  // Update SMS delivery log with success
  if (logEntry) {
    await supabase
      .from('sms_delivery_log')
      .update({
        delivery_status: 'sent',
        twilio_message_sid: twilioData.sid,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', logEntry.id);
  }

  // Update trigger with SMS info
  await supabase
    .from('condition_triggers')
    .update({ 
      sms_message_sid: twilioData.sid,
      metadata_json: { sms_sent: true, phone: formattedPhone }
    })
    .eq('id', triggerId);
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
    .select('email, first_name, campaign_id')
    .eq('id', recipientId)
    .single();

  if (!recipient?.email) {
    throw new Error('Recipient has no email');
  }

  // If gift card is configured, send via gift card email function
  if (condition.gift_card_pool_id) {
    const { error } = await supabase.functions.invoke('send-gift-card-email', {
      body: {
        recipientId,
        recipientEmail: recipient.email,
        recipientName: recipient.first_name,
        giftCardPoolId: condition.gift_card_pool_id,
        campaignId: recipient.campaign_id,
      },
    });

    if (error) {
      throw error;
    }
  } else {
    // Generic email sending - can be expanded with custom templates
    console.log('Generic email would be sent to:', recipient.email);
  }
}