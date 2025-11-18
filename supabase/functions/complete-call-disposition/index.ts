import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteCallRequest {
  callSessionId: string;
  disposition: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { callSessionId, disposition, notes } = await req.json() as CompleteCallRequest;

    console.log('Processing call disposition:', { callSessionId, disposition });

    // Get call session details
    const { data: callSession, error: sessionError } = await supabase
      .from('call_sessions')
      .select('*, campaigns(id, client_id)')
      .eq('id', callSessionId)
      .single();

    if (sessionError || !callSession) {
      throw new Error('Call session not found');
    }

    // Check if this disposition should trigger condition evaluation
    const shouldEvaluateConditions = disposition === 'interested';

    if (shouldEvaluateConditions && callSession.recipient_id && callSession.campaign_id) {
      console.log('Evaluating call_completed condition for recipient:', callSession.recipient_id);

      // Invoke evaluate-conditions function
      const { error: evalError } = await supabase.functions.invoke('evaluate-conditions', {
        body: {
          recipientId: callSession.recipient_id,
          campaignId: callSession.campaign_id,
          eventType: 'call_completed',
          metadata: {
            disposition,
            notes,
            callSessionId,
          },
        },
      });

      if (evalError) {
        console.error('Error evaluating conditions:', evalError);
        // Don't throw - we still want to record the disposition even if condition eval fails
      }
    }

    // Create event for tracking
    if (callSession.recipient_id && callSession.campaign_id) {
      await supabase.from('events').insert({
        campaign_id: callSession.campaign_id,
        recipient_id: callSession.recipient_id,
        event_type: 'call_completed',
        source: 'call_center',
        event_data_json: {
          disposition,
          notes,
          callSessionId,
        },
      });
    }

    // Dispatch Zapier event
    try {
      if (callSession.campaigns?.client_id) {
        await supabase.functions.invoke('dispatch-zapier-event', {
          body: {
            event_type: 'call.completed',
            client_id: callSession.campaigns.client_id,
            data: {
              call_session_id: callSessionId,
              campaign_id: callSession.campaign_id,
              recipient_id: callSession.recipient_id,
              disposition: disposition,
              notes: notes || null,
              completed_at: new Date().toISOString(),
            }
          }
        });
        console.log('Zapier event dispatched for call completion');
      }
    } catch (zapierError) {
      console.error('Failed to dispatch Zapier event:', zapierError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Call disposition recorded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error completing call disposition:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
