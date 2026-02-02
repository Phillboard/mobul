/**
 * Complete Call Disposition Edge Function
 * 
 * Records call disposition and triggers condition evaluation.
 * Used by call center agents to mark calls as completed.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface CompleteCallRequest {
  callSessionId: string;
  disposition: string;
  notes?: string;
}

interface CompleteCallResponse {
  success: boolean;
  message?: string;
}

async function handleCompleteCall(
  request: CompleteCallRequest,
  _context: unknown,
  rawRequest: Request
): Promise<CompleteCallResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('complete-call-disposition', rawRequest);

  const { callSessionId, disposition, notes } = request;

  console.log('[COMPLETE-CALL] Processing:', { callSessionId, disposition });

  // Get call session details
  const { data: callSession, error: sessionError } = await supabase
    .from('call_sessions')
    .select('*, campaigns(id, client_id)')
    .eq('id', callSessionId)
    .single();

  if (sessionError || !callSession) {
    throw new ApiError('Call session not found', 'NOT_FOUND', 404);
  }

  // Check if disposition should trigger condition evaluation
  const shouldEvaluateConditions = disposition === 'interested';

  if (shouldEvaluateConditions && callSession.recipient_id && callSession.campaign_id) {
    console.log('[COMPLETE-CALL] Checking opt-in for recipient:', callSession.recipient_id);

    // Verify SMS opt-in status
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('sms_opt_in_status')
      .eq('id', callSession.recipient_id)
      .single();

    if (recipientError) {
      console.error('[COMPLETE-CALL] Error fetching recipient:', recipientError);
    }

    if (recipient?.sms_opt_in_status !== 'opted_in') {
      console.warn(`[COMPLETE-CALL] Recipient ${callSession.recipient_id} not opted in (${recipient?.sms_opt_in_status})`);

      // Create event for audit but don't evaluate conditions
      await supabase.from('events').insert({
        campaign_id: callSession.campaign_id,
        recipient_id: callSession.recipient_id,
        event_type: 'call_completed_no_optin',
        source: 'call_center',
        event_data_json: {
          disposition,
          notes,
          callSessionId,
          blocked_reason: 'recipient_not_opted_in',
          opt_in_status: recipient?.sms_opt_in_status || 'unknown',
        },
      });
    } else {
      // Recipient opted in - evaluate conditions
      console.log('[COMPLETE-CALL] Recipient opted in, evaluating conditions');

      const { error: evalError } = await supabase.functions.invoke('evaluate-conditions', {
        body: {
          recipientId: callSession.recipient_id,
          campaignId: callSession.campaign_id,
          eventType: 'call_completed',
          metadata: {
            disposition,
            notes,
            callSessionId,
            opt_in_verified: true,
          },
        },
      });

      if (evalError) {
        console.error('[COMPLETE-CALL] Condition evaluation error:', evalError);
      }
    }
  }

  // Create event for tracking
  if (callSession.recipient_id && callSession.campaign_id) {
    await supabase.from('events').insert({
      campaign_id: callSession.campaign_id,
      recipient_id: callSession.recipient_id,
      event_type: 'call_completed',
      source: 'call_center',
      event_data_json: { disposition, notes, callSessionId },
    });
  }

  // Dispatch Zapier event
  if (callSession.campaigns?.client_id) {
    try {
      await supabase.functions.invoke('dispatch-zapier-event', {
        body: {
          event_type: 'call.completed',
          client_id: callSession.campaigns.client_id,
          data: {
            call_session_id: callSessionId,
            campaign_id: callSession.campaign_id,
            recipient_id: callSession.recipient_id,
            disposition,
            notes: notes || null,
            completed_at: new Date().toISOString(),
          },
        },
      });
      console.log('[COMPLETE-CALL] Zapier event dispatched');
    } catch (zapierError) {
      console.error('[COMPLETE-CALL] Zapier error:', zapierError);
    }
  }

  // Log activity
  await activityLogger.communication('call_completed', 'success',
    `Call completed with disposition: ${disposition}`,
    {
      recipientId: callSession.recipient_id,
      campaignId: callSession.campaign_id,
      clientId: callSession.campaigns?.client_id,
      metadata: { call_session_id: callSessionId, disposition, notes },
    }
  );

  return { success: true, message: 'Call disposition recorded successfully' };
}

Deno.serve(withApiGateway(handleCompleteCall, {
  requireAuth: false, // Called by internal systems
  parseBody: true,
}));
