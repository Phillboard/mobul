/**
 * Email Templates
 * 
 * Centralized HTML email templates for all notification types.
 * Each template returns a complete HTML email string.
 * 
 * Design System:
 * - Primary gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
 * - Border radius: 8px for cards, 6px for buttons
 * - Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
 */

// ============================================================================
// Base Styles
// ============================================================================

const BASE_STYLES = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  primaryColor: '#667eea',
  successColor: '#28a745',
  warningColor: '#ffc107',
  textColor: '#333333',
  mutedColor: '#6c757d',
  bgColor: '#f5f5f5',
  cardBgColor: '#ffffff',
  borderColor: '#e9ecef',
};

/**
 * Base email wrapper with consistent styling
 */
function wrapEmailHtml(content: string, previewText?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${BASE_STYLES.fontFamily}; background-color: ${BASE_STYLES.bgColor};">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}
  <div style="max-width: 600px; margin: 0 auto; background-color: ${BASE_STYLES.cardBgColor};">
    ${content}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Standard email header with gradient
 */
function buildHeader(title: string, logoUrl?: string, logoAlt?: string): string {
  return `
<div style="background: ${BASE_STYLES.primaryGradient}; padding: 40px 20px; text-align: center;">
  ${logoUrl ? `<img src="${logoUrl}" alt="${logoAlt || 'Logo'}" style="max-width: 150px; margin-bottom: 20px;" />` : ''}
  <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0;">${title}</h1>
</div>
  `.trim();
}

/**
 * Standard email footer
 */
function buildFooter(companyName: string = 'Mobul'): string {
  return `
<div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid ${BASE_STYLES.borderColor};">
  <p style="color: ${BASE_STYLES.mutedColor}; font-size: 14px; margin: 5px 0;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  <p style="color: ${BASE_STYLES.mutedColor}; font-size: 14px; margin: 5px 0;">This is an automated message. Please do not reply directly to this email.</p>
</div>
  `.trim();
}

/**
 * Call-to-action button
 */
function buildButton(text: string, href: string, color: string = BASE_STYLES.primaryColor): string {
  return `
<a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${color}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
  ${text}
</a>
  `.trim();
}

// ============================================================================
// Gift Card Email Template
// ============================================================================

export interface GiftCardEmailParams {
  recipientName?: string;
  giftCardCode: string;
  giftCardValue: number;
  brandName: string;
  brandLogoUrl?: string;
  redemptionInstructions?: string;
  balanceCheckUrl?: string;
  clientName?: string;
  clientLogoUrl?: string;
}

/**
 * Build gift card delivery email HTML
 */
export function buildGiftCardEmailHtml(params: GiftCardEmailParams): string {
  const {
    recipientName,
    giftCardCode,
    giftCardValue,
    brandName,
    brandLogoUrl,
    redemptionInstructions,
    balanceCheckUrl,
    clientName = 'Mobul',
    clientLogoUrl,
  } = params;

  const greeting = recipientName ? `Dear ${recipientName}` : 'Hello';

  const content = `
${buildHeader(clientName, clientLogoUrl, clientName)}

<div style="padding: 40px 30px; color: ${BASE_STYLES.textColor}; line-height: 1.6;">
  <h2 style="color: #333; margin-top: 0;">🎁 Your Gift Card is Ready!</h2>
  
  <p style="font-size: 16px; color: #555;">
    ${greeting},<br><br>
    Congratulations! You've received a <strong>$${giftCardValue} ${brandName}</strong> gift card.
  </p>

  ${brandLogoUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <img src="${brandLogoUrl}" alt="${brandName}" style="max-width: 200px; height: auto;" />
    </div>
  ` : ''}

  <div style="background-color: #e9ecef; border: 2px dashed ${BASE_STYLES.primaryColor}; border-radius: 8px; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: ${BASE_STYLES.primaryColor}; letter-spacing: 2px; margin: 20px 0;">
    ${giftCardCode}
  </div>

  <p style="text-align: center; color: ${BASE_STYLES.mutedColor}; font-size: 14px; margin-top: 10px;">
    Your Gift Card Code
  </p>

  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #333; font-size: 18px;">Gift Card Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: ${BASE_STYLES.mutedColor};">Brand:</td>
        <td style="padding: 8px 0; font-weight: 600; color: #333;">${brandName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${BASE_STYLES.mutedColor};">Value:</td>
        <td style="padding: 8px 0; font-weight: 600; color: #333;">$${giftCardValue}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${BASE_STYLES.mutedColor};">Code:</td>
        <td style="padding: 8px 0; font-weight: 600; color: ${BASE_STYLES.primaryColor}; font-family: monospace;">${giftCardCode}</td>
      </tr>
    </table>
  </div>

  ${redemptionInstructions ? `
    <div style="background-color: #fff3cd; border-left: 4px solid ${BASE_STYLES.warningColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #856404; font-size: 16px;">📋 How to Redeem</h3>
      <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
        ${redemptionInstructions}
      </p>
    </div>
  ` : ''}

  ${balanceCheckUrl ? `
    <p style="text-align: center; margin-top: 30px;">
      ${buildButton('Check Balance', balanceCheckUrl, BASE_STYLES.successColor)}
    </p>
  ` : ''}

  <p style="font-size: 14px; color: ${BASE_STYLES.mutedColor}; margin-top: 30px; padding-top: 20px; border-top: 1px solid ${BASE_STYLES.borderColor};">
    <strong>Important:</strong> Keep this code safe. Anyone with this code can use your gift card.
    Take a screenshot or save this email for your records.
  </p>
</div>

${buildFooter(clientName)}
  `.trim();

  return wrapEmailHtml(content, `Your $${giftCardValue} ${brandName} gift card is here!`);
}

// ============================================================================
// Verification Email Template
// ============================================================================

export interface VerificationEmailParams {
  recipientName?: string;
  verificationLink: string;
  clientName?: string;
  expiresIn?: string;
}

/**
 * Build email verification email HTML
 */
export function buildVerificationEmailHtml(params: VerificationEmailParams): string {
  const {
    recipientName,
    verificationLink,
    clientName = 'Mobul',
    expiresIn = '24 hours',
  } = params;

  const content = `
${buildHeader('Email Verification')}

<div style="padding: 40px 30px; color: ${BASE_STYLES.textColor}; line-height: 1.6;">
  <p style="font-size: 18px; margin-bottom: 10px;">Hi ${recipientName || 'there'},</p>
  
  <p>You're receiving this email from <strong>${clientName}</strong> to verify your identity and proceed with your gift card reward.</p>
  
  <p>Please click the button below to verify your email address:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    ${buildButton('Verify My Email', verificationLink)}
  </div>
  
  <p style="font-size: 14px; color: ${BASE_STYLES.mutedColor};">
    If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${verificationLink}" style="color: ${BASE_STYLES.primaryColor}; word-break: break-all;">${verificationLink}</a>
  </p>
  
  <hr style="border: none; border-top: 1px solid ${BASE_STYLES.borderColor}; margin: 24px 0;">
  
  <p style="font-size: 12px; color: #999; margin-bottom: 0;">
    This verification link expires in ${expiresIn}. If you didn't request this email, you can safely ignore it.
  </p>
</div>

${buildFooter(clientName)}
  `.trim();

  return wrapEmailHtml(content, `Verify your email for ${clientName}`);
}

// ============================================================================
// Invitation Email Template
// ============================================================================

export interface InvitationEmailParams {
  inviterName: string;
  inviterEmail?: string;
  organizationName: string;
  roleName: string;
  inviteUrl: string;
  message?: string;
  expiresIn?: string;
}

/**
 * Build user invitation email HTML
 */
export function buildInvitationEmailHtml(params: InvitationEmailParams): string {
  const {
    inviterName,
    inviterEmail,
    organizationName,
    roleName,
    inviteUrl,
    message,
    expiresIn = '7 days',
  } = params;

  const inviterDisplay = inviterName || inviterEmail || 'A team member';

  const content = `
${buildHeader("🎉 You're Invited!")}

<div style="padding: 40px 30px; color: ${BASE_STYLES.textColor}; line-height: 1.6;">
  <p>Hi there,</p>
  
  <p><strong>${inviterDisplay}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${roleName}</strong>.</p>
  
  ${message ? `
    <div style="background-color: #f8f9fa; border-left: 4px solid ${BASE_STYLES.primaryColor}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <em>"${message}"</em>
    </div>
  ` : ''}
  
  <p>Click the button below to accept your invitation and create your account:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    ${buildButton('Accept Invitation', inviteUrl)}
  </div>
  
  <p style="color: ${BASE_STYLES.mutedColor}; font-size: 14px;">This invitation will expire in ${expiresIn}.</p>
  
  <p style="color: ${BASE_STYLES.mutedColor}; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
</div>

${buildFooter()}
  `.trim();

  return wrapEmailHtml(content, `${inviterDisplay} invited you to join ${organizationName}`);
}

// ============================================================================
// Approval Notification Template
// ============================================================================

export interface ApprovalNotificationParams {
  campaignName: string;
  approverName: string;
  action: 'approved' | 'rejected' | 'changes_requested';
  notes?: string;
  campaignUrl?: string;
}

/**
 * Build campaign approval notification email HTML
 */
export function buildApprovalNotificationHtml(params: ApprovalNotificationParams): string {
  const {
    campaignName,
    approverName,
    action,
    notes,
    campaignUrl,
  } = params;

  const actionConfig = {
    approved: { emoji: '✅', color: BASE_STYLES.successColor, title: 'Campaign Approved' },
    rejected: { emoji: '❌', color: '#dc3545', title: 'Campaign Rejected' },
    changes_requested: { emoji: '📝', color: BASE_STYLES.warningColor, title: 'Changes Requested' },
  };

  const config = actionConfig[action];

  const content = `
${buildHeader(`${config.emoji} ${config.title}`)}

<div style="padding: 40px 30px; color: ${BASE_STYLES.textColor}; line-height: 1.6;">
  <p>Your campaign <strong>"${campaignName}"</strong> has been ${action.replace('_', ' ')} by <strong>${approverName}</strong>.</p>
  
  ${notes ? `
    <div style="background-color: #f8f9fa; border-left: 4px solid ${config.color}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <h4 style="margin: 0 0 10px 0; color: ${BASE_STYLES.textColor};">Notes from reviewer:</h4>
      <p style="margin: 0; color: #555;">${notes}</p>
    </div>
  ` : ''}
  
  ${campaignUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      ${buildButton('View Campaign', campaignUrl)}
    </div>
  ` : ''}
</div>

${buildFooter()}
  `.trim();

  return wrapEmailHtml(content, `Campaign ${action.replace('_', ' ')}: ${campaignName}`);
}

// ============================================================================
// Comment Notification Template
// ============================================================================

export interface CommentNotificationParams {
  campaignName: string;
  commenterName: string;
  comment: string;
  campaignUrl?: string;
  isMention?: boolean;
}

/**
 * Build comment notification email HTML
 */
export function buildCommentNotificationHtml(params: CommentNotificationParams): string {
  const {
    campaignName,
    commenterName,
    comment,
    campaignUrl,
    isMention = false,
  } = params;

  const title = isMention ? `${commenterName} mentioned you` : `New comment on your campaign`;

  const content = `
${buildHeader(`💬 ${title}`)}

<div style="padding: 40px 30px; color: ${BASE_STYLES.textColor}; line-height: 1.6;">
  <p><strong>${commenterName}</strong> ${isMention ? 'mentioned you in a comment on' : 'commented on'} <strong>"${campaignName}"</strong>:</p>
  
  <div style="background-color: #f8f9fa; border-left: 4px solid ${BASE_STYLES.primaryColor}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
    <p style="margin: 0; color: #555; white-space: pre-wrap;">${comment}</p>
  </div>
  
  ${campaignUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      ${buildButton('View Comment', campaignUrl)}
    </div>
  ` : ''}
</div>

${buildFooter()}
  `.trim();

  return wrapEmailHtml(content, `${commenterName} commented on ${campaignName}`);
}

// ============================================================================
// Marketing Email Template
// ============================================================================

export interface MarketingEmailParams {
  subject: string;
  bodyHtml: string;
  unsubscribeUrl?: string;
  companyName?: string;
  companyAddress?: string;
}

/**
 * Build marketing email HTML with proper footer
 */
export function buildMarketingEmailHtml(params: MarketingEmailParams): string {
  const {
    bodyHtml,
    unsubscribeUrl,
    companyName = 'Mobul',
    companyAddress,
  } = params;

  const content = `
<div style="padding: 30px;">
  ${bodyHtml}
</div>

<div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid ${BASE_STYLES.borderColor};">
  <p style="color: ${BASE_STYLES.mutedColor}; font-size: 14px; margin: 5px 0;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  ${companyAddress ? `<p style="color: ${BASE_STYLES.mutedColor}; font-size: 12px; margin: 5px 0;">${companyAddress}</p>` : ''}
  ${unsubscribeUrl ? `
    <p style="margin-top: 15px;">
      <a href="${unsubscribeUrl}" style="color: ${BASE_STYLES.mutedColor}; font-size: 12px;">Unsubscribe</a>
    </p>
  ` : ''}
</div>
  `.trim();

  return wrapEmailHtml(content);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  buildGiftCardEmailHtml,
  buildVerificationEmailHtml,
  buildInvitationEmailHtml,
  buildApprovalNotificationHtml,
  buildCommentNotificationHtml,
  buildMarketingEmailHtml,
};
