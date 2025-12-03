import { createClient } from 'npm:@supabase/supabase-js@2';

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
  recipientId?: string;
  giftCardId?: string;
}

// Format phone for EZ Texting (10 digits, no country code)
function formatPhoneForEZTexting(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits.slice(-10);
}

// Format phone to E.164 for storage
function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
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
      recipientId,
      giftCardId,
    }: SendGiftCardSMSRequest = await req.json();

    console.log('Sending gift card SMS:', { deliveryId, recipientPhone, value: giftCardValue });

    // Format phone numbers
    const ezTextingPhone = formatPhoneForEZTexting(recipientPhone);
    const formattedPhone = formatPhoneE164(recipientPhone);

    // Build SMS message
    const defaultMessage = `Congratulations ${recipientName || ''}! You've earned a $${giftCardValue} gift card. Your code: ${giftCardCode}. Thank you for your business!`;
    const smsMessage = customMessage || defaultMessage;

    // Log SMS attempt to sms_delivery_log
    const { data: logEntry, error: logError } = await supabaseClient
      .from('sms_delivery_log')
      .insert({
        recipient_id: recipientId,
        gift_card_id: giftCardId,
        phone_number: formattedPhone,
        message_body: smsMessage,
        delivery_status: 'pending',
        retry_count: 0,
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create SMS delivery log:', logError);
    }

    // Update delivery record with SMS text
    await supabaseClient
      .from('gift_card_deliveries')
      .update({ sms_message: smsMessage })
      .eq('id', deliveryId);

    // Get EZ Texting credentials
    const ezTextingUsername = Deno.env.get('EZTEXTING_USERNAME');
    const ezTextingPassword = Deno.env.get('EZTEXTING_PASSWORD');

    if (!ezTextingUsername || !ezTextingPassword) {
      throw new Error('EZ Texting credentials not configured');
    }

    console.log(`Sending SMS to ${ezTextingPhone} via EZ Texting...`);

    // EZ Texting uses HTTP Basic Authentication
    const authHeader = btoa(`${ezTextingUsername}:${ezTextingPassword}`);

    // Send SMS via EZ Texting REST API
    const ezTextingResponse = await fetch('https://app.eztexting.com/sending/messages?format=json', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        User: ezTextingUsername,
        Password: ezTextingPassword,
        PhoneNumbers: ezTextingPhone,
        Message: smsMessage,
        MessageTypeID: '1',
      }),
    });

    let ezTextingData;
    const responseText = await ezTextingResponse.text();
    console.log(`EZ Texting response status: ${ezTextingResponse.status}`);
    console.log(`EZ Texting response body: ${responseText}`);
    
    try {
      ezTextingData = JSON.parse(responseText);
    } catch {
      ezTextingData = { raw: responseText };
    }

    if (!ezTextingResponse.ok) {
      console.error('EZ Texting error:', ezTextingData);
      
      // Update SMS delivery log with failure
      if (logEntry) {
        await supabaseClient
          .from('sms_delivery_log')
          .update({
            delivery_status: 'failed',
            error_message: ezTextingData.Error || ezTextingData.message || 'Unknown EZ Texting error',
            last_retry_at: new Date().toISOString(),
          })
          .eq('id', logEntry.id);
      }
      
      // Update delivery with error
      await supabaseClient
        .from('gift_card_deliveries')
        .update({
          sms_status: 'failed',
          sms_error_message: ezTextingData.Error || ezTextingData.message || 'Unknown EZ Texting error',
          retry_count: 1,
        })
        .eq('id', deliveryId);

      throw new Error(`EZ Texting API error: ${ezTextingData.Error || ezTextingData.message}`);
    }

    const messageId = ezTextingData.Response?.Entry?.ID || ezTextingData.ID || `ez_${Date.now()}`;
    console.log('SMS sent successfully via EZ Texting:', messageId);

    // Update SMS delivery log with success
    if (logEntry) {
      await supabaseClient
        .from('sms_delivery_log')
        .update({
          delivery_status: 'sent',
          twilio_message_sid: messageId, // Reusing this field for EZ Texting message ID
          delivered_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    // Update delivery record with success
    const { error: updateError } = await supabaseClient
      .from('gift_card_deliveries')
      .update({
        sms_status: 'sent',
        twilio_message_sid: messageId, // Reusing this field for EZ Texting message ID
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    if (updateError) {
      console.error('Failed to update delivery record:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        status: 'sent',
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
