/**
 * Send Verification Email Edge Function
 * 
 * Sends a verification email with a link for recipients to verify their identity.
 * Alternative to SMS opt-in for customers who prefer email.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendEmail, isValidEmail } from '../_shared/email-provider.ts';
import { buildVerificationEmailHtml } from '../_shared/email-templates.ts';

interface VerificationEmailRequest {
  recipient_id: string;
  campaign_id: string;
  email: string;
  client_name?: string;
  recipient_name?: string;
}

interface VerificationEmailResponse {
  success: boolean;
  message: string;
  email: string;
  expires_at: string;
}

async function handleSendVerificationEmail(
  request: VerificationEmailRequest,
  _context: unknown
): Promise<VerificationEmailResponse> {
  const supabase = createServiceClient();

  const { recipient_id, campaign_id, email, client_name, recipient_name } = request;

  // Validate required fields
  if (!recipient_id) {
    throw new ApiError('recipient_id is required', 'VALIDATION_ERROR', 400);
  }
  if (!campaign_id) {
    throw new ApiError('campaign_id is required', 'VALIDATION_ERROR', 400);
  }
  if (!email) {
    throw new ApiError('email is required', 'VALIDATION_ERROR', 400);
  }
  if (!isValidEmail(email)) {
    throw new ApiError('Invalid email format', 'VALIDATION_ERROR', 400);
  }

  console.log(`[VERIFICATION-EMAIL] Sending to ${email} for recipient ${recipient_id}`);

  // Generate verification token
  const verificationToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  // Build verification link
  const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '') || '';
  const verificationLink = `${appUrl}/verify-email?token=${encodeURIComponent(verificationToken)}&recipient=${encodeURIComponent(recipient_id)}`;

  // Update recipient with verification token
  const { error: updateError } = await supabase
    .from('recipients')
    .update({
      email_verification_token: verificationToken,
      email_verification_sent_at: new Date().toISOString(),
      verification_method: 'email',
    })
    .eq('id', recipient_id);

  if (updateError) {
    console.error('[VERIFICATION-EMAIL] Failed to update recipient:', updateError);
    throw new ApiError('Failed to save verification token', 'DATABASE_ERROR', 500);
  }

  // Build email HTML using shared template
  const emailHtml = buildVerificationEmailHtml({
    recipientName: recipient_name,
    verificationLink,
    clientName: client_name,
    expiresIn: '24 hours',
  });

  // Send email using shared provider
  const result = await sendEmail({
    to: email,
    subject: `Verify Your Email - ${client_name || 'Gift Card Reward'}`,
    html: emailHtml,
  });

  if (!result.success) {
    throw new ApiError(
      result.error || 'Failed to send verification email',
      'EMAIL_ERROR',
      500
    );
  }

  console.log(`[VERIFICATION-EMAIL] Sent successfully to ${email}`);

  return {
    success: true,
    message: 'Verification email sent',
    email,
    expires_at: expiresAt,
  };
}

Deno.serve(withApiGateway(handleSendVerificationEmail, {
  requireAuth: false,
  parseBody: true,
}));
