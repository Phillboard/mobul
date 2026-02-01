/**
 * GiftCardDeliveryEmail Template
 * 
 * Email template for delivering gift card codes to recipients
 */

import { renderEmailLayout } from './EmailLayout';

interface GiftCardDeliveryEmailProps {
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

export function GiftCardDeliveryEmail({
  recipientName,
  giftCardCode,
  giftCardValue,
  brandName,
  brandLogoUrl,
  redemptionInstructions,
  balanceCheckUrl,
  clientName,
  clientLogoUrl,
}: GiftCardDeliveryEmailProps): string {
  const greeting = recipientName ? `Dear ${recipientName}` : 'Hello';
  
  const emailBody = `
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

    <div class="code-display">
      ${giftCardCode}
    </div>

    <p style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 10px;">
      Your Gift Card Code
    </p>

    <div class="card">
      <h3 style="margin-top: 0; color: #333; font-size: 18px;">Gift Card Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Brand:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #333;">${brandName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Value:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #333;">$${giftCardValue}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6c757d;">Code:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #667eea; font-family: monospace;">${giftCardCode}</td>
        </tr>
      </table>
    </div>

    ${redemptionInstructions ? `
      <div class="card" style="background-color: #fff3cd; border-left: 4px solid #ffc107;">
        <h3 style="margin-top: 0; color: #856404; font-size: 16px;">📋 How to Redeem</h3>
        <p style="color: #856404; margin-bottom: 0; font-size: 14px;">
          ${redemptionInstructions}
        </p>
      </div>
    ` : ''}

    ${balanceCheckUrl ? `
      <p style="text-align: center; margin-top: 30px;">
        <a href="${balanceCheckUrl}" class="button" style="background-color: #28a745;">
          Check Balance
        </a>
      </p>
    ` : ''}

    <p style="font-size: 14px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
      <strong>Important:</strong> Keep this code safe. Anyone with this code can use your gift card.
      Take a screenshot or save this email for your records.
    </p>
  `;

  return renderEmailLayout({
    children: emailBody,
    preheader: `Your $${giftCardValue} ${brandName} gift card is here!`,
    clientName: clientName || 'Mobul',
    logoUrl: clientLogoUrl,
  });
}

export function renderGiftCardDeliveryEmail(props: GiftCardDeliveryEmailProps): string {
  return GiftCardDeliveryEmail(props);
}

