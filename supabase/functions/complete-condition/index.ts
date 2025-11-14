import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteConditionRequest {
  callSessionId: string;
  conditionNumber: 1 | 2 | 3;
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

    const { callSessionId, conditionNumber, notes }: CompleteConditionRequest = await req.json();

    console.log(`Completing condition ${conditionNumber} for call session:`, callSessionId);

    // Get call session details
    const { data: callSession, error: sessionError } = await supabaseClient
      .from('call_sessions')
      .select('*, campaigns(*, campaign_reward_configs(*, gift_card_pools(*)))')
      .eq('id', callSessionId)
      .single();

    if (sessionError || !callSession) {
      throw new Error('Call session not found');
    }

    if (!callSession.recipient_id) {
      throw new Error('Cannot complete condition for unmatched caller');
    }

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

    // Find the reward configuration for this condition
    const rewardConfig = callSession.campaigns.campaign_reward_configs?.find(
      (config: any) => config.condition_number === conditionNumber
    );

    if (!rewardConfig || !rewardConfig.gift_card_pool_id) {
      console.log('No reward configured for this condition');
      
      // Still record the condition as met, just no gift card
      const { error: insertError } = await supabaseClient
        .from('call_conditions_met')
        .insert({
          call_session_id: callSessionId,
          campaign_id: callSession.campaign_id,
          recipient_id: callSession.recipient_id,
          condition_number: conditionNumber,
          met_by_agent_id: user.id,
          notes,
        });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, message: 'Condition recorded (no reward configured)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for card claiming
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Claim a gift card using the database function
    const { data: claimedCards, error: claimError } = await serviceClient
      .rpc('claim_available_card', {
        p_pool_id: rewardConfig.gift_card_pool_id,
        p_recipient_id: callSession.recipient_id,
        p_call_session_id: callSessionId,
      });

    if (claimError || !claimedCards || claimedCards.length === 0) {
      console.error('Failed to claim gift card:', claimError);
      throw new Error('No gift cards available in pool');
    }

    const claimedCard = claimedCards[0];
    console.log('Gift card claimed:', claimedCard.card_id);

    // Get recipient details for SMS
    const { data: recipient } = await serviceClient
      .from('recipients')
      .select('first_name, last_name, phone')
      .eq('id', callSession.recipient_id)
      .single();

    if (!recipient?.phone) {
      throw new Error('Recipient phone number not found');
    }

    // Send SMS with gift card via Twilio
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    let deliveryStatus = 'pending';
    let twilioMessageSid = null;

    if (twilioSid && twilioToken && twilioPhone) {
      // Format SMS message
      let smsMessage = rewardConfig.sms_template || 
        `Hi ${recipient.first_name || 'there'}! Your $${claimedCard.card_value} ${claimedCard.provider} gift card: ${claimedCard.card_code}`;
      
      smsMessage = smsMessage
        .replace('{first_name}', recipient.first_name || '')
        .replace('{last_name}', recipient.last_name || '')
        .replace('{value}', claimedCard.card_value.toString())
        .replace('{code}', claimedCard.card_code);

      console.log('Sending SMS to:', recipient.phone);

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: recipient.phone,
            From: twilioPhone,
            Body: smsMessage,
          }).toString(),
        }
      );

      if (twilioResponse.ok) {
        const twilioData = await twilioResponse.json();
        twilioMessageSid = twilioData.sid;
        deliveryStatus = 'sent';
        console.log('SMS sent successfully:', twilioMessageSid);
      } else {
        const error = await twilioResponse.text();
        console.error('SMS send failed:', error);
        deliveryStatus = 'failed';
      }
    } else {
      console.warn('Twilio not configured, skipping SMS delivery');
      deliveryStatus = 'no_twilio';
    }

    // Update gift card status
    await serviceClient
      .from('gift_cards')
      .update({
        status: deliveryStatus === 'sent' ? 'delivered' : 'claimed',
        delivered_at: deliveryStatus === 'sent' ? new Date().toISOString() : null,
        delivery_method: 'sms',
        delivery_address: recipient.phone,
      })
      .eq('id', claimedCard.card_id);

    // Create gift card delivery record
    await serviceClient
      .from('gift_card_deliveries')
      .insert({
        gift_card_id: claimedCard.card_id,
        recipient_id: callSession.recipient_id,
        campaign_id: callSession.campaign_id,
        call_session_id: callSessionId,
        condition_number: conditionNumber,
        delivery_method: 'sms',
        delivery_address: recipient.phone,
        delivery_status: deliveryStatus,
        twilio_message_sid: twilioMessageSid,
      });

    // Record condition as met
    await serviceClient
      .from('call_conditions_met')
      .insert({
        call_session_id: callSessionId,
        campaign_id: callSession.campaign_id,
        recipient_id: callSession.recipient_id,
        condition_number: conditionNumber,
        met_by_agent_id: user.id,
        gift_card_id: claimedCard.card_id,
        delivery_status: deliveryStatus,
        notes,
      });

    console.log('Condition completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        giftCard: {
          value: claimedCard.card_value,
          provider: claimedCard.provider,
          deliveryStatus,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error completing condition:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
