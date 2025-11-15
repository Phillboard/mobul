import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

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

    // Parse Twilio status callback payload
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string | null;
    const recordingSid = formData.get('RecordingSid') as string | null;
    const recordingDuration = formData.get('RecordingDuration') as string | null;

    console.log('Call status update:', { callSid, callStatus, callDuration });

    // Update call session
    const updateData: any = {
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
    } else if (callStatus === 'in-progress' && !updateData.call_answered_at) {
      updateData.call_answered_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from('call_sessions')
      .update(updateData)
      .eq('twilio_call_sid', callSid);

    if (updateError) {
      console.error('Failed to update call session:', updateError);
      throw updateError;
    }

    console.log('Call session updated successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating call status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
