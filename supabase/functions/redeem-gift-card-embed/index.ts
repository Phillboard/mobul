/**
 * Redeem Gift Card Embed Edge Function
 *
 * Public endpoint for embedded gift card redemption widget.
 * Simpler flow than redeem-customer-code - just validates and claims a card by code.
 *
 * Searches both card models:
 * - Legacy `gift_cards` table (pool-based)
 * - New `gift_card_inventory` table (brand/denomination-based)
 *
 * Features:
 * - Rate limiting (10 attempts per IP per 5 minutes)
 * - Code sanitization
 * - Zapier event dispatch
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { validateRedemptionCodeFormat } from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface RedeemEmbedRequest {
  code: string;
}

interface RedeemEmbedResponse {
  valid: boolean;
  message?: string;
  giftCard?: {
    card_code: string;
    card_number?: string;
    value: number;
    provider: string;
  };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleRedeemGiftCardEmbed(
  request: RedeemEmbedRequest,
  _context: PublicContext,
  rawRequest: Request
): Promise<RedeemEmbedResponse> {
  const supabase = createServiceClient();
  
  const { code } = request;

  // Validate code format
  const formatValidation = validateRedemptionCodeFormat(code);
  if (!formatValidation.valid) {
    return {
      valid: false,
      message: formatValidation.message,
    };
  }

  // Sanitize code
  const sanitizedCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,50}$/.test(sanitizedCode)) {
    return {
      valid: false,
      message: 'Code must be 4-50 characters and contain only letters, numbers, and hyphens',
    };
  }

  // Apply rate limiting
  const rateLimitResult = await checkRateLimit(
    supabase,
    rawRequest,
    { maxRequests: 10, windowMs: 5 * 60 * 1000 },
    'redeem-gift-card-embed'
  );

  if (!rateLimitResult.allowed) {
    throw new ApiError(
      `Too many attempts. Please try again in ${Math.ceil((rateLimitResult.retryAfter || 300) / 60)} minutes.`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  console.log('[EMBED-REDEEM] Redeeming gift card code:', sanitizedCode);

  // Search both card models: legacy gift_cards (pool-based) and gift_card_inventory (brand-based)
  let cardSource: 'legacy' | 'inventory' | null = null;
  let cardId: string | null = null;
  let cardCode: string | null = null;
  let cardNumber: string | null = null;
  let cardValue = 0;
  let cardProvider = 'Gift Card';
  let clientId: string | null = null;
  let cardStatus: string | null = null;

  // 1. Try legacy gift_cards table first
  const { data: legacyCard } = await supabase
    .from('gift_cards')
    .select(`
      *,
      pool:gift_card_pools(
        card_value,
        provider,
        pool_name,
        client_id
      )
    `)
    .eq('card_code', sanitizedCode)
    .maybeSingle();

  if (legacyCard) {
    const pool = legacyCard.pool as { card_value?: number; provider?: string; client_id?: string } | null;
    cardSource = 'legacy';
    cardId = legacyCard.id;
    cardCode = legacyCard.card_code;
    cardNumber = legacyCard.card_number;
    cardValue = pool?.card_value || 0;
    cardProvider = pool?.provider || 'Gift Card';
    clientId = pool?.client_id || null;
    cardStatus = legacyCard.status;
    console.log('[EMBED-REDEEM] Found card in legacy gift_cards table');
  }

  // 2. If not found in legacy, try gift_card_inventory table
  if (!cardSource) {
    const { data: inventoryCard } = await supabase
      .from('gift_card_inventory')
      .select(`
        id,
        card_code,
        card_number,
        denomination,
        status,
        assigned_to_campaign_id,
        gift_card_brands(
          brand_name,
          provider
        )
      `)
      .eq('card_code', sanitizedCode)
      .maybeSingle();

    if (inventoryCard) {
      const brand = inventoryCard.gift_card_brands as { brand_name?: string; provider?: string } | null;
      cardSource = 'inventory';
      cardId = inventoryCard.id;
      cardCode = inventoryCard.card_code;
      cardNumber = inventoryCard.card_number;
      cardValue = inventoryCard.denomination;
      cardProvider = brand?.provider || brand?.brand_name || 'Gift Card';
      cardStatus = inventoryCard.status;

      // Try to get client_id from the campaign if assigned
      if (inventoryCard.assigned_to_campaign_id) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('client_id')
          .eq('id', inventoryCard.assigned_to_campaign_id)
          .maybeSingle();
        clientId = campaign?.client_id || null;
      }
      console.log('[EMBED-REDEEM] Found card in gift_card_inventory table');
    }
  }

  // Not found in either table
  if (!cardSource || !cardId) {
    console.log('[EMBED-REDEEM] Gift card not found in either table');
    return {
      valid: false,
      message: 'Invalid code. Please check and try again.',
    };
  }

  // Check if already claimed
  const claimedStatuses = ['claimed', 'redeemed', 'delivered'];
  if (cardStatus && claimedStatuses.includes(cardStatus)) {
    return {
      valid: false,
      message: 'This code has already been claimed.',
    };
  }

  // Mark as claimed in the appropriate table
  if (cardSource === 'legacy') {
    const { error: updateError } = await supabase
      .from('gift_cards')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', cardId);

    if (updateError) {
      console.error('[EMBED-REDEEM] Error marking legacy gift card as claimed:', updateError);
    }
  } else {
    const { error: updateError } = await supabase
      .from('gift_card_inventory')
      .update({
        status: 'delivered',
      })
      .eq('id', cardId);

    if (updateError) {
      console.error('[EMBED-REDEEM] Error marking inventory card as delivered:', updateError);
    }
  }

  // Dispatch Zapier event
  try {
    if (clientId) {
      await supabase.functions.invoke('dispatch-zapier-event', {
        body: {
          event_type: 'gift_card.redeemed',
          client_id: clientId,
          data: {
            gift_card_id: cardId,
            card_code: cardCode,
            value: cardValue,
            provider: cardProvider,
            source: cardSource,
            redeemed_at: new Date().toISOString(),
          }
        }
      });
      console.log('[EMBED-REDEEM] Zapier event dispatched');
    }
  } catch (zapierError) {
    console.error('[EMBED-REDEEM] Failed to dispatch Zapier event:', zapierError);
  }

  return {
    valid: true,
    giftCard: {
      card_code: cardCode!,
      card_number: cardNumber || undefined,
      value: cardValue,
      provider: cardProvider,
    },
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleRedeemGiftCardEmbed, {
  requireAuth: false, // Public endpoint for embed widget
  parseBody: true,
  auditAction: 'redeem_gift_card_embed',
}));
