/**
 * Approve Customer Code Edge Function
 * 
 * Approves or rejects a recipient's redemption code.
 * Used by call center agents to verify customers.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

// ============================================================================
// Types
// ============================================================================

interface ApproveCodeRequest {
  recipientId?: string;
  redemptionCode?: string;
  action: 'approve' | 'reject';
  callSessionId?: string;
  notes?: string;
  rejectionReason?: string;
}

interface ApproveCodeResponse {
  success: boolean;
  action: string;
  recipient: {
    id: string;
    redemption_code: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    approval_status: string;
    approved_at: string;
  };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleApproveCustomerCode(
  request: ApproveCodeRequest,
  context: AuthContext
): Promise<ApproveCodeResponse> {
  const { recipientId, redemptionCode, action, callSessionId, notes, rejectionReason } = request;

  if (!recipientId && !redemptionCode) {
    throw new ApiError('Either recipientId or redemptionCode is required', 'VALIDATION_ERROR', 400);
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    throw new ApiError('Invalid action. Must be "approve" or "reject"', 'VALIDATION_ERROR', 400);
  }

  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('approve-customer-code');

  // Look up recipient
  let query = supabase
    .from('recipients')
    .select(`
      *,
      audience:audiences(id, client_id, name),
      call_session:call_sessions(id, campaign_id)
    `);

  if (recipientId) {
    query = query.eq('id', recipientId);
  } else {
    query = query.eq('redemption_code', redemptionCode!.toUpperCase());
  }

  const { data: recipient, error: recipientError } = await query.single();

  if (recipientError || !recipient) {
    throw new ApiError('Recipient not found', 'NOT_FOUND', 404);
  }

  // Verify user has access to this client
  const { data: hasAccess } = await supabase
    .rpc('user_can_access_client', {
      _user_id: context.user.id,
      _client_id: recipient.audience.client_id,
    });

  if (!hasAccess) {
    throw new ApiError('Unauthorized to approve codes for this client', 'FORBIDDEN', 403);
  }

  // Check if already processed
  if (recipient.approval_status === 'redeemed') {
    throw new ApiError('This code has already been redeemed and cannot be modified', 'VALIDATION_ERROR', 400);
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    approved_by_user_id: context.user.id,
    approved_at: now,
    approved_call_session_id: callSessionId,
  };

  if (action === 'approve') {
    updateData.approval_status = 'approved';
    updateData.rejection_reason = null;
  } else {
    updateData.approval_status = 'rejected';
    updateData.rejection_reason = rejectionReason || 'No reason provided';
  }

  // Update recipient
  const { error: updateError } = await supabase
    .from('recipients')
    .update(updateData)
    .eq('id', recipient.id);

  if (updateError) {
    throw new ApiError('Failed to update approval status', 'DATABASE_ERROR', 500);
  }

  // Log the action in audit log
  await supabase.from('recipient_audit_log').insert({
    recipient_id: recipient.id,
    action: action === 'approve' ? 'approved' : 'rejected',
    performed_by_user_id: context.user.id,
    call_session_id: callSessionId,
    metadata: {
      notes,
      rejectionReason: action === 'reject' ? rejectionReason : null,
      previousStatus: recipient.approval_status,
    },
  });

  // If approved, optionally send SMS with redemption link
  if (action === 'approve' && recipient.phone) {
    const campaignId = recipient.call_session?.campaign_id || recipient.audience_id;
    const appUrl = Deno.env.get('PUBLIC_APP_URL') ||
      Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') ||
      'https://app.mobilace.com';
    const redemptionUrl = `${appUrl}/redeem-gift-card?code=${recipient.redemption_code}&campaign=${campaignId}`;

    // Queue SMS notification (async, don't block)
    supabase.functions.invoke('send-gift-card-sms', {
      body: {
        phone: recipient.phone,
        message: `Your gift card code has been activated! Redeem it here: ${redemptionUrl}`,
        recipientId: recipient.id,
        campaignId,
      },
    }).catch(err => console.error('[APPROVE-CODE] Failed to send SMS:', err));
  }

  console.log(`[APPROVE-CODE] Code ${action}d:`, {
    recipientId: recipient.id,
    code: recipient.redemption_code,
    by: context.user.id,
  });

  // Log activity
  await activityLogger.giftCard(
    action === 'approve' ? 'card_assigned' : 'card_cancelled',
    action === 'approve' ? 'success' : 'cancelled',
    {
      userId: context.user.id,
      recipientId: recipient.id,
      clientId: recipient.audience?.client_id,
      description: action === 'approve'
        ? 'Recipient code approved by agent'
        : `Recipient code rejected: ${rejectionReason || 'No reason'}`,
      metadata: {
        redemption_code: recipient.redemption_code,
        action,
        call_session_id: callSessionId,
        notes,
        rejection_reason: action === 'reject' ? rejectionReason : undefined,
      },
    }
  );

  return {
    success: true,
    action,
    recipient: {
      id: recipient.id,
      redemption_code: recipient.redemption_code,
      first_name: recipient.first_name,
      last_name: recipient.last_name,
      phone: recipient.phone,
      email: recipient.email,
      approval_status: String(updateData.approval_status),
      approved_at: now,
    },
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleApproveCustomerCode, {
  requireAuth: true,
  parseBody: true,
  auditAction: 'approve_customer_code',
}));
