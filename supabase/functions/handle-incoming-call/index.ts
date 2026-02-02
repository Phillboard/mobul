/**
 * Handle Incoming Call Edge Function
 * 
 * Twilio webhook handler for incoming voice calls.
 * Creates call session, matches recipient, and returns TwiML.
 * 
 * NOTE: This is a Twilio webhook endpoint that receives form-encoded data,
 * so it cannot use the standard withApiGateway (which expects JSON).
 */

import { createServiceClient } from '../_shared/supabase.ts';
import { handleCORS } from '../_shared/cors.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('handle-incoming-call', req);

  try {
    // Parse Twilio webhook payload (form-encoded)
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    console.log('[INCOMING-CALL] Received:', { callSid, from, to, callStatus });

    // Find the tracked number
    const { data: trackedNumber, error: numberError } = await supabase
      .from('tracked_phone_numbers')
      .select('*, campaigns(*)')
      .eq('phone_number', to)
      .eq('status', 'assigned')
      .single();

    if (numberError || !trackedNumber) {
      console.error('[INCOMING-CALL] Number not found:', to);
      return new Response(
        generateTwiML('Sorry, this number is not configured.'),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    console.log('[INCOMING-CALL] Campaign:', trackedNumber.campaigns?.name);

    // Try to match caller to a recipient
    const { data: matchedRecipient } = await supabase
      .from('recipients')
      .select('*')
      .eq('audience_id', trackedNumber.campaigns?.audience_id)
      .or(`phone.eq.${from},phone.ilike.%${from.slice(-10)}%`)
      .limit(1)
      .single();

    const matchStatus = matchedRecipient ? 'matched' : 'unmatched';
    console.log('[INCOMING-CALL] Match status:', matchStatus);

    // Create call session
    const { data: callSession, error: sessionError } = await supabase
      .from('call_sessions')
      .insert({
        campaign_id: trackedNumber.campaign_id,
        recipient_id: matchedRecipient?.id || null,
        tracked_number_id: trackedNumber.id,
        caller_phone: from,
        twilio_call_sid: callSid,
        call_status: callStatus.toLowerCase(),
        match_status: matchStatus,
        call_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[INCOMING-CALL] Session error:', sessionError);
    } else {
      console.log('[INCOMING-CALL] Session created:', callSession.id);

      await activityLogger.communication('call_inbound', 'success',
        `Inbound call from ${from} to ${to}`,
        {
          recipientId: matchedRecipient?.id,
          campaignId: trackedNumber.campaign_id,
          direction: 'inbound',
          fromNumber: from,
          toNumber: to,
          metadata: {
            call_sid: callSid,
            call_session_id: callSession.id,
            match_status: matchStatus,
            campaign_name: trackedNumber.campaigns?.name,
          },
        }
      );
    }

    // Get forwarding settings
    const forwardNumber = trackedNumber.forward_to_number || Deno.env.get('CALL_CENTER_NUMBER');
    const recordingEnabled = trackedNumber.recording_enabled !== false;
    const statusCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-call-status`;

    const twiml = generateTwiML(
      `Connecting your call. Session ID: ${callSession?.id || 'unknown'}`,
      forwardNumber,
      recordingEnabled,
      statusCallbackUrl
    );

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('[INCOMING-CALL] Error:', error);
    return new Response(
      generateTwiML('An error occurred. Please try again later.'),
      { headers: { 'Content-Type': 'text/xml' } }
    );
  }
});

function generateTwiML(
  message: string,
  dialNumber?: string,
  record?: boolean,
  statusCallback?: string
): string {
  if (dialNumber) {
    const recordAttr = record 
      ? ` record="record-from-answer" recordingStatusCallback="${statusCallback}"` 
      : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${message}</Say>
  <Dial${recordAttr} action="${statusCallback}">${dialNumber}</Dial>
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${message}</Say>
  <Pause length="2"/>
  <Hangup/>
</Response>`;
}
