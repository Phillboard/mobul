/**
 * Send Gift Card Email Edge Function
 * 
 * Sends a beautifully formatted gift card delivery email to a recipient.
 * Uses the shared email provider and templates.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendEmailWithLogging, isValidEmail } from '../_shared/email-provider.ts';
import { buildGiftCardEmailHtml } from '../_shared/email-templates.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';

interface SendGiftCardEmailRequest {
  giftCardId: string;
  recipientEmail: string;
  recipientName?: string;
  giftCardCode?: string;
  giftCardValue?: number;
  brandName?: string;
  brandLogoUrl?: string;
  redemptionInstructions?: string;
  balanceCheckUrl?: string;
  clientId?: string;
  recipientId?: string;
  campaignId?: string;
}

interface SendGiftCardEmailResponse {
  success: boolean;
  messageId?: string;
  recipientEmail: string;
}

async function handleSendGiftCardEmail(
  request: SendGiftCardEmailRequest,
  _context: unknown,
  rawRequest: Request
): Promise<SendGiftCardEmailResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('send-gift-card-email', rawRequest);

  const {
    giftCardId,
    recipientEmail,
    recipientName,
    giftCardCode: providedCode,
    giftCardValue: providedValue,
    brandName: providedBrandName,
    brandLogoUrl: providedLogoUrl,
    redemptionInstructions: providedInstructions,
    balanceCheckUrl: providedBalanceUrl,
    clientId,
    recipientId,
    campaignId,
  } = request;

  // Validate required fields
  if (!giftCardId) {
    throw new ApiError('Missing required field: giftCardId', 'VALIDATION_ERROR', 400);
  }
  if (!recipientEmail) {
    throw new ApiError('Missing required field: recipientEmail', 'VALIDATION_ERROR', 400);
  }
  if (!isValidEmail(recipientEmail)) {
    throw new ApiError('Invalid email address', 'VALIDATION_ERROR', 400);
  }

  console.log('[GIFT-CARD-EMAIL] Sending to:', recipientEmail);

  // Fetch gift card details if not provided
  let giftCardCode = providedCode;
  let giftCardValue = providedValue;
  let brandName = providedBrandName;
  let brandLogoUrl = providedLogoUrl;
  let redemptionInstructions = providedInstructions;
  let balanceCheckUrl = providedBalanceUrl;
  let finalClientId = clientId;

  if (!giftCardCode || !giftCardValue) {
    const { data: giftCard, error: giftCardError } = await supabase
      .from('gift_cards')
      .select(`
        *,
        gift_card_pools!inner(
          card_value,
          provider,
          client_id,
          gift_card_brands(
            brand_name,
            logo_url,
            balance_check_url,
            redemption_instructions
          )
        )
      `)
      .eq('id', giftCardId)
      .single();

    if (giftCardError || !giftCard) {
      throw new ApiError(
        `Gift card not found: ${giftCardError?.message || 'Unknown error'}`,
        'NOT_FOUND',
        404
      );
    }

    giftCardCode = giftCard.card_code;
    giftCardValue = Number(giftCard.gift_card_pools.card_value);
    brandName = giftCard.gift_card_pools.gift_card_brands?.brand_name || giftCard.gift_card_pools.provider;
    brandLogoUrl = giftCard.gift_card_pools.gift_card_brands?.logo_url;
    balanceCheckUrl = giftCard.gift_card_pools.gift_card_brands?.balance_check_url;
    redemptionInstructions = giftCard.gift_card_pools.gift_card_brands?.redemption_instructions;
    finalClientId = giftCard.gift_card_pools.client_id;
  }

  // Get client details for branding
  let clientName = 'Mobul';
  let clientLogoUrl: string | undefined;

  if (finalClientId) {
    const { data: client } = await supabase
      .from('clients')
      .select('name, logo_url')
      .eq('id', finalClientId)
      .single();

    if (client) {
      clientName = client.name;
      clientLogoUrl = client.logo_url;
    }
  }

  // Build email HTML using shared template
  const emailHtml = buildGiftCardEmailHtml({
    recipientName,
    giftCardCode: giftCardCode!,
    giftCardValue: giftCardValue!,
    brandName: brandName!,
    brandLogoUrl,
    redemptionInstructions,
    balanceCheckUrl,
    clientName,
    clientLogoUrl,
  });

  // Send email using shared provider with logging
  const result = await sendEmailWithLogging(supabase, {
    to: recipientEmail,
    subject: `Your $${giftCardValue} ${brandName} Gift Card`,
    html: emailHtml,
    fromName: clientName,
    templateName: 'gift-card-delivery',
    recipientId,
    campaignId,
    clientId: finalClientId,
    giftCardId,
    metadata: {
      brandName,
      giftCardValue,
    },
  });

  if (!result.success) {
    // Log failure activity
    await activityLogger.giftCard('sms_failed', 'failed', 
      `Gift card email failed to ${recipientEmail}: ${result.error}`,
      {
        clientId: finalClientId,
        campaignId,
        recipientId,
        metadata: {
          gift_card_id: giftCardId,
          error: result.error,
        },
      }
    );
    throw new ApiError(result.error || 'Failed to send email', 'EMAIL_ERROR', 500);
  }

  // Log success activity
  await activityLogger.giftCard('sms_sent', 'success',
    `Gift card email sent to ${recipientEmail}`,
    {
      clientId: finalClientId,
      campaignId,
      recipientId,
      brandName,
      amount: giftCardValue,
      metadata: {
        gift_card_id: giftCardId,
        email_id: result.messageId,
      },
    }
  );

  // Update gift card deliveries table
  if (recipientId) {
    await supabase.from('gift_card_deliveries').insert({
      gift_card_id: giftCardId,
      recipient_id: recipientId,
      campaign_id: campaignId,
      delivery_method: 'email',
      delivery_address: recipientEmail,
      delivery_status: 'sent',
      delivered_at: new Date().toISOString(),
    });
  }

  console.log('[GIFT-CARD-EMAIL] Success:', result.messageId);

  return {
    success: true,
    messageId: result.messageId,
    recipientEmail,
  };
}

Deno.serve(withApiGateway(handleSendGiftCardEmail, {
  requireAuth: false,
  parseBody: true,
}));
