/**
 * WelcomeEmail Template
 * 
 * Email template for welcoming new users and invitations
 */

import { renderEmailLayout } from './EmailLayout';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  organizationName: string;
  roleName?: string;
  inviterName?: string;
  loginUrl?: string;
  resetPasswordUrl?: string;
  isInvitation?: boolean;
  clientLogoUrl?: string;
}

export function WelcomeEmail({
  userName,
  userEmail,
  organizationName,
  roleName,
  inviterName,
  loginUrl = 'https://app.mobul.com/auth',
  resetPasswordUrl,
  isInvitation = false,
  clientLogoUrl,
}: WelcomeEmailProps): string {
  const emailBody = `
    <h2 style="color: #333; margin-top: 0;">
      ${isInvitation ? '🎉 You\'ve Been Invited!' : '👋 Welcome to Mobul'}
    </h2>
    
    <p style="font-size: 16px; color: #555;">
      Hi ${userName},<br><br>
      ${isInvitation 
        ? `${inviterName || 'Someone'} has invited you to join <strong>${organizationName}</strong> on the Mobul platform.`
        : `Welcome to <strong>${organizationName}</strong> on the Mobul platform! We're excited to have you on board.`
      }
    </p>

    <div class="card">
      <h3 style="margin-top: 0; color: #333; font-size: 18px;">Your Account Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; color: #6c757d; border-bottom: 1px solid #e9ecef; width: 40%;">Organization:</td>
          <td style="padding: 12px 0; font-weight: 600; color: #333; border-bottom: 1px solid #e9ecef;">${organizationName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #6c757d; border-bottom: 1px solid #e9ecef;">Email:</td>
          <td style="padding: 12px 0; color: #333; border-bottom: 1px solid #e9ecef;">${userEmail}</td>
        </tr>
        ${roleName ? `
          <tr>
            <td style="padding: 12px 0; color: #6c757d;">Role:</td>
            <td style="padding: 12px 0; font-weight: 600; color: #667eea;">${roleName}</td>
          </tr>
        ` : ''}
      </table>
    </div>

    ${isInvitation && resetPasswordUrl ? `
      <div class="card" style="background-color: #d1ecf1; border-left: 4px solid #0c5460;">
        <h3 style="margin-top: 0; color: #0c5460; font-size: 16px;">🔐 Set Your Password</h3>
        <p style="color: #0c5460; margin-bottom: 0; font-size: 14px;">
          Before you can access your account, you'll need to set up your password. Click the button below to get started.
        </p>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${resetPasswordUrl}" class="button" style="background-color: #667eea;">
          Set Up Your Password
        </a>
      </p>
    ` : `
      <p style="text-align: center; margin-top: 30px;">
        <a href="${loginUrl}" class="button" style="background-color: #667eea;">
          Sign In to Your Account
        </a>
      </p>
    `}

    <div class="card">
      <h3 style="margin-top: 0; color: #333; font-size: 18px;">🚀 Getting Started</h3>
      <p style="color: #555; margin-bottom: 12px;">Here's what you can do with Mobul:</p>
      <ul style="color: #555; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>Create and manage direct mail campaigns</li>
        <li>Design personalized landing pages and forms</li>
        <li>Distribute and track gift card rewards</li>
        <li>Monitor campaign performance with analytics</li>
        <li>Manage customer contacts and lists</li>
        <li>Track phone calls and engagement</li>
      </ul>
    </div>

    <div class="card" style="background-color: #f8f9fa;">
      <h3 style="margin-top: 0; color: #333; font-size: 16px;">📚 Need Help?</h3>
      <p style="color: #555; margin-bottom: 0; font-size: 14px;">
        Check out our <a href="https://app.mobul.com/docs" style="color: #667eea;">documentation</a> or 
        contact your account manager if you have any questions. We're here to help!
      </p>
    </div>

    <p style="font-size: 14px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">
      This invitation ${isInvitation ? 'is valid for 7 days' : 'was sent because you were added to the platform'}.<br>
      If you didn't expect this email, please ignore it or contact support.
    </p>
  `;

  return renderEmailLayout({
    children: emailBody,
    preheader: isInvitation 
      ? `You've been invited to join ${organizationName}` 
      : `Welcome to ${organizationName} on Mobul`,
    clientName: organizationName,
    logoUrl: clientLogoUrl,
  });
}

export function renderWelcomeEmail(props: WelcomeEmailProps): string {
  return WelcomeEmail(props);
}

