/**
 * Submit to Vendor Edge Function
 * 
 * Submits an approved campaign to the print vendor for production.
 * Creates print batches and updates campaign status.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface SubmitToVendorRequest {
  campaignId: string;
}

interface PrintBatch {
  id: string;
  batch_number: number;
}

interface SubmitToVendorResponse {
  success: boolean;
  batchCount: number;
  totalRecipients: number;
  batches: PrintBatch[];
  estimatedCompletion: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleSubmitToVendor(
  request: SubmitToVendorRequest,
  context: AuthContext
): Promise<SubmitToVendorResponse> {
  const { campaignId } = request;

  if (!campaignId) {
    throw new ApiError('Campaign ID is required', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('submit-to-vendor');

  console.log(`[SUBMIT-TO-VENDOR] Processing vendor submission for campaign: ${campaignId}`);

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*, client_id, audience_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new ApiError('Campaign not found', 'NOT_FOUND', 404);
  }

  // Validate campaign status
  if (campaign.status !== 'approved') {
    throw new ApiError('Campaign must be approved before submitting to vendor', 'VALIDATION_ERROR', 400);
  }

  // Get recipient count
  const { count: recipientCount, error: countError } = await supabase
    .from('recipients')
    .select('*', { count: 'exact', head: true })
    .eq('audience_id', campaign.audience_id);

  if (countError) {
    throw new ApiError('Failed to get recipient count', 'DATABASE_ERROR', 500);
  }

  const totalRecipients = recipientCount || 0;
  const batchSize = 10000;
  const batchCount = Math.ceil(totalRecipients / batchSize);

  console.log(`[SUBMIT-TO-VENDOR] Creating ${batchCount} batches for ${totalRecipients} recipients`);

  // Create print batches
  const batches: PrintBatch[] = [];
  for (let i = 0; i < batchCount; i++) {
    const batchRecipientCount = Math.min(batchSize, totalRecipients - (i * batchSize));

    const { data: batch, error: batchError } = await supabase
      .from('print_batches')
      .insert({
        campaign_id: campaignId,
        batch_number: i + 1,
        recipient_count: batchRecipientCount,
        vendor: 'Lob',
        status: 'pending',
        pdf_url: `https://mock-vendor.example.com/pdf/${campaignId}/batch-${i + 1}.pdf`,
      })
      .select()
      .single();

    if (batchError) {
      console.error('[SUBMIT-TO-VENDOR] Batch creation error:', batchError);
      continue;
    }

    batches.push({ id: batch.id, batch_number: batch.batch_number });

    // Simulate vendor API call
    console.log(`[SUBMIT-TO-VENDOR] Mock vendor API call for batch ${i + 1}:`, {
      batch_id: batch.id,
      campaign_id: campaignId,
      recipient_count: batchRecipientCount,
    });
  }

  // Update campaign status to in_production
  const { error: updateError } = await supabase
    .from('campaigns')
    .update({ status: 'in_production' })
    .eq('id', campaignId);

  if (updateError) {
    console.error('[SUBMIT-TO-VENDOR] Campaign update error:', updateError);
  }

  // Calculate estimated completion (3-5 business days)
  const estimatedDays = Math.floor(Math.random() * 3) + 3;
  const estimatedCompletion = new Date();
  estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

  console.log(`[SUBMIT-TO-VENDOR] Successfully submitted campaign ${campaignId} to vendor`);

  // Log activity
  await activityLogger.campaign('campaign_submitted_to_vendor', 'success', {
    userId: context.user.id,
    campaignId,
    clientId: campaign.client_id,
    description: `Campaign submitted to vendor with ${batchCount} batches`,
    metadata: {
      total_recipients: totalRecipients,
      batch_count: batchCount,
      vendor: 'Lob',
    },
  });

  return {
    success: true,
    batchCount: batches.length,
    totalRecipients,
    batches,
    estimatedCompletion: estimatedCompletion.toISOString(),
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleSubmitToVendor, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'submit_to_vendor',
}));
