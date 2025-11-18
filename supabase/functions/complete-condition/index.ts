import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteConditionRequest {
  callSessionId: string;
  campaignId: string;
  recipientId: string;
  conditionNumber: number;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { callSessionId, campaignId, recipientId, conditionNumber, notes }: CompleteConditionRequest = await req.json();

    console.log(`Completing condition ${conditionNumber} for call session:`, callSessionId);

    // Check if condition already completed
    const { data: existingCondition } = await supabaseClient
      .from('call_conditions_met')
      .select('id')
      .eq('call_session_id', callSessionId)
      .eq('condition_number', conditionNumber)
      .single();

    if (existingCondition) {
      return new Response(
        JSON.stringify({ error: 'Condition already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the condition configuration
    const { data: condition, error: conditionError } = await supabaseClient
      .from('campaign_conditions')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('condition_number', conditionNumber)
      .single();

    if (conditionError || !condition) {
      throw new Error('Condition not found');
    }

    let giftCardData = null;

    // If condition has a gift card pool, claim a card (with API fallback)
    if (condition.gift_card_pool_id) {
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Use new claim-and-provision function that handles fallback
      const { data: claimResult, error: claimError } = await serviceClient.functions.invoke(
        'claim-and-provision-card',
        {
          body: {
            poolId: condition.gift_card_pool_id,
            recipientId: recipientId,
            callSessionId: callSessionId,
          }
        }
      );

      if (claimError || !claimResult?.success) {
        console.error('Failed to claim gift card:', claimError);
        throw new Error('No gift cards available');
      }

      const claimedCard = claimResult.card;
      giftCardData = {
        id: claimedCard.card_id,
        code: claimedCard.card_code,
        value: claimedCard.card_value,
        provider: claimedCard.provider,
        deliveryStatus: 'pending'
      };

      // Create gift card delivery record
      const { data: recipient } = await supabaseClient
        .from('recipients')
        .select('phone')
        .eq('id', recipientId)
        .single();

      if (recipient?.phone) {
        const { error: deliveryError } = await serviceClient
          .from('gift_card_deliveries')
          .insert({
            gift_card_id: claimedCard.card_id,
            recipient_id: recipientId,
            campaign_id: campaignId,
            call_session_id: callSessionId,
            condition_number: conditionNumber,
            delivery_method: 'sms',
            delivery_address: recipient.phone,
            sms_message: condition.sms_template || `Congratulations! You've earned a $${claimedCard.card_value} ${claimedCard.provider} gift card. Code: ${claimedCard.card_code}`,
            delivery_status: 'pending',
          });

        if (deliveryError) {
          console.error('Failed to create delivery record:', deliveryError);
        } else {
          // Invoke SMS sending function
          const { error: smsError } = await serviceClient.functions.invoke('send-gift-card-sms', {
            body: {
              recipientPhone: recipient.phone,
              giftCardCode: claimedCard.card_code,
              giftCardValue: claimedCard.card_value,
              provider: claimedCard.provider,
              customMessage: condition.sms_template,
            }
          });

          if (smsError) {
            console.error('Failed to send SMS:', smsError);
          } else {
            giftCardData.deliveryStatus = 'sent';
          }
        }
      }
    }

    // Record the condition as met
    const { error: insertError } = await supabaseClient
      .from('call_conditions_met')
      .insert({
        call_session_id: callSessionId,
        campaign_id: campaignId,
        recipient_id: recipientId,
        condition_number: conditionNumber,
        met_by_agent_id: user.id,
        notes,
        gift_card_id: giftCardData?.id || null,
        delivery_status: giftCardData?.deliveryStatus || null,
      });

    if (insertError) throw insertError;

    // Log event
    await supabaseClient
      .from('events')
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: 'condition_completed',
        source: 'agent_manual',
        event_data_json: {
          condition_number: conditionNumber,
          call_session_id: callSessionId,
          agent_id: user.id,
          notes,
        },
      });

    console.log(`Condition ${conditionNumber} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        giftCard: giftCardData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error completing condition:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
