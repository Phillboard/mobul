/**
 * Send Comment Notification Edge Function
 * 
 * Sends email notifications when someone comments on a campaign or mentions a user.
 * Uses the shared email provider and templates.
 */

import { withApiGateway, ApiError, AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendEmail } from '../_shared/email-provider.ts';
import { buildCommentNotificationHtml } from '../_shared/email-templates.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface CommentNotificationRequest {
  campaignId: string;
  comment: string;
  mentions?: string[]; // Array of usernames or emails mentioned with @
}

interface CommentNotificationResponse {
  success: boolean;
  notificationsSent: number;
  recipients?: string[];
  errors?: string[];
}

async function handleSendCommentNotification(
  request: CommentNotificationRequest,
  context: AuthContext,
  rawRequest: Request
): Promise<CommentNotificationResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('send-comment-notification', rawRequest);

  const { campaignId, comment, mentions = [] } = request;

  // Validate required fields
  if (!campaignId) {
    throw new ApiError('campaignId is required', 'VALIDATION_ERROR', 400);
  }
  if (!comment) {
    throw new ApiError('comment is required', 'VALIDATION_ERROR', 400);
  }

  console.log(`[COMMENT-NOTIFICATION] Processing for campaign ${campaignId}`);

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, name, created_by_user_id, client_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new ApiError(
      `Campaign not found: ${campaignError?.message || 'Unknown error'}`,
      'NOT_FOUND',
      404
    );
  }

  // Get commenter profile
  const { data: commenter, error: commenterError } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', context.user.id)
    .single();

  if (commenterError || !commenter) {
    throw new ApiError('Commenter profile not found', 'NOT_FOUND', 404);
  }

  // Collect recipients
  const recipientsToNotify: Array<{ email: string; isMention: boolean }> = [];

  // Always notify campaign owner (unless they're the commenter)
  if (campaign.created_by_user_id !== context.user.id) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', campaign.created_by_user_id)
      .single();

    if (owner?.email) {
      recipientsToNotify.push({ email: owner.email, isMention: false });
    }
  }

  // Process @mentions
  if (mentions.length > 0) {
    // Clean mention strings (remove @ prefix)
    const cleanMentions = mentions.map(m => m.replace('@', '').toLowerCase());

    // Look up users by email or username
    const { data: mentionedUsers } = await supabase
      .from('profiles')
      .select('id, email')
      .or(
        cleanMentions.map(m => `email.ilike.%${m}%`).join(',')
      );

    if (mentionedUsers) {
      for (const user of mentionedUsers) {
        // Don't notify the commenter
        if (user.id !== context.user.id && user.email) {
          // Check if already in list
          if (!recipientsToNotify.some(r => r.email === user.email)) {
            recipientsToNotify.push({ email: user.email, isMention: true });
          } else {
            // Update existing to mark as mention
            const existing = recipientsToNotify.find(r => r.email === user.email);
            if (existing) existing.isMention = true;
          }
        }
      }
    }
  }

  if (recipientsToNotify.length === 0) {
    console.log('[COMMENT-NOTIFICATION] No recipients to notify');
    return {
      success: true,
      notificationsSent: 0,
      recipients: [],
    };
  }

  // Get campaign URL
  const appUrl = Deno.env.get('APP_URL') || '';
  const campaignUrl = appUrl ? `${appUrl}/campaigns/${campaign.id}` : undefined;

  // Send emails
  const sentRecipients: string[] = [];
  const errors: string[] = [];

  for (const recipient of recipientsToNotify) {
    // Build email HTML
    const emailHtml = buildCommentNotificationHtml({
      campaignName: campaign.name,
      commenterName: commenter.full_name || commenter.email,
      comment,
      campaignUrl,
      isMention: recipient.isMention,
    });

    const subject = recipient.isMention
      ? `${commenter.full_name || commenter.email} mentioned you in "${campaign.name}"`
      : `New comment on "${campaign.name}"`;

    const result = await sendEmail({
      to: recipient.email,
      subject,
      html: emailHtml,
    });

    if (result.success) {
      sentRecipients.push(recipient.email);
    } else {
      errors.push(`${recipient.email}: ${result.error}`);
    }
  }

  console.log(`[COMMENT-NOTIFICATION] Sent ${sentRecipients.length}/${recipientsToNotify.length} notifications`);

  // Log activity
  await activityLogger.campaign('campaign_updated', 'success',
    `Comment notification sent to ${sentRecipients.length} recipient(s)`,
    {
      userId: context.user.id,
      campaignId: campaign.id,
      clientId: campaign.client_id,
      metadata: {
        recipients_count: sentRecipients.length,
        mentions_count: mentions.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    }
  );

  return {
    success: true,
    notificationsSent: sentRecipients.length,
    recipients: sentRecipients,
    errors: errors.length > 0 ? errors : undefined,
  };
}

Deno.serve(withApiGateway(handleSendCommentNotification, {
  requireAuth: true,
  parseBody: true,
}));
