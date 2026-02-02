/**
 * Send Marketing SMS Edge Function
 * 
 * Sends individual marketing SMS messages with merge tag support.
 * Uses shared sms-provider for delivery.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendSMS, formatPhoneE164 } from '../_shared/sms-provider.ts';
import { renderMergeTags } from '../_shared/sms-templates.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface MarketingSMSRequest {
  campaignId: string;
  messageId: string;
  contactId?: string;
  phone: string;
  body: string;
  mergeData?: Record<string, unknown>;
  clientId?: string;
}

interface MarketingSMSResponse {
  success: boolean;
  sendId?: string;
  messageId?: string;
  provider?: string;
  error?: string;
}

async function handleSendMarketingSMS(
  request: MarketingSMSRequest,
  _context: unknown,
  rawRequest: Request
): Promise<MarketingSMSResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('send-marketing-sms', rawRequest);

  const { campaignId, messageId, contactId, phone, body, mergeData = {}, clientId } = request;

  // Validate required fields
  if (!campaignId || !messageId || !phone || !body) {
    throw new ApiError(
      'Missing required fields: campaignId, messageId, phone, body',
      'VALIDATION_ERROR',
      400
    );
  }

  // Format phone and render merge tags
  const formattedPhone = formatPhoneE164(phone);
  const renderedBody = renderMergeTags(body, mergeData);

  // Get client ID from campaign if not provided
  let resolvedClientId = clientId;
  if (!resolvedClientId) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('client_id')
      .eq('id', campaignId)
      .single();
    resolvedClientId = campaign?.client_id;
  }

  // Create send record
  const { data: sendRecord, error: insertError } = await supabase
    .from('marketing_sends')
    .insert({
      campaign_id: campaignId,
      message_id: messageId,
      contact_id: contactId,
      message_type: 'sms',
      recipient_phone: phone,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    throw new ApiError(
      `Failed to create send record: ${insertError.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  // Send SMS using shared provider (correct signature)
  const result = await sendSMS(formattedPhone, renderedBody, supabase, resolvedClientId);

  // Update send record
  const updateData: Record<string, unknown> = {
    sent_at: new Date().toISOString(),
    provider_message_id: result.messageId,
    status: result.success ? 'sent' : 'failed',
  };

  if (!result.success) {
    updateData.error_message = result.error;
  }

  await supabase
    .from('marketing_sends')
    .update(updateData)
    .eq('id', sendRecord.id);

  console.log(`[MARKETING-SMS] ${phone}: ${result.success ? 'sent' : 'failed'}`);

  // Log activity
  await activityLogger.communication(
    result.success ? 'sms_outbound' : 'sms_status_updated',
    result.success ? 'success' : 'failed',
    result.success 
      ? `Marketing SMS sent to ${phone}` 
      : `Marketing SMS failed to ${phone}: ${result.error}`,
    {
      campaignId,
      recipientId: contactId,
      clientId: resolvedClientId,
      metadata: {
        send_id: sendRecord.id,
        message_id: result.messageId,
        phone,
        provider: result.provider,
        error: result.error,
      },
    }
  );

  if (!result.success) {
    throw new ApiError(result.error || 'SMS send failed', 'SMS_ERROR', 500);
  }

  return {
    success: true,
    sendId: sendRecord.id,
    messageId: result.messageId,
    provider: result.provider,
  };
}

Deno.serve(withApiGateway(handleSendMarketingSMS, {
  requireAuth: false,
  parseBody: true,
}));
