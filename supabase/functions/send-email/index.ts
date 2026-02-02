/**
 * Send Email Edge Function
 * 
 * Generic email sending endpoint that delegates to the shared email provider.
 * Use this for ad-hoc emails. For specific use cases, use the dedicated functions:
 * - send-gift-card-email
 * - send-verification-email
 * - send-user-invitation
 * - send-marketing-email
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { sendEmail, isValidEmail } from '../_shared/email-provider.ts';
import type { SendEmailParams, SendEmailResult } from '../_shared/email-provider.ts';

interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

interface SendEmailResponse extends SendEmailResult {
  note?: string;
}

async function handleSendEmail(
  request: SendEmailRequest,
  _context: unknown
): Promise<SendEmailResponse> {
  const { to, subject, html, text, from, fromName, replyTo, tags } = request;

  // Validate required fields
  if (!to) {
    throw new ApiError('Missing required field: to', 'VALIDATION_ERROR', 400);
  }
  if (!subject) {
    throw new ApiError('Missing required field: subject', 'VALIDATION_ERROR', 400);
  }
  if (!html && !text) {
    throw new ApiError('Either html or text content is required', 'VALIDATION_ERROR', 400);
  }

  // Validate email addresses
  const toAddresses = Array.isArray(to) ? to : [to];
  for (const email of toAddresses) {
    if (!isValidEmail(email)) {
      throw new ApiError(`Invalid email address: ${email}`, 'VALIDATION_ERROR', 400);
    }
  }

  // Send the email
  const params: SendEmailParams = {
    to: toAddresses,
    subject,
    html: html || `<pre>${text}</pre>`,
    text,
    from,
    fromName,
    replyTo,
    tags,
  };

  const result = await sendEmail(params);

  if (!result.success) {
    throw new ApiError(result.error || 'Failed to send email', 'EMAIL_ERROR', 500);
  }

  return result;
}

Deno.serve(withApiGateway(handleSendEmail, {
  requireAuth: false, // Can be called by other edge functions
  parseBody: true,
}));
