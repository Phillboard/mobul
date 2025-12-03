import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendSMS, formatPhoneE164 } from '../_shared/sms-provider.ts';
import { createErrorLogger } from '../_shared/error-logger.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize error logger
  const errorLogger = createErrorLogger('send-gift-card-sms');

  // Declare variables at function scope for error logging
  let recipientId: string | undefined;
  let giftCardId: string | undefined;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: SendGiftCardSMSRequest = await req.json();
    const deliveryId = requestData.deliveryId;
    const giftCardCode = requestData.giftCardCode;
    const giftCardValue = requestData.giftCardValue;
    const recipientPhone = requestData.recipientPhone;
    const recipientName = requestData.recipientName;
    const customMessage = requestData.customMessage;
    recipientId = requestData.recipientId;
    giftCardId = requestData.giftCardId;

    console.log(`[SEND-GIFT-CARD-SMS] [${errorLogger.requestId}] Sending gift card SMS:`, { deliveryId, recipientPhone, value: giftCardValue });

    // Format phone number
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
      console.error('[SEND-GIFT-CARD-SMS] Failed to create SMS delivery log:', logError);
    }

    // Update delivery record with SMS text
    await supabaseClient
      .from('gift_card_deliveries')
      .update({ sms_message: smsMessage })
      .eq('id', deliveryId);

    // Send SMS using provider abstraction (handles Infobip/Twilio selection and fallback)
    console.log(`[SEND-GIFT-CARD-SMS] Sending SMS to ${formattedPhone}...`);
    const smsResult = await sendSMS(formattedPhone, smsMessage, supabaseClient);

    if (!smsResult.success) {
      console.error('[SEND-GIFT-CARD-SMS] SMS send failed:', smsResult.error);
      
      // Update SMS delivery log with failure
      if (logEntry) {
        await supabaseClient
          .from('sms_delivery_log')
          .update({
            delivery_status: 'failed',
            error_message: smsResult.error || 'Unknown SMS error',
            provider_used: smsResult.provider,
            last_retry_at: new Date().toISOString(),
          })
          .eq('id', logEntry.id);
      }
      
      // Update delivery with error
      await supabaseClient
        .from('gift_card_deliveries')
        .update({
          sms_status: 'failed',
          sms_error_message: smsResult.error || 'Unknown SMS error',
          retry_count: 1,
        })
        .eq('id', deliveryId);

      throw new Error(`SMS send failed: ${smsResult.error}`);
    }

    const messageId = smsResult.messageId || `sms_${Date.now()}`;
    console.log(`[SEND-GIFT-CARD-SMS] SMS sent successfully via ${smsResult.provider}, ID: ${messageId}`);
    
    if (smsResult.fallbackUsed) {
      console.log('[SEND-GIFT-CARD-SMS] Note: Fallback provider was used');
    }

    // Update SMS delivery log with success
    if (logEntry) {
      await supabaseClient
        .from('sms_delivery_log')
        .update({
          delivery_status: 'sent',
          twilio_message_sid: messageId, // Keep field name for compatibility
          provider_used: smsResult.provider,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    // Update delivery record with success
    const { error: updateError } = await supabaseClient
      .from('gift_card_deliveries')
      .update({
        sms_status: 'sent',
        twilio_message_sid: messageId, // Keep field name for compatibility
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    if (updateError) {
      console.error('[SEND-GIFT-CARD-SMS] Failed to update delivery record:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        provider: smsResult.provider,
        status: smsResult.status || 'sent',
        fallbackUsed: smsResult.fallbackUsed || false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`[SEND-GIFT-CARD-SMS] [${errorLogger.requestId}] Error:`, error);
    
    // Log error to database
    await errorLogger.logError(error, {
      recipientId,
      metadata: {
        giftCardId,
        errorMessage: error.message,
      },
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
