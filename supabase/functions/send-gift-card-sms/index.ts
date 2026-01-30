import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { sendSMS, formatPhoneE164 } from '../_shared/sms-provider.ts';
import { createErrorLogger } from '../_shared/error-logger.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System default template - used when no client/condition template is set
const SYSTEM_DEFAULT_TEMPLATE = "Congratulations {first_name}! You've earned a ${value} {brand} gift card. Your code: {code}. Thank you for your business!";

interface SendGiftCardSMSRequest {
  deliveryId: string;
  giftCardCode: string;
  giftCardValue: number;
  recipientPhone: string;
  recipientName?: string;
  customMessage?: string;      // Condition-level override (highest priority)
  recipientId?: string;
  giftCardId?: string;
  clientId?: string;           // For hierarchical Twilio resolution
  conditionId?: string;        // For template resolution
  brandName?: string;          // Brand name for template
}

/**
 * Resolve SMS template using hierarchy:
 * 1. customMessage (condition-level override) - highest priority
 * 2. Client default template (from message_templates table)
 * 3. System default template - lowest priority
 */
async function resolveTemplate(
  supabase: SupabaseClient,
  customMessage: string | undefined,
  clientId: string | undefined
): Promise<{ template: string; source: 'condition' | 'client' | 'system' }> {
  // 1. Condition-level override (passed as customMessage)
  if (customMessage && customMessage.trim()) {
    console.log('[SEND-GIFT-CARD-SMS] Using condition-level SMS template');
    return { template: customMessage, source: 'condition' };
  }

  // 2. Client default template
  if (clientId) {
    const { data: clientTemplate, error } = await supabase
      .from('message_templates')
      .select('body_template')
      .eq('client_id', clientId)
      .eq('template_type', 'sms')
      .eq('name', 'gift_card_delivery')
      .eq('is_default', true)
      .single();

    if (!error && clientTemplate?.body_template) {
      console.log('[SEND-GIFT-CARD-SMS] Using client default SMS template');
      return { template: clientTemplate.body_template, source: 'client' };
    }
  }

  // 3. System default
  console.log('[SEND-GIFT-CARD-SMS] Using system default SMS template');
  return { template: SYSTEM_DEFAULT_TEMPLATE, source: 'system' };
}

/**
 * Replace template variables with actual values
 */
function renderTemplate(
  template: string,
  variables: {
    first_name?: string;
    last_name?: string;
    value?: number;
    brand?: string;
    code?: string;
    link?: string;
    company?: string;
  }
): string {
  let result = template;
  
  // Replace variables (case-insensitive)
  const replacements: [RegExp, string][] = [
    [/\{first_name\}/gi, variables.first_name || ''],
    [/\{last_name\}/gi, variables.last_name || ''],
    [/\{value\}/gi, variables.value?.toString() || ''],
    [/\$\{value\}/gi, `$${variables.value || ''}`],
    [/\{brand\}/gi, variables.brand || ''],
    [/\{provider\}/gi, variables.brand || ''], // Alias
    [/\{code\}/gi, variables.code || ''],
    [/\{link\}/gi, variables.link || variables.code || ''],
    [/\{company\}/gi, variables.company || ''],
    [/\{client_name\}/gi, variables.company || ''],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Clean up any remaining empty placeholders
  result = result.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize error logger
  const errorLogger = createErrorLogger('send-gift-card-sms');
  
  // Initialize activity logger
  const activityLogger = createActivityLogger('send-gift-card-sms', req);

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

    // Resolve clientId for hierarchical Twilio resolution
    let resolvedClientId = requestData.clientId;
    if (!resolvedClientId && recipientId) {
      // Try to fetch client_id from recipient -> campaign
      const { data: recipientData } = await supabaseClient
        .from('recipients')
        .select('campaign:campaigns(client_id)')
        .eq('id', recipientId)
        .single();
      resolvedClientId = (recipientData?.campaign as any)?.client_id || undefined;
      console.log(`[SEND-GIFT-CARD-SMS] Resolved client ID from recipient: ${resolvedClientId || 'none'}`);
    }
    console.log(`[SEND-GIFT-CARD-SMS] Client ID for Twilio hierarchy: ${resolvedClientId || 'none (will use fallback)'}`);

    // Format phone number
    const formattedPhone = formatPhoneE164(recipientPhone);

    // Resolve template using hierarchy (condition -> client -> system)
    const { template, source: templateSource } = await resolveTemplate(
      supabaseClient,
      customMessage,
      resolvedClientId
    );

    // Get company name for template
    let companyName = '';
    if (resolvedClientId) {
      const { data: clientData } = await supabaseClient
        .from('clients')
        .select('name')
        .eq('id', resolvedClientId)
        .single();
      companyName = clientData?.name || '';
    }

    // Render template with actual values
    const smsMessage = renderTemplate(template, {
      first_name: recipientName?.split(' ')[0],
      last_name: recipientName?.split(' ').slice(1).join(' '),
      value: giftCardValue,
      brand: requestData.brandName,
      code: giftCardCode,
      link: giftCardCode, // Default to code, can be overridden
      company: companyName,
    });

    console.log(`[SEND-GIFT-CARD-SMS] Template source: ${templateSource}, message length: ${smsMessage.length}`);

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
    // Pass resolvedClientId for hierarchical Twilio resolution (Client -> Agency -> Admin)
    console.log(`[SEND-GIFT-CARD-SMS] Sending SMS to ${formattedPhone}...`);
    const smsResult = await sendSMS(formattedPhone, smsMessage, supabaseClient, resolvedClientId);

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

      // Log failed SMS activity
      await activityLogger.giftCard('sms_failed', 'failed',
        `Gift card SMS delivery failed to ${formattedPhone}`,
        {
          recipientId,
          clientId: resolvedClientId,
          metadata: {
            delivery_id: deliveryId,
            provider: smsResult.provider,
            error: smsResult.error,
          },
        }
      );
      
      throw new Error(`SMS send failed: ${smsResult.error}`);
    }

    const messageId = smsResult.messageId || `sms_${Date.now()}`;
    console.log(`[SEND-GIFT-CARD-SMS] SMS sent successfully via ${smsResult.provider}, ID: ${messageId}`);
    
    if (smsResult.fallbackUsed) {
      console.log('[SEND-GIFT-CARD-SMS] Note: Fallback provider was used');
    }
    
    // Log Twilio hierarchy info if available
    if (smsResult.twilioLevelUsed) {
      console.log(`[SEND-GIFT-CARD-SMS] Twilio level used: ${smsResult.twilioLevelUsed} (${smsResult.twilioEntityName || 'N/A'})`);
      if (smsResult.twilioFallbackOccurred) {
        console.log(`[SEND-GIFT-CARD-SMS] Twilio fallback reason: ${smsResult.twilioFallbackReason}`);
      }
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

    // Log successful SMS activity
    await activityLogger.giftCard('sms_sent', 'success',
      `Gift card SMS sent successfully to ${formattedPhone} via ${smsResult.provider}`,
      {
        recipientId,
        clientId: resolvedClientId,
        metadata: {
          delivery_id: deliveryId,
          message_id: messageId,
          provider: smsResult.provider,
          card_value: giftCardValue,
          fallback_used: smsResult.fallbackUsed || false,
        },
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        provider: smsResult.provider,
        status: smsResult.status || 'sent',
        fallbackUsed: smsResult.fallbackUsed || false,
        // Template resolution info
        templateSource: templateSource,
        // Twilio hierarchy info
        twilioLevelUsed: smsResult.twilioLevelUsed || null,
        twilioEntityName: smsResult.twilioEntityName || null,
        twilioFromNumber: smsResult.twilioFromNumber || null,
        twilioFallbackOccurred: smsResult.twilioFallbackOccurred || false,
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
