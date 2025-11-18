import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallWebhookPayload {
  phone: string;
  trackedNumber: string;
  disposition?: string;
  duration?: number;
  recordingUrl?: string;
  callSid?: string;
  externalCallId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json() as CallWebhookPayload;
    console.log('Received call webhook:', payload);

    // Find tracked number
    const { data: trackedNumber, error: numberError } = await supabase
      .from('tracked_phone_numbers')
      .select('*, campaigns(id, client_id)')
      .eq('phone_number', payload.trackedNumber)
      .single();

    if (numberError || !trackedNumber) {
      throw new Error('Tracked number not found');
    }

    // Try to match recipient by phone
    const { data: recipient } = await supabase
      .from('recipients')
      .select('*')
      .eq('phone', payload.phone)
      .eq('campaign_id', trackedNumber.campaign_id)
      .maybeSingle();

    // Create or update call session
    const callData: any = {
      campaign_id: trackedNumber.campaign_id,
      tracked_number_id: trackedNumber.id,
      caller_phone: payload.phone,
      recipient_id: recipient?.id || null,
      match_status: recipient ? 'matched' : 'unmatched',
      call_status: payload.disposition ? 'completed' : 'in-progress',
      twilio_call_sid: payload.callSid || null,
      recording_url: payload.recordingUrl || null,
      call_duration_seconds: payload.duration || null,
    };

    if (payload.disposition) {
      callData.call_ended_at = new Date().toISOString();
    }

    const { data: callSession, error: sessionError } = await supabase
      .from('call_sessions')
      .upsert(callData)
      .select()
      .single();

    if (sessionError) throw sessionError;

    // If call is completed with a positive disposition, evaluate conditions
    if (payload.disposition && recipient && 
        ['interested', 'qualified', 'validated'].includes(payload.disposition.toLowerCase())) {
      
      await supabase.functions.invoke('evaluate-conditions', {
        body: {
          recipientId: recipient.id,
          campaignId: trackedNumber.campaign_id,
          eventType: 'call_completed',
          metadata: {
            disposition: payload.disposition,
            callSessionId: callSession.id,
            externalCallId: payload.externalCallId,
          },
        },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        callSessionId: callSession.id,
        recipientMatched: !!recipient 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing call webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
