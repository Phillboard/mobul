/**
 * Send Marketing Email Edge Function
 * 
 * Sends individual marketing emails with merge tag support.
 * Uses the shared email provider for consistent delivery.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendEmail, renderMergeTags, isValidEmail } from '../_shared/email-provider.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface MarketingEmailRequest {
  campaignId: string;
  messageId: string;
  contactId?: string;
  email: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  mergeData?: Record<string, unknown>;
}

interface MarketingEmailResponse {
  success: boolean;
  sendId?: string;
  messageId?: string;
  error?: string;
}

async function handleSendMarketingEmail(
  request: MarketingEmailRequest,
  _context: unknown,
  rawRequest: Request
): Promise<MarketingEmailResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('send-marketing-email', rawRequest);

  const { 
    campaignId, 
    messageId, 
    contactId, 
    email, 
    subject,
    bodyHtml,
    bodyText,
    mergeData = {} 
  } = request;

  // Validate required fields
  if (!campaignId || !messageId || !email || !subject) {
    throw new ApiError(
      'Missing required fields: campaignId, messageId, email, subject',
      'VALIDATION_ERROR',
      400
    );
  }

  if (!isValidEmail(email)) {
    throw new ApiError('Invalid email address', 'VALIDATION_ERROR', 400);
  }

  // Render merge tags
  const renderedSubject = renderMergeTags(subject, mergeData);
  const renderedHtml = bodyHtml ? renderMergeTags(bodyHtml, mergeData) : undefined;
  const renderedText = bodyText 
    ? renderMergeTags(bodyText, mergeData) 
    : renderedHtml?.replace(/<[^>]*>/g, '');

  // Create send record
  const { data: sendRecord, error: insertError } = await supabase
    .from('marketing_sends')
    .insert({
      campaign_id: campaignId,
      message_id: messageId,
      contact_id: contactId,
      message_type: 'email',
      recipient_email: email,
      status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    throw new ApiError(
      `Failed to create send record: ${insertError.message}`,
      'DATABASE_ERROR',
      500
    );
  }

  // Send email using shared provider
  const result = await sendEmail({
    to: email,
    subject: renderedSubject,
    html: renderedHtml || `<pre>${renderedText}</pre>`,
    text: renderedText,
    tags: {
      campaign_id: campaignId,
      message_id: messageId,
    },
  });

  // Update send record with result
  const updateData: Record<string, unknown> = {
    sent_at: new Date().toISOString(),
    provider_message_id: result.messageId,
    status: result.success ? 'sent' : 'failed',
  };

  if (!result.success) {
    updateData.error_message = result.error;
  }

  await supabase
    .from('marketing_sends')
    .update(updateData)
    .eq('id', sendRecord.id);

  console.log(`[MARKETING-EMAIL] ${email}: ${result.success ? 'sent' : 'failed'}`);

  // Log activity
  await activityLogger.communication(
    result.success ? 'sms_outbound' : 'sms_status_updated',
    result.success ? 'success' : 'failed',
    result.success 
      ? `Marketing email sent to ${email}` 
      : `Marketing email failed to ${email}: ${result.error}`,
    {
      campaignId,
      metadata: {
        send_id: sendRecord.id,
        message_id: result.messageId,
        email,
        subject: renderedSubject,
        error: result.error,
      },
    }
  );

  return {
    success: result.success,
    sendId: sendRecord.id,
    messageId: result.messageId,
    error: result.error,
  };
}

Deno.serve(withApiGateway(handleSendMarketingEmail, {
  requireAuth: false,
  parseBody: true,
}));
