/**
 * Update Call Status Edge Function
 * 
 * Twilio status callback handler for call updates.
 * Updates call session with duration, recording URL, etc.
 * 
 * NOTE: This is a Twilio webhook endpoint that receives form-encoded data.
 */

import { createServiceClient } from '../_shared/supabase.ts';
import { handleCORS } from '../_shared/cors.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('update-call-status', req);

  try {
    // Parse Twilio status callback (form-encoded)
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string | null;
    const recordingUrl = formData.get('RecordingUrl') as string | null;
    const recordingSid = formData.get('RecordingSid') as string | null;
    const recordingDuration = formData.get('RecordingDuration') as string | null;

    console.log('[UPDATE-CALL-STATUS] Received:', { callSid, callStatus, callDuration });

    // Build update data
    const updateData: Record<string, unknown> = {
      call_status: callStatus.toLowerCase(),
    };

    if (callStatus === 'completed') {
      updateData.call_ended_at = new Date().toISOString();
      if (callDuration) {
        updateData.call_duration_seconds = parseInt(callDuration, 10);
      }
      if (recordingUrl) {
        updateData.recording_url = recordingUrl;
      }
      if (recordingSid) {
        updateData.recording_sid = recordingSid;
      }
      if (recordingDuration) {
        updateData.recording_duration = parseInt(recordingDuration, 10);
      }
    } else if (callStatus === 'in-progress') {
      updateData.call_answered_at = new Date().toISOString();
    }

    // Update call session
    const { error: updateError } = await supabase
      .from('call_sessions')
      .update(updateData)
      .eq('twilio_call_sid', callSid);

    if (updateError) {
      console.error('[UPDATE-CALL-STATUS] Update error:', updateError);
      throw updateError;
    }

    console.log('[UPDATE-CALL-STATUS] Updated successfully');

    // Log activity
    await activityLogger.communication('call_status_updated', 'success',
      `Call status updated to ${callStatus.toLowerCase()}`,
      {
        metadata: {
          call_sid: callSid,
          call_status: callStatus.toLowerCase(),
          call_duration: callDuration ? parseInt(callDuration, 10) : undefined,
          recording_url: recordingUrl,
          recording_sid: recordingSid,
        },
      }
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[UPDATE-CALL-STATUS] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
