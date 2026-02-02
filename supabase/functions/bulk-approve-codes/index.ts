/**
 * Bulk Approve Codes Edge Function
 * 
 * Approves or rejects multiple recipient codes at once.
 * Admin/call center only.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface BulkApproveRequest {
  recipientIds: string[];
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

interface BulkApproveResponse {
  success: boolean;
  successCount: number;
  failedCount: number;
  action: string;
  message: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleBulkApproveCodes(
  request: BulkApproveRequest,
  context: AuthContext
): Promise<BulkApproveResponse> {
  const { recipientIds, action, rejectionReason } = request;

  if (!recipientIds || recipientIds.length === 0) {
    throw new ApiError('No recipient IDs provided', 'VALIDATION_ERROR', 400);
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    throw new ApiError('Invalid action. Must be "approve" or "reject"', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('bulk-approve-codes');

  console.log(`[BULK-APPROVE] Processing bulk ${action} for ${recipientIds.length} codes by user ${context.user.id}`);

  // Update all recipients
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const { data: updatedRecipients, error: updateError } = await supabase
    .from('recipients')
    .update({
      status: newStatus,
      approved_at: action === 'approve' ? new Date().toISOString() : null,
      approved_by_user_id: context.user.id,
      rejection_reason: action === 'reject' ? rejectionReason : null,
    })
    .in('id', recipientIds)
    .select();

  if (updateError) {
    console.error('[BULK-APPROVE] Update error:', updateError);
    throw new ApiError('Failed to update recipients', 'DATABASE_ERROR', 500);
  }

  const successCount = updatedRecipients?.length || 0;
  const failedCount = recipientIds.length - successCount;

  // Log bulk action in audit log for each recipient
  const auditLogs = recipientIds.map((recipientId) => ({
    recipient_id: recipientId,
    action: action === 'approve' ? 'approved' : 'rejected',
    performed_by_user_id: context.user.id,
    metadata: {
      bulk_action: true,
      total_in_batch: recipientIds.length,
      rejection_reason: action === 'reject' ? rejectionReason : undefined,
    },
  }));

  const { error: auditError } = await supabase
    .from('recipient_audit_log')
    .insert(auditLogs);

  if (auditError) {
    console.error('[BULK-APPROVE] Audit log error:', auditError);
    // Don't fail the request
  }

  console.log(`[BULK-APPROVE] Completed: ${successCount} success, ${failedCount} failed`);

  // Log activity
  await activityLogger.giftCard(
    action === 'approve' ? 'card_assigned' : 'card_cancelled',
    successCount > 0 ? 'success' : 'failed',
    {
      userId: context.user.id,
      description: `Bulk ${action}: ${successCount} codes ${action === 'approve' ? 'approved' : 'rejected'}`,
      metadata: {
        action,
        success_count: successCount,
        failed_count: failedCount,
        total_requested: recipientIds.length,
        rejection_reason: action === 'reject' ? rejectionReason : undefined,
      },
    }
  );

  return {
    success: true,
    successCount,
    failedCount,
    action,
    message: `${action === 'approve' ? 'Approved' : 'Rejected'} ${successCount} codes`,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleBulkApproveCodes, {
  requireAuth: true,
  requiredRole: ['admin', 'call_center', 'company_owner'],
  parseBody: true,
  auditAction: 'bulk_approve_codes',
}));
