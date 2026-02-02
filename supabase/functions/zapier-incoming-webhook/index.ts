/**
 * Zapier Incoming Webhook Edge Function
 * 
 * Handles incoming webhooks from Zapier to create contacts,
 * update records, and log activities.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { createWebhookResponse } from '../_shared/webhook-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface ZapierWebhookPayload {
  action: string;
  data: Record<string, unknown>;
}

interface ZapierWebhookResponse {
  result: Record<string, unknown>;
}

type ZapierAction = 
  | 'create_contact'
  | 'update_contact'
  | 'add_to_audience'
  | 'log_activity';

// ============================================================================
// Action Handlers
// ============================================================================

async function handleCreateContact(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data: contact, error } = await supabase
    .from('recipients')
    .insert({
      client_id: clientId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      address1: data.address1,
      city: data.city,
      state: data.state,
      zip: data.zip,
    })
    .select()
    .single();

  if (error) throw error;
  return { contact_id: contact.id };
}

async function handleUpdateContact(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!data.contact_id) {
    throw new ApiError('contact_id is required', 'VALIDATION_ERROR', 400);
  }

  const { error } = await supabase
    .from('recipients')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
    })
    .eq('id', data.contact_id as string)
    .eq('client_id', clientId);

  if (error) throw error;
  return { success: true };
}

async function handleAddToAudience(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!data.audience_id || !data.contact_id) {
    throw new ApiError('audience_id and contact_id are required', 'VALIDATION_ERROR', 400);
  }

  const { error } = await supabase
    .from('recipients')
    .update({ audience_id: data.audience_id as string })
    .eq('id', data.contact_id as string)
    .eq('client_id', clientId);

  if (error) throw error;
  return { success: true };
}

async function handleLogActivity(
  supabase: ReturnType<typeof createServiceClient>,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { error } = await supabase
    .from('events')
    .insert({
      campaign_id: data.campaign_id,
      recipient_id: data.recipient_id,
      event_type: 'zapier_action',
      source: 'zapier',
      event_data_json: data,
    });

  if (error) throw error;
  return { success: true };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleZapierWebhook(
  _request: unknown,
  _context: PublicContext,
  rawRequest: Request
): Promise<Response> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('zapier-incoming-webhook', rawRequest);

  const url = new URL(rawRequest.url);
  const clientId = url.searchParams.get('client_id');
  const secret = url.searchParams.get('secret');

  if (!clientId || !secret) {
    throw new ApiError('Missing client_id or secret', 'UNAUTHORIZED', 401);
  }

  // Verify client and secret
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, api_key_hash')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    console.error('[ZAPIER-WEBHOOK] Client verification failed:', clientError);
    throw new ApiError('Invalid client', 'UNAUTHORIZED', 401);
  }

  // Simple secret verification
  const expectedSecret = client.api_key_hash?.substring(0, 32);
  if (secret !== expectedSecret) {
    throw new ApiError('Invalid secret', 'UNAUTHORIZED', 401);
  }

  // Parse payload
  const payload = await rawRequest.json() as ZapierWebhookPayload;
  console.log('[ZAPIER-WEBHOOK] Action:', payload.action);

  let result: Record<string, unknown>;

  // Route to appropriate action handler
  switch (payload.action as ZapierAction) {
    case 'create_contact':
      result = await handleCreateContact(supabase, clientId, payload.data);
      break;

    case 'update_contact':
      result = await handleUpdateContact(supabase, clientId, payload.data);
      break;

    case 'add_to_audience':
      result = await handleAddToAudience(supabase, clientId, payload.data);
      break;

    case 'log_activity':
      result = await handleLogActivity(supabase, payload.data);
      break;

    default:
      throw new ApiError(`Unknown action: ${payload.action}`, 'VALIDATION_ERROR', 400);
  }

  console.log('[ZAPIER-WEBHOOK] Processed successfully');

  // Log activity
  await activityLogger.api('webhook_received', 'success',
    `Zapier incoming webhook: ${payload.action}`,
    {
      clientId,
      endpoint: '/zapier-incoming-webhook',
      method: 'POST',
      metadata: {
        action: payload.action,
        result,
      },
    }
  );

  const responseData: ZapierWebhookResponse = { result };

  return createWebhookResponse(responseData, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleZapierWebhook, {
  requireAuth: false, // Authenticates via secret in URL params
  parseBody: false, // We handle JSON parsing manually
  auditAction: 'zapier_webhook_received',
}));
