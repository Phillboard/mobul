/**
 * Dispatch Zapier Event Edge Function
 * 
 * Sends events to connected Zapier webhooks for a client.
 * Internal service function called by other edge functions.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface EventPayload {
  event_type: string;
  client_id: string;
  data: Record<string, unknown>;
  triggered_by?: string;
  meta?: Record<string, unknown>;
}

interface ZapierConnection {
  id: string;
  connection_name: string;
  zap_webhook_url: string;
  success_count: number;
  failure_count: number;
}

interface WebhookResult {
  success: boolean;
  status?: number;
  error?: string;
  body?: string;
}

interface DispatchResponse {
  triggered: number;
  success: number;
  results: Array<{
    connection_id: string;
    connection_name: string;
    success: boolean;
    status?: number;
    error?: string;
  }>;
}

// ============================================================================
// Helpers
// ============================================================================

async function sendToZapier(
  webhookUrl: string,
  payload: unknown,
  retries = 3
): Promise<WebhookResult> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[DISPATCH-ZAPIER] Attempt ${attempt} to send to Zapier`);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();

      if (response.ok) {
        console.log('[DISPATCH-ZAPIER] Webhook succeeded');
        return { success: true, status: response.status, body: responseBody };
      }

      console.error(`[DISPATCH-ZAPIER] Webhook failed with status ${response.status}`);
      if (attempt === retries) {
        return {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}: ${responseBody}`,
        };
      }
    } catch (error) {
      console.error(`[DISPATCH-ZAPIER] Attempt ${attempt} failed:`, error);
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

// ============================================================================
// Main Handler
// ============================================================================

async function handleDispatchZapierEvent(
  request: EventPayload,
  _context: AuthContext
): Promise<DispatchResponse> {
  const { event_type, client_id, data, triggered_by, meta } = request;

  if (!event_type || !client_id || !data) {
    throw new ApiError('Missing required fields: event_type, client_id, data', 'VALIDATION_ERROR', 400);
  }

  console.log(`[DISPATCH-ZAPIER] Processing event: ${event_type} for client: ${client_id}`);

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('dispatch-zapier-event');

  // Fetch active Zapier connections for this client that subscribe to this event
  const { data: connections, error: connectionsError } = await supabase
    .from('zapier_connections')
    .select('*')
    .eq('client_id', client_id)
    .eq('is_active', true)
    .contains('trigger_events', [event_type]);

  if (connectionsError) {
    console.error('[DISPATCH-ZAPIER] Error fetching connections:', connectionsError);
    throw new ApiError('Failed to fetch Zapier connections', 'DATABASE_ERROR', 500);
  }

  console.log(`[DISPATCH-ZAPIER] Found ${connections?.length || 0} active connections for event ${event_type}`);

  if (!connections || connections.length === 0) {
    return { triggered: 0, success: 0, results: [] };
  }

  // Get client info for payload
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, industry')
    .eq('id', client_id)
    .single();

  const results = [];

  for (const connection of connections as ZapierConnection[]) {
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

    console.log(`[DISPATCH-ZAPIER] Sending to connection: ${connection.connection_name}`);
    const result = await sendToZapier(connection.zap_webhook_url, eventPayload);

    // Log the webhook call
    await supabase.from('zapier_trigger_logs').insert({
      zapier_connection_id: connection.id,
      event_type,
      payload: eventPayload,
      response_status: result.status,
      response_body: result.body,
      error: result.error,
    });

    // Update connection stats
    if (result.success) {
      await supabase
        .from('zapier_connections')
        .update({
          last_triggered_at: new Date().toISOString(),
          success_count: connection.success_count + 1,
          failure_count: 0,
        })
        .eq('id', connection.id);
    } else {
      const newFailureCount = connection.failure_count + 1;
      const updates: Record<string, unknown> = { failure_count: newFailureCount };

      // Auto-disable after 10 consecutive failures
      if (newFailureCount >= 10) {
        updates.is_active = false;
        console.log(`[DISPATCH-ZAPIER] Auto-disabling connection ${connection.id} after 10 failures`);
      }

      await supabase
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
  console.log(`[DISPATCH-ZAPIER] Successfully sent to ${successCount}/${results.length} connections`);

  // Log activity
  await activityLogger.api(
    successCount > 0 ? 'webhook_sent' : 'webhook_failed',
    successCount > 0 ? 'success' : 'failed',
    {
      clientId: client_id,
      description: `Zapier event ${event_type} dispatched to ${successCount}/${connections.length} connections`,
      metadata: {
        event_type,
        triggered: connections.length,
        success_count: successCount,
        failed_count: connections.length - successCount,
      },
    }
  );

  return {
    triggered: connections.length,
    success: successCount,
    results,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleDispatchZapierEvent, {
  requireAuth: false, // Internal service function, called by other edge functions
  parseBody: true,
  auditAction: 'dispatch_zapier_event',
}));
