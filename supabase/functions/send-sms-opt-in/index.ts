/**
 * Send SMS Opt-In Edge Function
 * 
 * Sends opt-in request SMS to recipients.
 * Uses shared sms-templates for resolution and sms-provider for delivery.
 * Broadcasts real-time updates to call center dashboard.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendSMS, formatPhoneE164 } from '../_shared/sms-provider.ts';
import { resolveTemplate, renderTemplate } from '../_shared/sms-templates.ts';
import { createErrorLogger } from '../_shared/error-logger.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// Phone validation regex
const PHONE_REGEX = /^\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

interface SendOptInRequest {
  recipient_id: string;
  campaign_id: string;
  call_session_id?: string;
  phone: string;
  client_name: string;
  custom_message?: string;
}

interface SendOptInResponse {
  success: boolean;
  message_id?: string;
  provider?: string;
  status?: string;
  sent_at?: string;
  fallback_used?: boolean;
  already_opted_in?: boolean;
  already_pending?: boolean;
  message?: string;
  twilio_level_used?: string | null;
  twilio_entity_name?: string | null;
  twilio_from_number?: string | null;
  twilio_fallback_occurred?: boolean;
}

async function handleSendOptIn(
  request: SendOptInRequest,
  _context: unknown,
  rawRequest: Request
): Promise<SendOptInResponse> {
  const supabase = createServiceClient();
  const errorLogger = createErrorLogger('send-sms-opt-in');
  const activityLogger = createActivityLogger('send-sms-opt-in', rawRequest);

  const { recipient_id, campaign_id, call_session_id, phone, client_name, custom_message } = request;

  // Validate required fields
  if (!recipient_id) throw new ApiError('recipient_id is required', 'VALIDATION_ERROR', 400);
  if (!campaign_id) throw new ApiError('campaign_id is required', 'VALIDATION_ERROR', 400);
  if (!phone) throw new ApiError('phone is required', 'VALIDATION_ERROR', 400);
  if (!client_name) throw new ApiError('client_name is required', 'VALIDATION_ERROR', 400);

  // Validate phone format
  if (!PHONE_REGEX.test(phone)) {
    throw new ApiError('Invalid phone number format', 'VALIDATION_ERROR', 400);
  }

  const formattedPhone = formatPhoneE164(phone);
  console.log(`[OPT-IN-SMS] Sending to ${formattedPhone} for recipient ${recipient_id}`);

  // Check existing status
  const { data: existingRecipient, error: checkError } = await supabase
    .from('recipients')
    .select('sms_opt_in_status, sms_opt_in_sent_at')
    .eq('id', recipient_id)
    .single();

  if (checkError) {
    throw new ApiError('Failed to verify recipient status', 'DATABASE_ERROR', 500);
  }

  // Already opted in
  if (existingRecipient?.sms_opt_in_status === 'opted_in') {
    return {
      success: true,
      already_opted_in: true,
      message: 'Recipient has already opted in',
    };
  }

  // Recently sent (within 5 minutes)
  if (existingRecipient?.sms_opt_in_status === 'pending' && existingRecipient?.sms_opt_in_sent_at) {
    const sentAt = new Date(existingRecipient.sms_opt_in_sent_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (sentAt > fiveMinutesAgo) {
      return {
        success: true,
        already_pending: true,
        message: 'Opt-in SMS was recently sent. Waiting for response.',
      };
    }
  }

  // Get campaign's client ID for template resolution and Twilio hierarchy
  const { data: campaignData } = await supabase
    .from('campaigns')
    .select('client_id')
    .eq('id', campaign_id)
    .single();

  const clientId = campaignData?.client_id || undefined;

  // Resolve opt-in template
  const { template, source: templateSource } = await resolveTemplate(supabase, {
    templateType: 'opt_in_request',
    campaignId: campaign_id,
    clientId: clientId || '',
    customMessage: custom_message,
  });

  // Render template
  const optInMessage = renderTemplate(template, {
    client_name,
    company: client_name,
  });

  console.log(`[OPT-IN-SMS] Template source: ${templateSource}`);

  // Send SMS
  const smsResult = await sendSMS(formattedPhone, optInMessage, supabase, clientId);

  if (!smsResult.success) {
    console.error(`[OPT-IN-SMS] Failed: ${smsResult.error}`);
    throw new ApiError(smsResult.error || 'Failed to send SMS', 'SMS_ERROR', 500);
  }

  const messageId = smsResult.messageId || `sms_${Date.now()}`;
  const now = new Date().toISOString();

  console.log(`[OPT-IN-SMS] Success via ${smsResult.provider}: ${messageId}`);

  // Update recipient status
  await supabase
    .from('recipients')
    .update({
      sms_opt_in_status: 'pending',
      sms_opt_in_sent_at: now,
      phone: formattedPhone,
    })
    .eq('id', recipient_id);

  // Log the SMS
  await supabase.from('sms_opt_in_log').insert({
    recipient_id,
    campaign_id,
    call_session_id: call_session_id || null,
    phone: formattedPhone,
    message_sid: messageId,
    direction: 'outbound',
    message_text: optInMessage,
    status: 'sent',
    provider_used: smsResult.provider,
  });

  // Broadcast real-time update
  if (call_session_id) {
    try {
      const channel = supabase.channel(`opt_in_status:${call_session_id}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'status_update',
        payload: {
          recipient_id,
          status: 'pending',
          sent_at: now,
        },
      });
      await supabase.removeChannel(channel);
    } catch (broadcastError) {
      console.error('[OPT-IN-SMS] Broadcast error:', broadcastError);
    }
  }

  // Log activity
  await activityLogger.communication('sms_outbound', 'success',
    `Opt-in SMS sent to ${formattedPhone} via ${smsResult.provider}`,
    {
      recipientId: recipient_id,
      campaignId: campaign_id,
      clientId,
      direction: 'outbound',
      toNumber: formattedPhone,
      metadata: {
        message_id: messageId,
        provider: smsResult.provider,
        call_session_id,
        purpose: 'opt_in_request',
      },
    }
  );

  return {
    success: true,
    message_id: messageId,
    provider: smsResult.provider,
    status: smsResult.status || 'pending',
    sent_at: now,
    fallback_used: smsResult.fallbackUsed || false,
    twilio_level_used: smsResult.twilioLevelUsed || null,
    twilio_entity_name: smsResult.twilioEntityName || null,
    twilio_from_number: smsResult.twilioFromNumber || null,
    twilio_fallback_occurred: smsResult.twilioFallbackOccurred || false,
  };
}

Deno.serve(withApiGateway(handleSendOptIn, {
  requireAuth: false,
  parseBody: true,
}));
