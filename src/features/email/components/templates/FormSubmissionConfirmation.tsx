/**
 * FormSubmissionConfirmation Template
 * 
 * Email template for confirming form submissions
 */

import { renderEmailLayout } from './EmailLayout';

interface FormSubmissionConfirmationProps {
  formName: string;
  submitterName?: string;
  submissionData?: Record<string, any>;
  giftCardDetails?: {
    code: string;
    value: number;
    brandName: string;
    redemptionInstructions?: string;
  };
  clientName?: string;
  clientLogoUrl?: string;
  customMessage?: string;
}

export function FormSubmissionConfirmation({
  formName,
  submitterName,
  submissionData,
  giftCardDetails,
  clientName,
  clientLogoUrl,
  customMessage,
}: FormSubmissionConfirmationProps): string {
  const greeting = submitterName ? `Dear ${submitterName}` : 'Hello';
  
  const emailBody = `
    <h2 style="color: #333; margin-top: 0;">✅ Form Submission Confirmed</h2>
    
    <p style="font-size: 16px; color: #555;">
      ${greeting},<br><br>
      Thank you for submitting "<strong>${formName}</strong>". We've received your information and will get back to you soon.
    </p>

    ${customMessage ? `
      <div class="card" style="background-color: #d1ecf1; border-left: 4px solid #0c5460;">
        <p style="color: #0c5460; margin: 0; font-size: 15px;">
          ${customMessage}
        </p>
      </div>
    ` : ''}

    ${giftCardDetails ? `
      <div class="card">
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">🎁 Your Reward</h3>
        <p style="color: #555; margin-bottom: 15px;">
          As a thank you, we've sent you a <strong>$${giftCardDetails.value} ${giftCardDetails.brandName}</strong> gift card!
        </p>
        
        <div class="code-display">
          ${giftCardDetails.code}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; color: #6c757d;">Brand:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #333;">${giftCardDetails.brandName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6c757d;">Value:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #333;">$${giftCardDetails.value}</td>
          </tr>
        </table>

        ${giftCardDetails.redemptionInstructions ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              <strong>How to Redeem:</strong><br>
              ${giftCardDetails.redemptionInstructions}
            </p>
          </div>
        ` : ''}
      </div>
    ` : ''}

    ${submissionData && Object.keys(submissionData).length > 0 ? `
      <div class="card">
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">📋 Your Submission</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${Object.entries(submissionData).map(([key, value]) => `
            <tr>
              <td style="padding: 8px 0; color: #6c757d; vertical-align: top; width: 40%;">${key}:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 500;">${value}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    ` : ''}

    <p style="font-size: 14px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
      If you have any questions or concerns, please don't hesitate to reach out to us.
    </p>
  `;

  return renderEmailLayout({
    children: emailBody,
    preheader: `Thank you for submitting ${formName}`,
    clientName: clientName || 'Mobul',
    logoUrl: clientLogoUrl,
  });
}

export function renderFormSubmissionConfirmation(props: FormSubmissionConfirmationProps): string {
  return FormSubmissionConfirmation(props);
}

