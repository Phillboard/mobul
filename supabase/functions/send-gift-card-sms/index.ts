import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendGiftCardSMSRequest {
  deliveryId: string;
  giftCardCode: string;
  giftCardValue: number;
  recipientPhone: string;
  recipientName?: string;
  customMessage?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      deliveryId,
      giftCardCode,
      giftCardValue,
      recipientPhone,
      recipientName,
      customMessage,
    }: SendGiftCardSMSRequest = await req.json();

    console.log('Sending gift card SMS:', { deliveryId, recipientPhone, value: giftCardValue });

    // Format phone number for Twilio (E.164 format)
    const formattedPhone = recipientPhone.startsWith('+') 
      ? recipientPhone 
      : `+1${recipientPhone.replace(/\D/g, '')}`;

    // Build SMS message
    const defaultMessage = `Congratulations ${recipientName || ''}! You've earned a $${giftCardValue} gift card. Your code: ${giftCardCode}. Thank you for your business!`;
    const smsMessage = customMessage || defaultMessage;

    // Update delivery record with SMS text
    await supabaseClient
      .from('gift_card_deliveries')
      .update({ sms_message: smsMessage })
      .eq('id', deliveryId);

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

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
        Body: smsMessage,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      
      // Update delivery with error
      await supabaseClient
        .from('gift_card_deliveries')
        .update({
          sms_status: 'failed',
          sms_error_message: twilioData.message || 'Unknown Twilio error',
          retry_count: 1,
        })
        .eq('id', deliveryId);

      throw new Error(`Twilio API error: ${twilioData.message}`);
    }

    console.log('SMS sent successfully:', twilioData.sid);

    // Update delivery record with success
    const { error: updateError } = await supabaseClient
      .from('gift_card_deliveries')
      .update({
        sms_status: 'sent',
        twilio_message_sid: twilioData.sid,
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    if (updateError) {
      console.error('Failed to update delivery record:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending gift card SMS:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
