/**
 * Redeem Gift Card Embed Edge Function
 * 
 * Public endpoint for embedded gift card redemption widget.
 * Simpler flow than redeem-customer-code - just validates and claims a card by code.
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

  // Find the gift card
  const { data: giftCard, error: giftCardError } = await supabase
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
    .single();

  if (giftCardError || !giftCard) {
    console.log('[EMBED-REDEEM] Gift card not found:', giftCardError);
    return {
      valid: false,
      message: 'Invalid code. Please check and try again.',
    };
  }

  // Check if already claimed
  if (giftCard.status === 'claimed' || giftCard.status === 'redeemed') {
    return {
      valid: false,
      message: 'This code has already been claimed.',
    };
  }

  // Mark as claimed
  const { error: updateError } = await supabase
    .from('gift_cards')
    .update({
      status: 'claimed',
      claimed_at: new Date().toISOString(),
    })
    .eq('id', giftCard.id);

  if (updateError) {
    console.error('[EMBED-REDEEM] Error marking gift card as claimed:', updateError);
  }

  // Dispatch Zapier event
  try {
    const pool = giftCard.pool as { client_id?: string; card_value?: number; provider?: string } | null;
    
    if (pool?.client_id) {
      await supabase.functions.invoke('dispatch-zapier-event', {
        body: {
          event_type: 'gift_card.redeemed',
          client_id: pool.client_id,
          data: {
            gift_card_id: giftCard.id,
            card_code: giftCard.card_code,
            value: pool.card_value || 0,
            provider: pool.provider || 'Gift Card',
            redeemed_at: new Date().toISOString(),
          }
        }
      });
      console.log('[EMBED-REDEEM] Zapier event dispatched');
    }
  } catch (zapierError) {
    console.error('[EMBED-REDEEM] Failed to dispatch Zapier event:', zapierError);
  }

  const pool = giftCard.pool as { card_value?: number; provider?: string } | null;

  return {
    valid: true,
    giftCard: {
      card_code: giftCard.card_code,
      card_number: giftCard.card_number,
      value: pool?.card_value || 0,
      provider: pool?.provider || 'Gift Card',
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
