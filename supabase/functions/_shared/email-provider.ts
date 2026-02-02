/**
 * Email Provider Abstraction Layer
 * 
 * Unified interface for sending emails with automatic provider selection.
 * Similar pattern to sms-provider.ts but for email.
 * 
 * Supports:
 * - Resend (primary)
 * - SendGrid (fallback)
 * - AWS SES (fallback)
 * 
 * Configuration is loaded from environment variables with optional
 * organization-specific overrides from the database.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createServiceClient } from './supabase.ts';

// ============================================================================
// Types
// ============================================================================

export type EmailProvider = 'resend' | 'sendgrid' | 'ses' | 'mock';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  error?: string;
}

export interface EmailProviderSettings {
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

// ============================================================================
// Provider Detection
// ============================================================================

/**
 * Get email provider settings from environment
 * Falls back to mock mode if no API key is configured
 */
export function getEmailProviderSettings(organizationId?: string): EmailProviderSettings {
  const provider = (Deno.env.get('EMAIL_PROVIDER') || 'resend') as EmailProvider;
  const apiKey = Deno.env.get('EMAIL_API_KEY') || 
                 Deno.env.get('RESEND_API_KEY') || 
                 Deno.env.get('SENDGRID_API_KEY') || '';
  
  const fromEmail = Deno.env.get('EMAIL_FROM') || 
                    Deno.env.get('FROM_EMAIL') || 
                    'noreply@mobul.com';
  
  const fromName = Deno.env.get('EMAIL_FROM_NAME') || 
                   Deno.env.get('FROM_NAME') || 
                   'Mobul';
  
  const replyTo = Deno.env.get('EMAIL_REPLY_TO');

  // If no API key, use mock mode
  if (!apiKey) {
    console.warn('[EMAIL-PROVIDER] No API key configured - using mock mode');
    return {
      provider: 'mock',
      apiKey: '',
      fromEmail,
      fromName,
      replyTo,
    };
  }

  return {
    provider,
    apiKey,
    fromEmail,
    fromName,
    replyTo,
  };
}

// ============================================================================
// Provider Implementations
// ============================================================================

/**
 * Send email via Resend API
 */
async function sendViaResend(
  params: SendEmailParams,
  settings: EmailProviderSettings
): Promise<SendEmailResult> {
  const fromAddress = params.from || settings.fromEmail;
  const fromName = params.fromName || settings.fromName;
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: toAddresses,
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo || settings.replyTo,
        tags: params.tags ? Object.entries(params.tags).map(([name, value]) => ({ name, value })) : undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        provider: 'resend',
        error: data.message || data.error || `Resend API error (${response.status})`,
      };
    }

    return {
      success: true,
      messageId: data.id,
      provider: 'resend',
    };
  } catch (error) {
    return {
      success: false,
      provider: 'resend',
      error: error instanceof Error ? error.message : 'Unknown Resend error',
    };
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(
  params: SendEmailParams,
  settings: EmailProviderSettings
): Promise<SendEmailResult> {
  const fromAddress = params.from || settings.fromEmail;
  const fromName = params.fromName || settings.fromName;
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: toAddresses.map(email => ({ email })),
        }],
        from: { email: fromAddress, name: fromName },
        subject: params.subject,
        content: [
          ...(params.html ? [{ type: 'text/html', value: params.html }] : []),
          ...(params.text ? [{ type: 'text/plain', value: params.text }] : []),
        ],
        reply_to: params.replyTo || settings.replyTo ? { email: params.replyTo || settings.replyTo } : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        provider: 'sendgrid',
        error: errorData.errors?.[0]?.message || `SendGrid API error (${response.status})`,
      };
    }

    return {
      success: true,
      messageId: response.headers.get('x-message-id') || undefined,
      provider: 'sendgrid',
    };
  } catch (error) {
    return {
      success: false,
      provider: 'sendgrid',
      error: error instanceof Error ? error.message : 'Unknown SendGrid error',
    };
  }
}

/**
 * Send email via AWS SES
 * Note: This is a basic implementation. For production, consider using AWS SDK.
 */
async function sendViaSES(
  params: SendEmailParams,
  settings: EmailProviderSettings
): Promise<SendEmailResult> {
  // AWS SES requires more complex authentication (AWS Signature V4)
  // This is a placeholder for future implementation
  return {
    success: false,
    provider: 'ses',
    error: 'AWS SES not yet implemented. Please use Resend or SendGrid.',
  };
}

/**
 * Mock send for development/testing
 */
function sendViaMock(params: SendEmailParams): SendEmailResult {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
  
  console.log('[EMAIL-MOCK] Would send email:', {
    to: toAddresses,
    subject: params.subject,
    preview: params.html?.substring(0, 100) + '...',
  });

  return {
    success: true,
    messageId: `mock-${crypto.randomUUID()}`,
    provider: 'mock',
  };
}

// ============================================================================
// Main Send Function
// ============================================================================

/**
 * Send an email using the configured provider
 * 
 * @param params - Email parameters
 * @param organizationId - Optional organization ID for org-specific settings
 * @returns SendEmailResult with success status and message ID
 * 
 * @example
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to our platform</h1>',
 * });
 */
export async function sendEmail(
  params: SendEmailParams,
  organizationId?: string
): Promise<SendEmailResult> {
  const settings = getEmailProviderSettings(organizationId);
  
  console.log(`[EMAIL-PROVIDER] Sending via ${settings.provider} to ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`);

  let result: SendEmailResult;

  switch (settings.provider) {
    case 'resend':
      result = await sendViaResend(params, settings);
      break;
    case 'sendgrid':
      result = await sendViaSendGrid(params, settings);
      break;
    case 'ses':
      result = await sendViaSES(params, settings);
      break;
    case 'mock':
    default:
      result = sendViaMock(params);
      break;
  }

  if (result.success) {
    console.log(`[EMAIL-PROVIDER] Success via ${result.provider}: ${result.messageId}`);
  } else {
    console.error(`[EMAIL-PROVIDER] Failed via ${result.provider}: ${result.error}`);
  }

  return result;
}

/**
 * Send an email with Supabase client for logging
 * Logs the email delivery to the email_delivery_logs table
 */
export async function sendEmailWithLogging(
  supabase: SupabaseClient,
  params: SendEmailParams & {
    templateName?: string;
    recipientId?: string;
    campaignId?: string;
    clientId?: string;
    giftCardId?: string;
    metadata?: Record<string, unknown>;
  },
  organizationId?: string
): Promise<SendEmailResult> {
  const result = await sendEmail(params, organizationId);

  // Log to email_delivery_logs table
  try {
    await supabase.from('email_delivery_logs').insert({
      recipient_email: Array.isArray(params.to) ? params.to[0] : params.to,
      subject: params.subject,
      template_name: params.templateName || 'generic',
      delivery_status: result.success ? 'sent' : 'failed',
      provider_message_id: result.messageId,
      error_message: result.error,
      recipient_id: params.recipientId,
      campaign_id: params.campaignId,
      client_id: params.clientId,
      gift_card_id: params.giftCardId,
      email_body_html: params.html,
      metadata_json: {
        provider: result.provider,
        ...params.metadata,
      },
    });
  } catch (logError) {
    console.error('[EMAIL-PROVIDER] Failed to log email delivery:', logError);
  }

  return result;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate an email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Render merge tags in a template string
 * Replaces {{variable}} with corresponding values
 * 
 * @example
 * renderMergeTags('Hello {{name}}!', { name: 'John' }) // 'Hello John!'
 */
export function renderMergeTags(
  template: string,
  variables: Record<string, unknown>
): string {
  let rendered = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(value ?? ''));
  });
  
  // Remove any unmatched merge tags
  rendered = rendered.replace(/{{[^}]+}}/g, '');
  
  return rendered;
}

/**
 * Strip HTML tags from a string to create plain text version
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// Exports
// ============================================================================

export default {
  sendEmail,
  sendEmailWithLogging,
  getEmailProviderSettings,
  isValidEmail,
  renderMergeTags,
  stripHtml,
};
