/**
 * Trigger Webhook Edge Function
 * 
 * Sends events to client webhooks with HMAC signature verification.
 * Internal service function called by other edge functions.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface TriggerWebhookRequest {
  client_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  failure_count: number;
}

interface WebhookResult {
  webhook_id: string;
  webhook_name: string;
  success: boolean;
  status: number | null;
  body: string | null;
  error: string | null;
}

interface TriggerWebhookResponse {
  triggered: number;
  results: WebhookResult[];
}

// ============================================================================
// Helpers
// ============================================================================

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

async function sendWebhook(
  webhook: Webhook,
  eventData: Record<string, unknown>,
  retries = 3
): Promise<{ success: boolean; status: number | null; body: string | null; error: string | null }> {
  const payload = JSON.stringify(eventData);
  const signature = await signPayload(payload, webhook.secret);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mobul-Signature': signature,
          'X-Mobul-Event-Type': String(eventData.event_type),
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
        return {
          success: false,
          status: null,
          body: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return { success: false, status: null, body: null, error: 'Max retries exceeded' };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleTriggerWebhook(
  request: TriggerWebhookRequest,
  _context: AuthContext
): Promise<TriggerWebhookResponse> {
  const { client_id, event_type, event_data } = request;

  if (!client_id || !event_type || !event_data) {
    throw new ApiError('Missing required fields', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('trigger-webhook');

  // Fetch active webhooks for this client that subscribe to this event
  const { data: webhooks, error: webhooksError } = await supabase
    .from('webhooks')
    .select('*')
    .eq('client_id', client_id)
    .eq('active', true)
    .contains('events', [event_type]);

  if (webhooksError) {
    throw new ApiError('Failed to fetch webhooks', 'DATABASE_ERROR', 500);
  }

  console.log(`[TRIGGER-WEBHOOK] Found ${webhooks?.length || 0} webhooks for event ${event_type}`);

  if (!webhooks || webhooks.length === 0) {
    return { triggered: 0, results: [] };
  }

  const results: WebhookResult[] = [];

  for (const webhook of webhooks as Webhook[]) {
    const eventPayload = {
      event_type,
      timestamp: new Date().toISOString(),
      data: event_data,
    };

    const result = await sendWebhook(webhook, eventPayload);

    // Log the webhook call
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type,
      payload: eventPayload,
      response_status: result.status,
      response_body: result.body,
      error: result.error,
    });

    // Update webhook stats
    if (result.success) {
      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          failure_count: 0,
        })
        .eq('id', webhook.id);
    } else {
      await supabase
        .from('webhooks')
        .update({ failure_count: webhook.failure_count + 1 })
        .eq('id', webhook.id);
    }

    // Log activity
    await activityLogger.api(
      result.success ? 'webhook_sent' : 'webhook_failed',
      result.success ? 'success' : 'failed',
      {
        clientId: client_id,
        description: result.success
          ? `Webhook sent to ${webhook.name}: ${event_type}`
          : `Webhook failed for ${webhook.name}: ${result.error}`,
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

  return { triggered: webhooks.length, results };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleTriggerWebhook, {
  requireAuth: false, // Internal service function
  parseBody: true,
  auditAction: 'trigger_webhook',
}));
