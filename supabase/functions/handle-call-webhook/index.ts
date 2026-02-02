/**
 * Handle Call Webhook Edge Function
 * 
 * Receives call data from external call center systems.
 * Creates/updates call sessions and triggers condition evaluation.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface CallWebhookPayload {
  phone: string;
  trackedNumber: string;
  disposition?: string;
  duration?: number;
  recordingUrl?: string;
  callSid?: string;
  externalCallId?: string;
}

interface CallWebhookResponse {
  success: boolean;
  callSessionId?: string;
  recipientMatched?: boolean;
}

async function handleCallWebhook(
  request: CallWebhookPayload,
  _context: unknown,
  rawRequest: Request
): Promise<CallWebhookResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('handle-call-webhook', rawRequest);

  const { phone, trackedNumber, disposition, duration, recordingUrl, callSid, externalCallId } = request;

  console.log('[CALL-WEBHOOK] Received:', { phone, trackedNumber, disposition });

  // Find tracked number
  const { data: trackedNumberData, error: numberError } = await supabase
    .from('tracked_phone_numbers')
    .select('*, campaigns(id, client_id)')
    .eq('phone_number', trackedNumber)
    .single();

  if (numberError || !trackedNumberData) {
    throw new ApiError('Tracked number not found', 'NOT_FOUND', 404);
  }

  // Try to match recipient
  const { data: recipient } = await supabase
    .from('recipients')
    .select('*')
    .eq('phone', phone)
    .eq('campaign_id', trackedNumberData.campaign_id)
    .maybeSingle();

  // Create/update call session
  const callData: Record<string, unknown> = {
    campaign_id: trackedNumberData.campaign_id,
    tracked_number_id: trackedNumberData.id,
    caller_phone: phone,
    recipient_id: recipient?.id || null,
    match_status: recipient ? 'matched' : 'unmatched',
    call_status: disposition ? 'completed' : 'in-progress',
    twilio_call_sid: callSid || null,
    recording_url: recordingUrl || null,
    call_duration_seconds: duration || null,
  };

  if (disposition) {
    callData.call_ended_at = new Date().toISOString();
  }

  const { data: callSession, error: sessionError } = await supabase
    .from('call_sessions')
    .upsert(callData)
    .select()
    .single();

  if (sessionError) {
    throw new ApiError('Failed to save call session', 'DATABASE_ERROR', 500);
  }

  // Evaluate conditions for positive dispositions
  if (disposition && recipient && ['interested', 'qualified', 'validated'].includes(disposition.toLowerCase())) {
    await supabase.functions.invoke('evaluate-conditions', {
      body: {
        recipientId: recipient.id,
        campaignId: trackedNumberData.campaign_id,
        eventType: 'call_completed',
        metadata: {
          disposition,
          callSessionId: callSession.id,
          externalCallId,
        },
      },
    });
  }

  // Log activity
  await activityLogger.communication(
    disposition ? 'call_completed' : 'call_inbound',
    'success',
    disposition
      ? `Call completed with disposition: ${disposition}`
      : `Incoming call from ${phone}`,
    {
      clientId: trackedNumberData.campaigns?.client_id,
      campaignId: trackedNumberData.campaign_id,
      recipientId: recipient?.id,
      metadata: {
        call_session_id: callSession.id,
        caller_phone: phone,
        tracked_number: trackedNumber,
        disposition,
        duration,
        recipient_matched: !!recipient,
      },
    }
  );

  return {
    success: true,
    callSessionId: callSession.id,
    recipientMatched: !!recipient,
  };
}

Deno.serve(withApiGateway(handleCallWebhook, {
  requireAuth: false, // External webhook
  parseBody: true,
}));
