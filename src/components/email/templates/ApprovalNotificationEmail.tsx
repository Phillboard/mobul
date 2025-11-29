/**
 * ApprovalNotificationEmail Template
 * 
 * Email template for campaign approval notifications
 */

import { renderEmailLayout } from './EmailLayout';

interface ApprovalNotificationEmailProps {
  campaignName: string;
  campaignId: string;
  requesterName: string;
  requestDate: string;
  mailDate?: string;
  recipientCount?: number;
  budgetAmount?: number;
  approvalUrl?: string;
  clientName?: string;
  clientLogoUrl?: string;
}

export function ApprovalNotificationEmail({
  campaignName,
  campaignId,
  requesterName,
  requestDate,
  mailDate,
  recipientCount,
  budgetAmount,
  approvalUrl = 'https://app.mobulace.com/campaigns',
  clientName,
  clientLogoUrl,
}: ApprovalNotificationEmailProps): string {
  const emailBody = `
    <h2 style="color: #333; margin-top: 0;">📬 Campaign Approval Request</h2>
    
    <p style="font-size: 16px; color: #555;">
      A new campaign is awaiting your approval and needs your review before it can proceed to production.
    </p>

    <div class="card">
      <h3 style="margin-top: 0; color: #333; font-size: 18px;">Campaign Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; color: #6c757d; border-bottom: 1px solid #e9ecef; width: 40%;">Campaign Name:</td>
          <td style="padding: 12px 0; font-weight: 600; color: #333; border-bottom: 1px solid #e9ecef;">${campaignName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #6c757d; border-bottom: 1px solid #e9ecef;">Requested By:</td>
          <td style="padding: 12px 0; font-weight: 600; color: #333; border-bottom: 1px solid #e9ecef;">${requesterName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #6c757d; border-bottom: 1px solid #e9ecef;">Request Date:</td>
          <td style="padding: 12px 0; color: #333; border-bottom: 1px solid #e9ecef;">${new Date(requestDate).toLocaleDateString()}</td>
        </tr>
        ${mailDate ? `
          <tr>
            <td style="padding: 12px 0; color: #6c757d; border-bottom: 1px solid #e9ecef;">Planned Mail Date:</td>
            <td style="padding: 12px 0; color: #333; border-bottom: 1px solid #e9ecef;">${new Date(mailDate).toLocaleDateString()}</td>
          </tr>
        ` : ''}
        ${recipientCount ? `
          <tr>
            <td style="padding: 12px 0; color: #6c757d; border-bottom: 1px solid #e9ecef;">Recipients:</td>
            <td style="padding: 12px 0; color: #333; border-bottom: 1px solid #e9ecef;">${recipientCount.toLocaleString()} contacts</td>
          </tr>
        ` : ''}
        ${budgetAmount ? `
          <tr>
            <td style="padding: 12px 0; color: #6c757d;">Estimated Budget:</td>
            <td style="padding: 12px 0; font-weight: 600; color: #333;">$${budgetAmount.toLocaleString()}</td>
          </tr>
        ` : ''}
      </table>
    </div>

    <div class="card" style="background-color: #fff3cd; border-left: 4px solid #ffc107;">
      <h3 style="margin-top: 0; color: #856404; font-size: 16px;">⏰ Action Required</h3>
      <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
        This campaign is waiting for your approval. Please review the details and approve or reject at your earliest convenience.
        ${mailDate ? ` The planned mail date is <strong>${new Date(mailDate).toLocaleDateString()}</strong>.` : ''}
      </p>
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${approvalUrl}/${campaignId}" class="button" style="background-color: #28a745; margin-right: 10px;">
        Review & Approve
      </a>
      <a href="${approvalUrl}/${campaignId}" class="button" style="background-color: #6c757d;">
        View Campaign
      </a>
    </p>

    <p style="font-size: 14px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
      <strong>Next Steps:</strong><br>
      • Review campaign details and creative assets<br>
      • Verify recipient list and targeting<br>
      • Approve to move to production or request changes
    </p>
  `;

  return renderEmailLayout({
    children: emailBody,
    preheader: `Campaign "${campaignName}" needs your approval`,
    clientName: clientName || 'Mobul ACE',
    logoUrl: clientLogoUrl,
  });
}

export function renderApprovalNotificationEmail(props: ApprovalNotificationEmailProps): string {
  return ApprovalNotificationEmail(props);
}

