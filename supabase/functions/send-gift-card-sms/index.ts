/**
 * Send Gift Card SMS Edge Function
 * 
 * Sends gift card delivery SMS with template resolution and variable rendering.
 * Uses shared sms-templates for resolution and sms-provider for delivery.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendSMS, formatPhoneE164 } from '../_shared/sms-provider.ts';
import { 
  resolveTemplate, 
  renderTemplate, 
  fetchRecipientForTemplate, 
  fetchClientName,
  resolveLinkUrl,
} from '../_shared/sms-templates.ts';
import type { TemplateVariables } from '../_shared/sms-templates.ts';
import { createErrorLogger } from '../_shared/error-logger.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface SendGiftCardSMSRequest {
  deliveryId: string;
  giftCardCode: string;
  giftCardValue: number;
  recipientPhone: string;
  recipientName?: string;
  customMessage?: string;
  recipientId?: string;
  giftCardId?: string;
  clientId?: string;
  conditionId?: string;
  brandName?: string;
}

interface SendGiftCardSMSResponse {
  success: boolean;
  messageId?: string;
  provider?: string;
  status?: string;
  fallbackUsed?: boolean;
  templateSource?: string;
  twilioLevelUsed?: string | null;
  twilioEntityName?: string | null;
  twilioFromNumber?: string | null;
  twilioFallbackOccurred?: boolean;
  error?: string;
}

async function handleSendGiftCardSMS(
  request: SendGiftCardSMSRequest,
  _context: unknown,
  rawRequest: Request
): Promise<SendGiftCardSMSResponse> {
  const supabase = createServiceClient();
  const errorLogger = createErrorLogger('send-gift-card-sms');
  const activityLogger = createActivityLogger('send-gift-card-sms', rawRequest);

  const {
    deliveryId,
    giftCardCode,
    giftCardValue,
    recipientPhone,
    recipientName,
    customMessage,
    recipientId,
    giftCardId,
    conditionId,
    brandName,
  } = request;

  console.log(`[GIFT-CARD-SMS] [${errorLogger.requestId}] Sending to ${recipientPhone}, value: $${giftCardValue}`);

  // Fetch recipient data and resolve client ID
  let recipientData: Partial<TemplateVariables> | null = null;
  let resolvedClientId = request.clientId;

  if (recipientId) {
    const fetchResult = await fetchRecipientForTemplate(supabase, recipientId);
    recipientData = fetchResult.recipient;
    
    if (!resolvedClientId && fetchResult.clientId) {
      resolvedClientId = fetchResult.clientId;
      console.log(`[GIFT-CARD-SMS] Resolved client ID from recipient: ${resolvedClientId}`);
    }
  }

  // Format phone number
  const formattedPhone = formatPhoneE164(recipientPhone);

  // Resolve template using hierarchy
  const { template, source: templateSource } = await resolveTemplate(supabase, {
    templateType: 'gift_card_delivery',
    conditionId,
    clientId: resolvedClientId || '',
    customMessage,
  });

  // Fetch client name
  const clientName = resolvedClientId ? await fetchClientName(supabase, resolvedClientId) : '';

  // Resolve configured link URL (two-stage rendering)
  // The link URL can contain variables like {code}, {email} that need to be rendered
  const configuredLinkUrl = await resolveLinkUrl(supabase, {
    conditionId,
    clientId: resolvedClientId || '',
  });

  // Base variables for rendering (used for both link URL and main template)
  const baseVariables: TemplateVariables = {
    first_name: recipientData?.first_name || recipientName?.split(' ')[0] || '',
    last_name: recipientData?.last_name || recipientName?.split(' ').slice(1).join(' ') || '',
    email: recipientData?.email || '',
    phone: recipientData?.phone || recipientPhone || '',
    recipient_company: recipientData?.recipient_company || '',
    address1: recipientData?.address1 || '',
    address2: recipientData?.address2 || '',
    city: recipientData?.city || '',
    state: recipientData?.state || '',
    zip: recipientData?.zip || '',
    value: giftCardValue,
    brand: brandName || '',
    code: giftCardCode,
    client_name: clientName,
    custom: recipientData?.custom || {},
  };

  // Stage 1: Render the link URL (if configured)
  // This replaces {code}, {email}, etc. in the link URL with actual values
  let renderedLink = giftCardCode; // Default fallback
  if (configuredLinkUrl) {
    renderedLink = renderTemplate(configuredLinkUrl, baseVariables);
    console.log(`[GIFT-CARD-SMS] Rendered link URL: ${renderedLink.substring(0, 100)}...`);
  }

  // Stage 2: Build final template variables with rendered link
  const templateVariables: TemplateVariables = {
    ...baseVariables,
    link: renderedLink,
  };

  // Render main template
  const smsMessage = renderTemplate(template, templateVariables);
  console.log(`[GIFT-CARD-SMS] Template source: ${templateSource}, length: ${smsMessage.length}`);

  // Log SMS attempt
  const { data: logEntry } = await supabase
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

  // Update delivery record
  await supabase
    .from('gift_card_deliveries')
    .update({ sms_message: smsMessage })
    .eq('id', deliveryId);

  // Send SMS
  const smsResult = await sendSMS(formattedPhone, smsMessage, supabase, resolvedClientId);

  if (!smsResult.success) {
    console.error(`[GIFT-CARD-SMS] Failed: ${smsResult.error}`);
    
    // Update logs with failure
    if (logEntry) {
      await supabase
        .from('sms_delivery_log')
        .update({
          delivery_status: 'failed',
          error_message: smsResult.error || 'Unknown error',
          provider_used: smsResult.provider,
          last_retry_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    await supabase
      .from('gift_card_deliveries')
      .update({
        sms_status: 'failed',
        sms_error_message: smsResult.error || 'Unknown error',
        retry_count: 1,
      })
      .eq('id', deliveryId);

    await activityLogger.giftCard('sms_failed', 'failed',
      `Gift card SMS failed to ${formattedPhone}`,
      {
        recipientId,
        clientId: resolvedClientId,
        metadata: { delivery_id: deliveryId, provider: smsResult.provider, error: smsResult.error },
      }
    );

    throw new ApiError(smsResult.error || 'SMS send failed', 'SMS_ERROR', 500);
  }

  const messageId = smsResult.messageId || `sms_${Date.now()}`;
  console.log(`[GIFT-CARD-SMS] Success via ${smsResult.provider}: ${messageId}`);

  // Update logs with success
  if (logEntry) {
    await supabase
      .from('sms_delivery_log')
      .update({
        delivery_status: 'sent',
        twilio_message_sid: messageId,
        provider_used: smsResult.provider,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', logEntry.id);
  }

  await supabase
    .from('gift_card_deliveries')
    .update({
      sms_status: 'sent',
      twilio_message_sid: messageId,
      sms_sent_at: new Date().toISOString(),
    })
    .eq('id', deliveryId);

  await activityLogger.giftCard('sms_sent', 'success',
    `Gift card SMS sent to ${formattedPhone} via ${smsResult.provider}`,
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

  return {
    success: true,
    messageId,
    provider: smsResult.provider,
    status: smsResult.status || 'sent',
    fallbackUsed: smsResult.fallbackUsed || false,
    templateSource,
    twilioLevelUsed: smsResult.twilioLevelUsed || null,
    twilioEntityName: smsResult.twilioEntityName || null,
    twilioFromNumber: smsResult.twilioFromNumber || null,
    twilioFallbackOccurred: smsResult.twilioFallbackOccurred || false,
  };
}

Deno.serve(withApiGateway(handleSendGiftCardSMS, {
  requireAuth: false,
  parseBody: true,
}));
