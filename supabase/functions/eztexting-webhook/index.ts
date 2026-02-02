/**
 * EZ Texting Webhook Edge Function
 * 
 * Handles incoming SMS from EZ Texting.
 * Processes opt-in/opt-out responses and broadcasts real-time updates.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import {
  parseWebhookPayload,
  extractWebhookField,
  createWebhookResponse,
  normalizePhoneNumber,
  isValidPhoneNumber,
  determineSmsResponseStatus,
  getOptInReplyMessage,
} from '../_shared/webhook-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface EZTextingWebhookResponse {
  recipient_id?: string;
  status: 'opted_in' | 'opted_out' | 'invalid_response';
  reply: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleEZTextingWebhook(
  _request: unknown,
  _context: PublicContext,
  rawRequest: Request
): Promise<Response> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('eztexting-webhook', rawRequest);

  console.log(`[EZTEXTING-WEBHOOK] Received ${rawRequest.method} request`);

  // Parse webhook payload (handles multiple formats)
  const webhookPayload = await parseWebhookPayload(rawRequest);
  const payload = webhookPayload.parsed as Record<string, unknown> || {};

  // Also check URL params (EZ Texting sometimes sends via query string)
  const url = new URL(rawRequest.url);

  // Extract phone number from various possible fields
  let phoneNumber = extractWebhookField<string>(payload, [
    'PhoneNumber', 'phonenumber', 'From', 'from'
  ]) || url.searchParams.get('PhoneNumber') || '';

  // Extract message from various possible fields
  let message = extractWebhookField<string>(payload, [
    'Message', 'message', 'Body', 'body'
  ]) || url.searchParams.get('Message') || '';

  // Extract message ID
  const messageId = extractWebhookField<string>(payload, [
    'MessageID', 'InboundID', 'messageId'
  ]) || url.searchParams.get('MessageID') || url.searchParams.get('InboundID') || '';

  message = message.trim();
  console.log(`[EZTEXTING-WEBHOOK] Received from ${phoneNumber}: "${message}" (ID: ${messageId})`);

  if (!phoneNumber || !message) {
    console.log('[EZTEXTING-WEBHOOK] Missing phone number or message');
    throw new ApiError('Missing phone number or message', 'VALIDATION_ERROR', 400);
  }

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!isValidPhoneNumber(phoneNumber)) {
    console.log('[EZTEXTING-WEBHOOK] Invalid phone number:', phoneNumber);
    return createWebhookResponse({ success: true, message: 'Invalid phone number format' });
  }

  // Find recipient with pending opt-in status
  const { data: recipients, error: lookupError } = await supabase
    .from('recipients')
    .select('id, campaign_id, sms_opt_in_status')
    .eq('sms_opt_in_status', 'pending')
    .or(`phone.ilike.%${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}`)
    .order('sms_opt_in_sent_at', { ascending: false })
    .limit(5);

  if (lookupError) {
    console.error('[EZTEXTING-WEBHOOK] Lookup error:', lookupError);
    throw new ApiError('Database error', 'DATABASE_ERROR', 500);
  }

  if (!recipients || recipients.length === 0) {
    console.log('[EZTEXTING-WEBHOOK] No pending recipient found for:', phoneNumber);
    return createWebhookResponse({ success: true, message: 'No pending opt-in found' });
  }

  // Use the most recent pending recipient
  const recipient = recipients[0];
  console.log(`[EZTEXTING-WEBHOOK] Found recipient: ${recipient.id}`);

  // Determine status using shared utility
  const newStatus = determineSmsResponseStatus(message);
  const replyMessage = getOptInReplyMessage(newStatus);

  console.log(`[EZTEXTING-WEBHOOK] Recipient ${recipient.id} status: ${newStatus}`);

  const now = new Date().toISOString();

  // Update recipient
  const { error: updateError } = await supabase
    .from('recipients')
    .update({
      sms_opt_in_status: newStatus,
      sms_opt_in_response: message,
      sms_opt_in_response_at: now,
    })
    .eq('id', recipient.id);

  if (updateError) {
    console.error('[EZTEXTING-WEBHOOK] Update error:', updateError);
  }

  // Log the response
  const { error: logError } = await supabase.from('sms_opt_in_log').insert({
    recipient_id: recipient.id,
    campaign_id: recipient.campaign_id,
    phone: phoneNumber,
    message_sid: messageId || `ez_inbound_${Date.now()}`,
    direction: 'inbound',
    message_text: message,
    status: 'received',
  });

  if (logError) {
    console.error('[EZTEXTING-WEBHOOK] Log error:', logError);
  }

  // Find active call session for real-time updates
  const { data: callSession } = await supabase
    .from('call_sessions')
    .select('id')
    .eq('recipient_id', recipient.id)
    .eq('call_status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Broadcast real-time updates
  if (callSession) {
    try {
      const channel = supabase.channel(`opt_in_status:${callSession.id}`);
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'status_update',
        payload: {
          recipient_id: recipient.id,
          status: newStatus,
          response: message,
          response_at: now,
        },
      });
      await supabase.removeChannel(channel);
      console.log(`[EZTEXTING-WEBHOOK] Broadcast to call session ${callSession.id}`);
    } catch (broadcastError) {
      console.error('[EZTEXTING-WEBHOOK] Broadcast error:', broadcastError);
    }
  }

  // Also broadcast to recipient channel for direct polling
  try {
    const recipientChannel = supabase.channel(`opt_in_recipient:${recipient.id}`);
    await recipientChannel.subscribe();
    await recipientChannel.send({
      type: 'broadcast',
      event: 'status_update',
      payload: {
        recipient_id: recipient.id,
        status: newStatus,
        response: message,
        response_at: now,
      },
    });
    await supabase.removeChannel(recipientChannel);
    console.log('[EZTEXTING-WEBHOOK] Broadcast to recipient channel');
  } catch (broadcastError) {
    console.error('[EZTEXTING-WEBHOOK] Recipient broadcast error:', broadcastError);
  }

  // Log activity
  const activityType = newStatus === 'opted_in' ? 'opt_in' : newStatus === 'opted_out' ? 'opt_out' : 'sms_inbound';
  await activityLogger.communication(activityType, 'success', {
    campaignId: recipient.campaign_id,
    recipientId: recipient.id,
    description: `SMS response received from ${phoneNumber}: ${newStatus}`,
    metadata: {
      phone: phoneNumber,
      message,
      message_id: messageId,
      status: newStatus,
      provider: 'eztexting',
    },
  });

  const responseData: EZTextingWebhookResponse = {
    recipient_id: recipient.id,
    status: newStatus,
    reply: replyMessage,
  };

  return createWebhookResponse(responseData);
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleEZTextingWebhook, {
  requireAuth: false, // Webhooks don't have user auth
  parseBody: false, // We handle multi-format parsing manually
  auditAction: 'eztexting_webhook_received',
}));
