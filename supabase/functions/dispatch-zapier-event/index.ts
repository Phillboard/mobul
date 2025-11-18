import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventPayload {
  event_type: string;
  client_id: string;
  data: Record<string, any>;
  triggered_by?: string;
  meta?: Record<string, any>;
}

async function sendToZapier(
  webhookUrl: string,
  payload: any,
  retries = 3
): Promise<{ success: boolean; status?: number; error?: string; body?: string }> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to send to Zapier:`, webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();

      if (response.ok) {
        console.log('Zapier webhook succeeded');
        return {
          success: true,
          status: response.status,
          body: responseBody,
        };
      } else {
        console.error(`Zapier webhook failed with status ${response.status}`);
        if (attempt === retries) {
          return {
            success: false,
            status: response.status,
            error: `HTTP ${response.status}: ${responseBody}`,
          };
        }
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event_type, client_id, data, triggered_by, meta } = await req.json() as EventPayload;

    if (!event_type || !client_id || !data) {
      throw new Error('Missing required fields: event_type, client_id, data');
    }

    console.log(`Processing event: ${event_type} for client: ${client_id}`);

    // Fetch active Zapier connections for this client that subscribe to this event
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('zapier_connections')
      .select('*')
      .eq('client_id', client_id)
      .eq('is_active', true)
      .contains('trigger_events', [event_type]);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      throw connectionsError;
    }

    console.log(`Found ${connections.length} active connections for event ${event_type}`);

    if (connections.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No active Zapier connections found for this event',
          triggered: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info for payload
    const { data: client } = await supabaseClient
      .from('clients')
      .select('id, name, industry')
      .eq('id', client_id)
      .single();

    const results = [];

    for (const connection of connections) {
      const eventPayload = {
        event_id: crypto.randomUUID(),
        event_type,
        timestamp: new Date().toISOString(),
        client: client || { id: client_id },
        data,
        meta: {
          triggered_by: triggered_by || 'system',
          ...meta,
        },
      };

      console.log(`Sending to connection: ${connection.connection_name}`);
      const result = await sendToZapier(connection.zap_webhook_url, eventPayload);

      // Log the webhook call
      await supabaseClient.from('zapier_trigger_logs').insert({
        zapier_connection_id: connection.id,
        event_type,
        payload: eventPayload,
        response_status: result.status,
        response_body: result.body,
        error: result.error,
      });

      // Update connection stats
      if (result.success) {
        await supabaseClient
          .from('zapier_connections')
          .update({
            last_triggered_at: new Date().toISOString(),
            success_count: connection.success_count + 1,
            failure_count: 0, // Reset on success
          })
          .eq('id', connection.id);
      } else {
        const newFailureCount = connection.failure_count + 1;
        const updates: any = {
          failure_count: newFailureCount,
        };

        // Auto-disable after 10 consecutive failures
        if (newFailureCount >= 10) {
          updates.is_active = false;
          console.log(`Auto-disabling connection ${connection.id} after 10 failures`);
        }

        await supabaseClient
          .from('zapier_connections')
          .update(updates)
          .eq('id', connection.id);
      }

      results.push({
        connection_id: connection.id,
        connection_name: connection.connection_name,
        success: result.success,
        status: result.status,
        error: result.error,
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully sent to ${successCount}/${results.length} connections`);

    return new Response(
      JSON.stringify({ 
        triggered: connections.length, 
        success: successCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error dispatching Zapier event:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
