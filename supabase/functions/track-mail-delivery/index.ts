/**
 * Track Mail Delivery Edge Function
 * 
 * Receives mail delivery events from mail provider webhooks.
 * Updates recipient status and triggers campaign conditions.
 * 
 * Public webhook endpoint (receives callbacks from external mail providers).
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface MailDeliveryEvent {
  trackingCode: string;
  status: 'in_transit' | 'delivered' | 'returned';
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

interface TrackMailDeliveryResponse {
  success: boolean;
  recipientId: string;
  status: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleTrackMailDelivery(
  event: MailDeliveryEvent,
  _context: PublicContext
): Promise<TrackMailDeliveryResponse> {
  const { trackingCode, status, timestamp, metadata } = event;

  if (!trackingCode || !status) {
    throw new ApiError('Tracking code and status are required', 'VALIDATION_ERROR', 400);
  }

  console.log(`[TRACK-MAIL-DELIVERY] Processing event: ${status} for ${trackingCode}`);

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('track-mail-delivery');

  // Look up recipient by tracking code
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('id, audience_id, audiences(client_id)')
    .eq('token', trackingCode)
    .single();

  if (recipientError || !recipient) {
    console.error('[TRACK-MAIL-DELIVERY] Recipient lookup failed:', recipientError);
    throw new ApiError('Invalid tracking code', 'NOT_FOUND', 404);
  }

  // Find the campaign associated with this recipient
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('audience_id', recipient.audience_id)
    .single();

  if (campaignError || !campaign) {
    throw new ApiError('Campaign not found', 'NOT_FOUND', 404);
  }

  // Update recipient delivery status
  const { error: updateError } = await supabase
    .from('recipients')
    .update({ delivery_status: status })
    .eq('id', recipient.id);

  if (updateError) {
    console.error('[TRACK-MAIL-DELIVERY] Failed to update recipient:', updateError);
    throw new ApiError('Failed to update delivery status', 'DATABASE_ERROR', 500);
  }

  // Log delivery event
  await supabase.from('events').insert({
    campaign_id: campaign.id,
    recipient_id: recipient.id,
    event_type: `mail_${status}`,
    source: 'mail_tracking',
    event_data_json: metadata || {},
    occurred_at: timestamp || new Date().toISOString(),
  });

  console.log(`[TRACK-MAIL-DELIVERY] Logged mail_${status} event for recipient ${recipient.id}`);

  // Log activity
  const eventType = status === 'delivered' ? 'mail_delivered' :
                    status === 'returned' ? 'mail_returned' : 'mail_sent';
  await activityLogger.campaign(eventType, 'success', {
    recipientId: recipient.id,
    campaignId: campaign.id,
    clientId: (recipient.audiences as { client_id?: string })?.client_id,
    description: `Mail ${status}: ${trackingCode}`,
    metadata: {
      tracking_code: trackingCode,
      status,
      ...metadata,
    },
  });

  // If delivered, evaluate campaign conditions
  if (status === 'delivered') {
    try {
      await supabase.functions.invoke('evaluate-conditions', {
        body: {
          recipientId: recipient.id,
          campaignId: campaign.id,
          eventType: 'mail_delivered',
          metadata: metadata || {},
        },
      });
      console.log('[TRACK-MAIL-DELIVERY] Triggered condition evaluation for mail delivery');
    } catch (evalError) {
      console.error('[TRACK-MAIL-DELIVERY] Failed to evaluate conditions:', evalError);
      // Don't fail the request
    }
  }

  return {
    success: true,
    recipientId: recipient.id,
    status,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleTrackMailDelivery, {
  requireAuth: false, // Webhook endpoint
  parseBody: true,
  auditAction: 'track_mail_delivery',
}));
