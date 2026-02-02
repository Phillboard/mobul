/**
 * Redeem Customer Code Edge Function
 * 
 * Public endpoint for customers to redeem their gift card codes.
 * Handles multi-condition campaigns where a single code can unlock multiple gift cards.
 * 
 * Features:
 * - Rate limiting (10 attempts per IP per hour)
 * - Test code support in development
 * - Multi-condition gift card support
 * - Automatic campaign/audience backfill
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { ERROR_MESSAGES } from '../_shared/config.ts';
import { 
  validateRedemptionCodeFormat,
  normalizeRedemptionCode,
  checkRecipientApprovalStatus,
} from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface RedeemRequest {
  redemptionCode: string;
  campaignId: string;
}

interface GiftCardInfo {
  card_code: string;
  card_number?: string;
  card_value: number;
  provider?: string;
  brand_name: string;
  brand_logo?: string;
  brand_color: string;
  store_url?: string;
  expiration_date?: string;
  usage_restrictions: string[];
  redemption_instructions?: string;
  condition_name?: string;
}

interface RedeemResponse {
  giftCard: GiftCardInfo | null;
  giftCards: GiftCardInfo[];
  alreadyRedeemed?: boolean;
  needsApproval?: boolean;
}

// ============================================================================
// Test Code Handler
// ============================================================================

function handleTestCode(normalizedCode: string): RedeemResponse | null {
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' || 
                        Deno.env.get('SUPABASE_URL')?.includes('localhost');
  
  if (isDevelopment && normalizedCode === '12345678ABCD') {
    console.log('[DEV] Test code used in customer redemption');
    
    const testCard: GiftCardInfo = {
      card_code: '1234-5678-ABCD',
      card_number: 'JJ-TEST-9876-5432',
      card_value: 25.00,
      provider: 'Test Provider',
      brand_name: "Jimmy John's",
      brand_color: '#DA291C',
      store_url: 'https://www.jimmyjohns.com',
      usage_restrictions: ['Valid for testing only', 'Use at any Jimmy John\'s location'],
      redemption_instructions: 'Present this card at any Jimmy John\'s location or use card number JJ-TEST-9876-5432 for online orders.',
    };

    return {
      giftCard: testCard,
      giftCards: [testCard],
    };
  }

  return null;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleRedeemCustomerCode(
  request: RedeemRequest,
  _context: PublicContext,
  rawRequest: Request
): Promise<RedeemResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('redeem-customer-code', rawRequest);

  const { redemptionCode, campaignId } = request;

  // Validate input
  if (!redemptionCode || !campaignId) {
    throw new ApiError('Missing required parameters', 'VALIDATION_ERROR', 400);
  }

  // Validate code format
  const formatValidation = validateRedemptionCodeFormat(redemptionCode);
  if (!formatValidation.valid) {
    throw new ApiError(formatValidation.message, 'VALIDATION_ERROR', 400);
  }

  const normalizedCode = normalizeRedemptionCode(redemptionCode);

  // Check for test code
  const testResponse = handleTestCode(normalizedCode);
  if (testResponse) {
    return testResponse;
  }

  // Apply rate limiting
  const rateLimitResult = await checkRateLimit(
    supabase,
    rawRequest,
    { maxRequests: 10, windowMs: 60 * 60 * 1000 },
    'redeem-customer-code'
  );

  if (!rateLimitResult.allowed) {
    throw new ApiError(
      `Too many attempts. Please try again in ${Math.ceil((rateLimitResult.retryAfter || 3600) / 60)} minutes.`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  // 1. Look up recipient by redemption code
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select(`
      *,
      campaign:campaigns(id, name, client_id, status),
      audience:audiences(id, client_id, name),
      gift_card_assigned:gift_cards(
        id, card_code, card_number,
        pool:gift_card_pools(card_value, provider, brand_id)
      )
    `)
    .eq('redemption_code', normalizedCode)
    .single();

  if (recipientError || !recipient) {
    console.log('[REDEEM] Recipient not found:', normalizedCode);
    
    // Log failed attempt
    await supabase.from('recipient_audit_log').insert({
      action: 'viewed',
      ip_address: rawRequest.headers.get('x-forwarded-for'),
      user_agent: rawRequest.headers.get('user-agent'),
      metadata: { redemptionCode: normalizedCode, campaignId, error: 'code_not_found' }
    });
    
    throw new ApiError(ERROR_MESSAGES.INVALID_CODE, 'CODE_NOT_FOUND', 404);
  }

  // 2. Verify campaign matches
  let campaign = recipient.campaign as { id: string; name: string; client_id: string; status: string } | null;

  // Fallback: find via audience if no direct campaign_id
  if (!campaign && recipient.audience_id) {
    const { data: fallbackCampaign } = await supabase
      .from('campaigns')
      .select('id, name, client_id, status')
      .eq('audience_id', recipient.audience_id)
      .maybeSingle();
    
    campaign = fallbackCampaign;
    
    // Backfill campaign_id
    if (fallbackCampaign) {
      await supabase
        .from('recipients')
        .update({ campaign_id: fallbackCampaign.id })
        .eq('id', recipient.id);
    }
  }

  // Validate campaign
  if (campaignId) {
    if (!campaign) {
      throw new ApiError('This code is not associated with any active campaign.', 'CAMPAIGN_NOT_FOUND', 400);
    }
    
    if (campaign.id !== campaignId) {
      throw new ApiError('This code is not valid for this campaign.', 'CAMPAIGN_MISMATCH', 400);
    }
  }

  const effectiveCampaignId = campaign?.id || campaignId;
  const effectiveClientId = campaign?.client_id;

  // 3. Check approval status using business rules
  const approvalValidation = checkRecipientApprovalStatus(
    recipient.approval_status,
    recipient.rejection_reason
  );

  if (!approvalValidation.valid && recipient.approval_status !== 'redeemed') {
    await supabase.from('recipient_audit_log').insert({
      recipient_id: recipient.id,
      action: 'viewed',
      ip_address: rawRequest.headers.get('x-forwarded-for'),
      user_agent: rawRequest.headers.get('user-agent'),
      metadata: { status: recipient.approval_status, campaignId }
    });

    if (approvalValidation.reason === 'APPROVAL_PENDING') {
      return {
        giftCard: null,
        giftCards: [],
        needsApproval: true,
      };
    }

    throw new ApiError(approvalValidation.message, approvalValidation.reason || 'VALIDATION_ERROR', 403);
  }

  // 4. Check if already redeemed - allow viewing existing cards
  if (recipient.approval_status === 'redeemed' && recipient.gift_card_assigned_id) {
    console.log('[REDEEM] Code already redeemed, returning existing cards');
    
    const { data: assignedCards } = await supabase
      .from('recipient_gift_cards')
      .select(`
        gift_card_id,
        campaign_conditions(condition_name),
        gift_cards(
          card_code,
          card_number,
          card_value,
          expiration_date,
          gift_card_pools(
            card_value,
            provider,
            gift_card_brands(
              brand_name,
              logo_url,
              brand_color,
              store_url,
              redemption_instructions,
              usage_restrictions
            )
          )
        )
      `)
      .eq('recipient_id', recipient.id)
      .eq('campaign_id', effectiveCampaignId);

    if (assignedCards && assignedCards.length > 0) {
      const cards = assignedCards.map((ac: Record<string, unknown>) => {
        const gc = ac.gift_cards as Record<string, unknown>;
        const pool = gc?.gift_card_pools as Record<string, unknown>;
        const brand = pool?.gift_card_brands as Record<string, unknown>;
        const condition = ac.campaign_conditions as Record<string, unknown>;
        
        return {
          card_code: gc?.card_code as string,
          card_number: gc?.card_number as string,
          card_value: (pool?.card_value || gc?.card_value) as number,
          provider: pool?.provider as string,
          brand_name: (brand?.brand_name || pool?.provider) as string,
          brand_logo: brand?.logo_url as string,
          brand_color: (brand?.brand_color || '#6366f1') as string,
          store_url: brand?.store_url as string,
          redemption_instructions: brand?.redemption_instructions as string,
          usage_restrictions: (brand?.usage_restrictions || []) as string[],
          expiration_date: gc?.expiration_date as string,
          condition_name: condition?.condition_name as string,
        };
      });

      return {
        giftCard: cards[0],
        giftCards: cards,
        alreadyRedeemed: true,
      };
    }
  }

  // 5. Get campaign conditions with gift card rewards
  const { data: conditions, error: conditionsError } = await supabase
    .from('campaign_conditions')
    .select('id, condition_name, brand_id, card_value, gift_card_pool_id')
    .eq('campaign_id', effectiveCampaignId)
    .not('brand_id', 'is', null);

  if (conditionsError || !conditions || conditions.length === 0) {
    console.error('[REDEEM] No gift card conditions for campaign:', effectiveCampaignId);
    throw new ApiError('No gift cards configured for this campaign.', 'NO_CARDS_CONFIGURED', 500);
  }

  console.log(`[REDEEM] Found ${conditions.length} gift card condition(s)`);

  // 6. Claim gift cards for each condition
  const claimedCards: Array<{ card_id: string; condition_name?: string }> = [];
  
  for (const condition of conditions) {
    try {
      let brandId = condition.brand_id;
      let cardValue = condition.card_value;

      // Legacy: get from pool if not on condition
      if (!brandId && condition.gift_card_pool_id) {
        const { data: pool } = await supabase
          .from('gift_card_pools')
          .select('brand_id, card_value')
          .eq('id', condition.gift_card_pool_id)
          .single();
        
        if (pool) {
          brandId = pool.brand_id;
          cardValue = pool.card_value;
        }
      }

      if (!brandId || !cardValue) {
        console.error(`[REDEEM] No brand/value for condition ${condition.id}`);
        continue;
      }

      const { data: claimedCard, error: claimError } = await supabase
        .rpc('claim_card_atomic', {
          p_brand_id: brandId,
          p_card_value: cardValue,
          p_client_id: effectiveClientId,
          p_recipient_id: recipient.id,
          p_campaign_id: effectiveCampaignId,
          p_condition_id: condition.id,
          p_agent_id: null,
          p_source: 'landing_page'
        });

      if (claimError) {
        if (claimError.message?.includes('ALREADY_ASSIGNED')) {
          console.log(`[REDEEM] Card already assigned for condition ${condition.id}`);
          const { data: existingCard } = await supabase
            .rpc('get_recipient_gift_card_for_condition', {
              p_recipient_id: recipient.id,
              p_condition_id: condition.id
            });

          if (existingCard && existingCard.length > 0) {
            claimedCards.push({ ...existingCard[0], condition_name: condition.condition_name });
          }
        } else {
          console.error(`[REDEEM] Failed to claim card for condition ${condition.id}:`, claimError);
        }
      } else if (claimedCard && claimedCard.length > 0) {
        claimedCards.push({ ...claimedCard[0], condition_name: condition.condition_name });
      }
    } catch (error) {
      console.error(`[REDEEM] Error processing condition ${condition.id}:`, error);
    }
  }

  if (claimedCards.length === 0) {
    console.error('[REDEEM] No cards could be claimed');
    throw new ApiError('No gift cards available. Please contact support.', 'NO_CARDS_AVAILABLE', 500);
  }

  // 7. Update recipient as redeemed
  await supabase
    .from('recipients')
    .update({
      approval_status: 'redeemed',
      gift_card_assigned_id: claimedCards[0].card_id,
      redemption_completed_at: new Date().toISOString(),
      redemption_ip: rawRequest.headers.get('x-forwarded-for'),
      redemption_user_agent: rawRequest.headers.get('user-agent')
    })
    .eq('id', recipient.id);

  // 8. Log successful redemption
  await supabase.from('recipient_audit_log').insert({
    recipient_id: recipient.id,
    action: 'redeemed',
    ip_address: rawRequest.headers.get('x-forwarded-for'),
    user_agent: rawRequest.headers.get('user-agent'),
    metadata: {
      campaignId,
      giftCardIds: claimedCards.map(c => c.card_id),
      conditionCount: claimedCards.length,
      status: 'success'
    }
  });

  // 9. Get full details for all claimed cards
  const fullCards = await Promise.all(
    claimedCards.map(async (card) => {
      const { data: fullCard } = await supabase
        .from('gift_cards')
        .select(`
          *,
          gift_card_pools(
            card_value,
            provider,
            gift_card_brands(
              brand_name,
              logo_url,
              brand_color,
              store_url,
              redemption_instructions,
              usage_restrictions
            )
          )
        `)
        .eq('id', card.card_id)
        .single();

      if (!fullCard) return null;

      const pool = fullCard.gift_card_pools as Record<string, unknown>;
      const brand = pool?.gift_card_brands as Record<string, unknown>;

      return {
        card_code: fullCard.card_code,
        card_number: fullCard.card_number,
        card_value: (pool?.card_value || fullCard.card_value) as number,
        provider: pool?.provider as string,
        brand_name: (brand?.brand_name || pool?.provider) as string,
        brand_logo: brand?.logo_url as string,
        brand_color: (brand?.brand_color || '#6366f1') as string,
        store_url: brand?.store_url as string,
        expiration_date: fullCard.expiration_date,
        usage_restrictions: (brand?.usage_restrictions || []) as string[],
        redemption_instructions: brand?.redemption_instructions as string,
        condition_name: card.condition_name,
      };
    })
  );

  const validCards = fullCards.filter((c): c is GiftCardInfo => c !== null);

  console.log('[REDEEM] Redemption successful:', { recipientId: recipient.id, cardCount: validCards.length });

  // Log activity
  await activityLogger.giftCard('card_redeemed', 'success',
    `Gift card(s) redeemed by recipient via landing page`,
    {
      recipientId: recipient.id,
      campaignId: effectiveCampaignId,
      clientId: effectiveClientId,
      metadata: {
        card_count: validCards.length,
        total_value: validCards.reduce((sum, c) => sum + (c?.card_value || 0), 0),
        brands: validCards.map(c => c?.brand_name).filter(Boolean),
      },
    }
  );

  return {
    giftCard: validCards[0] || null,
    giftCards: validCards,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleRedeemCustomerCode, {
  requireAuth: false, // Public endpoint
  parseBody: true,
  auditAction: 'redeem_customer_code',
}));
