/**
 * CRM Webhook Receiver Edge Function
 * 
 * Receives webhooks from multiple CRM providers (Salesforce, HubSpot, Zoho, etc.)
 * and routes events to trigger campaign conditions.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import {
  parseWebhookPayload,
  createWebhookResponse,
  normalizePhoneNumber,
} from '../_shared/webhook-utils.ts';
import {
  getCRMAdapter,
  extractSignatureFromHeaders,
  type CRMProvider,
  type ParsedCRMEvent,
} from '../_shared/crm-adapters.ts';

// ============================================================================
// Types
// ============================================================================

interface CRMWebhookResponse {
  event_id?: string;
  matched: boolean;
  condition_triggered: number | null;
  processed: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleCRMWebhook(
  _request: unknown,
  _context: PublicContext,
  rawRequest: Request
): Promise<Response> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('crm-webhook-receiver', rawRequest);

  const url = new URL(rawRequest.url);
  const integrationId = url.searchParams.get('integration_id');

  if (!integrationId) {
    throw new ApiError('Missing integration_id parameter', 'VALIDATION_ERROR', 400);
  }

  // Get integration config
  const { data: integration, error: integrationError } = await supabase
    .from('crm_integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    throw new ApiError('Integration not found or inactive', 'NOT_FOUND', 404);
  }

  // Parse webhook payload
  const webhookPayload = await parseWebhookPayload(rawRequest.clone());
  const rawPayload = webhookPayload.raw;
  const payload = webhookPayload.parsed;

  if (!payload) {
    throw new ApiError('Invalid payload', 'VALIDATION_ERROR', 400);
  }

  // Get appropriate adapter
  const adapter = getCRMAdapter(integration.crm_provider as CRMProvider);

  // Verify signature
  const signature = extractSignatureFromHeaders(
    rawRequest.headers,
    integration.crm_provider as CRMProvider
  );

  const verificationResult = await adapter.verifySignature(
    rawPayload,
    signature,
    integration.webhook_secret || ''
  );

  if (!verificationResult.valid) {
    console.error('[CRM-WEBHOOK] Signature verification failed:', verificationResult.error);
    // Log but don't reject to avoid breaking legitimate webhooks
  }

  // Parse event using adapter
  const parsedEvent: ParsedCRMEvent = adapter.parseEvent(payload);
  console.log('[CRM-WEBHOOK] Parsed event:', parsedEvent);

  // Try to match recipient
  let recipientId: string | null = null;
  let callSessionId: string | null = null;
  let matched = false;

  // Build query to find recipient
  let query = supabase
    .from('recipients')
    .select('id, audience_id');

  // Match by phone (last 10 digits)
  if (parsedEvent.phone) {
    const phone = normalizePhoneNumber(parsedEvent.phone);
    query = query.ilike('phone', `%${phone}%`);
  } else if (parsedEvent.email) {
    query = query.eq('email', parsedEvent.email);
  }

  // If campaign-specific, filter by campaign's audience
  if (integration.campaign_id) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('audience_id')
      .eq('id', integration.campaign_id)
      .single();

    if (campaign?.audience_id) {
      query = query.eq('audience_id', campaign.audience_id);
    }
  }

  const { data: recipients } = await query.limit(1);

  if (recipients && recipients.length > 0) {
    recipientId = recipients[0].id;
    matched = true;

    // Try to find associated call session
    const { data: session } = await supabase
      .from('call_sessions')
      .select('id')
      .eq('recipient_id', recipientId)
      .eq('campaign_id', integration.campaign_id || '')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (session) {
      callSessionId = session.id;
    }
  }

  // Check if event matches any condition triggers
  let conditionTriggered: number | null = null;
  const eventMappings = integration.event_mappings as Record<string, { event_type: string; event_filter?: Record<string, unknown>; condition_number: number }> | null;

  if (eventMappings) {
    for (const mapping of Object.values(eventMappings)) {
      if (parsedEvent.event_type === mapping.event_type || parsedEvent.raw_event_type === mapping.event_type) {
        // Check event filters if any
        const filters = mapping.event_filter || {};
        const eventData = parsedEvent.data as Record<string, unknown> || {};
        const matchesFilter = Object.entries(filters).every(
          ([field, value]) => eventData[field] === value
        );

        if (matchesFilter) {
          conditionTriggered = mapping.condition_number;
          break;
        }
      }
    }
  }

  // Log the event
  const { data: crmEvent, error: eventError } = await supabase
    .from('crm_events')
    .insert({
      crm_integration_id: integrationId,
      event_type: parsedEvent.event_type,
      raw_payload: payload,
      recipient_id: recipientId,
      call_session_id: callSessionId,
      campaign_id: integration.campaign_id,
      matched,
      condition_triggered: conditionTriggered,
      processed: false,
    })
    .select()
    .single();

  if (eventError) {
    console.error('[CRM-WEBHOOK] Error logging event:', eventError);
  }

  // If condition should trigger and we have a match, complete the condition
  if (conditionTriggered && callSessionId && matched) {
    console.log(`[CRM-WEBHOOK] Triggering condition ${conditionTriggered} for call session ${callSessionId}`);

    const { data: conditionResult, error: conditionError } = await supabase.functions.invoke(
      'complete-condition',
      {
        body: {
          callSessionId,
          campaignId: integration.campaign_id,
          recipientId,
          conditionNumber: conditionTriggered,
          notes: `Auto-triggered by CRM event: ${parsedEvent.event_type}`,
        },
      }
    );

    if (conditionError) {
      console.error('[CRM-WEBHOOK] Error completing condition:', conditionError);
      await supabase
        .from('crm_events')
        .update({
          processed: false,
          error_message: conditionError.message,
        })
        .eq('id', crmEvent?.id);
    } else {
      console.log('[CRM-WEBHOOK] Condition completed:', conditionResult);
      await supabase
        .from('crm_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', crmEvent?.id);
    }
  } else if (matched && recipientId && integration.campaign_id) {
    // Evaluate general conditions even if no specific condition was mapped
    try {
      await supabase.functions.invoke('evaluate-conditions', {
        body: {
          recipientId,
          campaignId: integration.campaign_id,
          eventType: 'crm_event',
          metadata: {
            crm_event_type: parsedEvent.event_type,
            crm_event_id: crmEvent?.id,
          },
        },
      });
      console.log('[CRM-WEBHOOK] Triggered condition evaluation');
    } catch (evalError) {
      console.error('[CRM-WEBHOOK] Failed to evaluate conditions:', evalError);
    }
  }

  // Update last_event_at
  await supabase
    .from('crm_integrations')
    .update({ last_event_at: new Date().toISOString() })
    .eq('id', integrationId);

  // Log activity
  await activityLogger.api('webhook_received', 'success', {
    clientId: integration.client_id,
    campaignId: integration.campaign_id,
    recipientId: recipientId || undefined,
    description: `CRM webhook received from ${integration.crm_provider}: ${parsedEvent.event_type}`,
    metadata: {
      crm_event_id: crmEvent?.id,
      crm_provider: integration.crm_provider,
      event_type: parsedEvent.event_type,
      matched,
      condition_triggered: conditionTriggered,
    },
  });

  const responseData: CRMWebhookResponse = {
    event_id: crmEvent?.id,
    matched,
    condition_triggered: conditionTriggered,
    processed: !!conditionTriggered && matched,
  };

  return createWebhookResponse(responseData, {
    eventId: crmEvent?.id,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256, x-salesforce-signature',
    },
  });
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleCRMWebhook, {
  requireAuth: false, // Webhooks don't have user auth
  parseBody: false, // We handle payload parsing manually for signature verification
  auditAction: 'crm_webhook_received',
}));
