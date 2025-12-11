/**
 * Email Service
 * 
 * Centralized email sending functionality
 * Supports multiple providers: Resend, SendGrid, AWS SES
 */

import { supabase } from '@core/services/supabase';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface GiftCardEmailOptions {
  recipientEmail: string;
  recipientName: string;
  giftCardCode: string;
  giftCardValue: number;
  brandName: string;
  expirationDate?: string;
  redemptionInstructions?: string;
}

/**
 * Send email via edge function
 * Uses configured email provider (Resend, SendGrid, or AWS SES)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: options,
    });

    if (error) {
      throw new Error(error.message || 'Failed to send email');
    }

    return {
      success: true,
      messageId: data?.messageId,
    };
  } catch (error: any) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Send gift card via email
 * Uses templated email with card details
 */
export async function sendGiftCardEmail(options: GiftCardEmailOptions): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .card-details { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .code { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; text-align: center; padding: 15px; background: #f3f4f6; border-radius: 6px; margin: 15px 0; }
        .value { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎁 You've Received a Gift Card!</h1>
      </div>
      <div class="content">
        <p>Hi ${options.recipientName},</p>
        <p>Congratulations! You've received a <strong>${options.brandName}</strong> gift card!</p>
        
        <div class="card-details">
          <div class="value">$${options.giftCardValue}</div>
          <p style="text-align: center; color: #6b7280;">Gift Card Value</p>
          
          <p style="margin-top: 20px;"><strong>Your Gift Card Code:</strong></p>
          <div class="code">${options.giftCardCode}</div>
          
          ${options.expirationDate ? `<p style="text-align: center; color: #6b7280; font-size: 14px;">Expires: ${options.expirationDate}</p>` : ''}
        </div>

        ${options.redemptionInstructions ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>How to Redeem:</strong></p>
            <p style="margin: 5px 0 0 0;">${options.redemptionInstructions}</p>
          </div>
        ` : ''}

        <p>Save this email for your records or add the gift card to your mobile wallet for easy access.</p>
      </div>
      <div class="footer">
        <p>This gift card was sent as part of a promotional campaign.</p>
        <p>If you have any questions, please contact support.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: options.recipientEmail,
    subject: `Your $${options.giftCardValue} ${options.brandName} Gift Card`,
    html,
    from: 'rewards@your-domain.com', // Configure in environment
  });
}

/**
 * Send test email
 * Used for testing email configuration
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  return await sendEmail({
    to,
    subject: 'Test Email from ACE Engage',
    html: '<h1>Test Email</h1><p>If you received this, your email configuration is working correctly!</p>',
    text: 'Test Email - If you received this, your email configuration is working correctly!',
  });
}

