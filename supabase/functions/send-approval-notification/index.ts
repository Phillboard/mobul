/**
 * Send Approval Notification Edge Function
 * 
 * Sends email notifications when a campaign is approved, rejected, or changes requested.
 * Uses the shared email provider and templates.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendEmail } from '../_shared/email-provider.ts';
import { buildApprovalNotificationHtml } from '../_shared/email-templates.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface ApprovalNotificationRequest {
  approvalId: string;
  action: 'approved' | 'rejected' | 'changes_requested';
  notes?: string;
}

interface ApprovalNotificationResponse {
  success: boolean;
  notificationSent: boolean;
  recipientEmail?: string;
  error?: string;
}

async function handleSendApprovalNotification(
  request: ApprovalNotificationRequest,
  context: AuthContext,
  rawRequest: Request
): Promise<ApprovalNotificationResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('send-approval-notification', rawRequest);

  const { approvalId, action, notes } = request;

  // Validate required fields
  if (!approvalId) {
    throw new ApiError('approvalId is required', 'VALIDATION_ERROR', 400);
  }
  if (!action || !['approved', 'rejected', 'changes_requested'].includes(action)) {
    throw new ApiError('Valid action is required (approved, rejected, changes_requested)', 'VALIDATION_ERROR', 400);
  }

  console.log(`[APPROVAL-NOTIFICATION] Processing: ${approvalId} - ${action}`);

  // Get approval details with campaign and approver info
  const { data: approval, error: approvalError } = await supabase
    .from('campaign_approvals')
    .select(`
      *,
      campaign:campaigns(id, name, created_by_user_id, client_id),
      approver:profiles!campaign_approvals_user_id_fkey(full_name, email)
    `)
    .eq('id', approvalId)
    .single();

  if (approvalError || !approval) {
    throw new ApiError(
      `Approval not found: ${approvalError?.message || 'Unknown error'}`,
      'NOT_FOUND',
      404
    );
  }

  // Get campaign owner profile
  const { data: ownerProfile, error: ownerError } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', approval.campaign.created_by_user_id)
    .single();

  if (ownerError || !ownerProfile?.email) {
    throw new ApiError(
      'Campaign owner not found or has no email',
      'NOT_FOUND',
      404
    );
  }

  // Get campaign URL
  const appUrl = Deno.env.get('APP_URL') || '';
  const campaignUrl = appUrl ? `${appUrl}/campaigns/${approval.campaign.id}` : undefined;

  // Build email HTML using shared template
  const emailHtml = buildApprovalNotificationHtml({
    campaignName: approval.campaign.name,
    approverName: approval.approver?.full_name || approval.approver?.email || 'A reviewer',
    action,
    notes,
    campaignUrl,
  });

  const actionDisplay = action.replace('_', ' ');

  // Send email
  const emailResult = await sendEmail({
    to: ownerProfile.email,
    subject: `Campaign ${actionDisplay}: ${approval.campaign.name}`,
    html: emailHtml,
  });

  if (!emailResult.success) {
    console.error(`[APPROVAL-NOTIFICATION] Email failed: ${emailResult.error}`);
    
    // Log failure but don't throw - the notification intent was recorded
    await activityLogger.campaign('campaign_updated', 'failed',
      `Approval notification email failed to ${ownerProfile.email}: ${emailResult.error}`,
      {
        userId: context.user.id,
        campaignId: approval.campaign.id,
        clientId: approval.campaign.client_id,
        metadata: {
          approval_id: approvalId,
          action,
          error: emailResult.error,
        },
      }
    );

    return {
      success: true, // The approval action succeeded, just email failed
      notificationSent: false,
      recipientEmail: ownerProfile.email,
      error: emailResult.error,
    };
  }

  console.log(`[APPROVAL-NOTIFICATION] Sent to ${ownerProfile.email}`);

  // Log success
  await activityLogger.campaign('campaign_updated', 'success',
    `Approval notification sent: ${approval.campaign.name} ${actionDisplay} by ${approval.approver?.full_name}`,
    {
      userId: context.user.id,
      campaignId: approval.campaign.id,
      clientId: approval.campaign.client_id,
      metadata: {
        approval_id: approvalId,
        action,
        recipient_email: ownerProfile.email,
        email_id: emailResult.messageId,
      },
    }
  );

  return {
    success: true,
    notificationSent: true,
    recipientEmail: ownerProfile.email,
  };
}

Deno.serve(withApiGateway(handleSendApprovalNotification, {
  requireAuth: true,
  parseBody: true,
}));
