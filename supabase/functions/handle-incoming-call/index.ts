import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse Twilio webhook payload (form-encoded)
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;

    console.log('Incoming call:', { callSid, from, to, callStatus });

    // Find the tracked number with recording settings
    const { data: trackedNumber, error: numberError } = await supabaseClient
      .from('tracked_phone_numbers')
      .select('*, campaigns(*)')
      .eq('phone_number', to)
      .eq('status', 'assigned')
      .single();

    if (numberError || !trackedNumber) {
      console.error('Tracked number not found:', to);
      return new Response(
        generateTwiML('Sorry, this number is not configured.'),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    console.log('Found campaign:', trackedNumber.campaigns?.name);

    // Try to match caller to a recipient
    const { data: matchedRecipient } = await supabaseClient
      .from('recipients')
      .select('*')
      .eq('audience_id', trackedNumber.campaigns?.audience_id)
      .or(`phone.eq.${from},phone.ilike.%${from.slice(-10)}%`)
      .limit(1)
      .single();

    const matchStatus = matchedRecipient ? 'matched' : 'unmatched';

    console.log('Recipient match status:', matchStatus);

    // Create call session
    const { data: callSession, error: sessionError } = await supabaseClient
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
      console.error('Failed to create call session:', sessionError);
    } else {
      console.log('Call session created:', callSession.id);
    }

    // Get call forwarding number and recording preference
    const forwardNumber = trackedNumber.forward_to_number || Deno.env.get('CALL_CENTER_NUMBER');
    const recordingEnabled = trackedNumber.recording_enabled !== false;

    // Generate TwiML to forward call with recording
    const twiml = generateTwiML(
      `Connecting your call. Session ID: ${callSession?.id || 'unknown'}`,
      forwardNumber,
      recordingEnabled,
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-call-status`
    );

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error handling incoming call:', error);
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
    const recordAttr = record ? ' record="record-from-answer" recordingStatusCallback="' + statusCallback + '"' : '';
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
