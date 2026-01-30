import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { createActivityLogger } from '../_shared/activity-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sendWebhook(webhook: any, eventData: any, retries = 3): Promise<any> {
  const payload = JSON.stringify(eventData);
  const signature = await signPayload(payload, webhook.secret);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ACE-Signature': signature,
          'X-ACE-Event-Type': eventData.event_type,
        },
        body: payload,
      });

      const responseBody = await response.text();

      return {
        success: response.ok,
        status: response.status,
        body: responseBody,
        error: null,
      };
    } catch (error) {
      if (attempt === retries) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return {
          success: false,
          status: null,
          body: null,
          error: message,
        };
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize activity logger
  const activityLogger = createActivityLogger('trigger-webhook', req);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { client_id, event_type, event_data } = await req.json();

    if (!client_id || !event_type || !event_data) {
      throw new Error('Missing required fields');
    }

    // Fetch active webhooks for this client that subscribe to this event
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from('webhooks')
      .select('*')
      .eq('client_id', client_id)
      .eq('active', true)
      .contains('events', [event_type]);

    if (webhooksError) throw webhooksError;

    console.log(`Found ${webhooks.length} webhooks for event ${event_type}`);

    const results = [];

    for (const webhook of webhooks) {
      const eventPayload = {
        event_type,
        timestamp: new Date().toISOString(),
        data: event_data,
      };

      const result = await sendWebhook(webhook, eventPayload);

      // Log the webhook call
      await supabaseClient.from('webhook_logs').insert({
        webhook_id: webhook.id,
        event_type,
        payload: eventPayload,
        response_status: result.status,
        response_body: result.body,
        error: result.error,
      });

      // Update webhook stats
      if (result.success) {
        await supabaseClient
          .from('webhooks')
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq('id', webhook.id);
      } else {
        await supabaseClient
          .from('webhooks')
          .update({
            failure_count: webhook.failure_count + 1,
          })
          .eq('id', webhook.id);
      }

      // Log webhook activity
      await activityLogger.api(result.success ? 'webhook_sent' : 'webhook_failed',
        result.success ? 'success' : 'failed',
        result.success 
          ? `Webhook sent to ${webhook.name}: ${event_type}`
          : `Webhook failed for ${webhook.name}: ${result.error}`,
        {
          clientId: client_id,
          webhookUrl: webhook.url,
          statusCode: result.status,
          metadata: {
            webhook_id: webhook.id,
            webhook_name: webhook.name,
            event_type,
            response_status: result.status,
          },
        }
      );

      results.push({
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        ...result,
      });
    }

    return new Response(
      JSON.stringify({ triggered: webhooks.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
