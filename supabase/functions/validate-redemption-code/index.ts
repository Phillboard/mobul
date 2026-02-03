/**
 * Validate Redemption Code Edge Function
 * 
 * Comprehensive validation endpoint for redemption codes.
 * Used by call center before attempting gift card provision.
 * 
 * Features:
 * - Rate limiting (20 attempts per IP per minute)
 * - Returns detailed validation result with existing card assignments
 * - Shows available conditions for the recipient
 * - Handles SMS opt-in status checks
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { 
  validateRedemptionCodeFormat,
  checkRecipientApprovalStatus,
  checkSmsOptInForRedemption,
} from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface ValidateRedemptionCodeRequest {
  redemptionCode: string;
  campaignId?: string;
}

interface RecipientInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  status: string;
  smsOptInStatus?: string;
  audienceName?: string;
  campaignId?: string;
  campaignName?: string;
  campaigns: Array<{ id: string; name?: string }>;
}

interface ExistingCardInfo {
  giftCardId: string;
  conditionId: string;
  conditionName?: string;
  cardCode?: string;
  cardValue?: number;
  brandName?: string;
  brandLogo?: string;
  assignedAt?: string;
  deliveredAt?: string;
  deliveryStatus?: string;
  deliveryMethod?: string;
}

interface ConditionInfo {
  id: string;
  name?: string;
  hasAssignment: boolean;
}

interface ValidateRedemptionCodeResponse {
  valid: boolean;
  reason: string;
  message: string;
  recipient: RecipientInfo | null;
  existingCards: ExistingCardInfo[];
  availableConditions?: ConditionInfo[];
  canRedeem: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleValidateRedemptionCode(
  request: ValidateRedemptionCodeRequest,
  _context: PublicContext,
  rawRequest: Request
): Promise<ValidateRedemptionCodeResponse> {
  const supabase = createServiceClient();
  
  const { redemptionCode, campaignId } = request;

  // Validate input
  const formatValidation = validateRedemptionCodeFormat(redemptionCode);
  if (!formatValidation.valid) {
    return {
      valid: false,
      reason: 'MISSING_CODE',
      message: formatValidation.message,
      recipient: null,
      existingCards: [],
      canRedeem: false,
    };
  }

  // Apply rate limiting
  const rateLimitResult = await checkRateLimit(
    supabase,
    rawRequest,
    { maxRequests: 20, windowMs: 60 * 1000 },
    'validate-redemption-code'
  );

  if (!rateLimitResult.allowed) {
    throw new ApiError(
      `Too many attempts. Please try again in ${rateLimitResult.retryAfter || 60} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  const normalizedCode = redemptionCode.trim().toUpperCase();

  // 1. Check if code exists
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select(`
      id,
      redemption_code,
      approval_status,
      rejection_reason,
      sms_opt_in_status,
      gift_card_assigned_id,
      first_name,
      last_name,
      phone,
      email,
      audience_id,
      campaign_id,
      campaign:campaigns(
        id,
        name,
        client_id,
        status
      ),
      audience:audiences(
        id,
        name
      )
    `)
    .eq('redemption_code', normalizedCode)
    .single();

  if (recipientError || !recipient) {
    console.log('[VALIDATE] Code not found:', redemptionCode);
    return {
      valid: false,
      reason: 'CODE_NOT_FOUND',
      message: 'This redemption code does not exist',
      recipient: null,
      existingCards: [],
      canRedeem: false,
    };
  }

  // 2. Check if code belongs to specified campaign (if provided)
  if (campaignId) {
    const campaign = recipient.campaign as { id: string } | null;
    const matchesCampaign = recipient.campaign_id === campaignId || campaign?.id === campaignId;

    if (!matchesCampaign) {
      // Fallback: try to find campaign via audience
      if (!recipient.campaign_id && recipient.audience_id) {
        const { data: audienceCampaign } = await supabase
          .from('campaigns')
          .select('id')
          .eq('audience_id', recipient.audience_id)
          .eq('id', campaignId)
          .maybeSingle();
        
        if (audienceCampaign) {
          // Backfill recipient's campaign_id
          await supabase
            .from('recipients')
            .update({ campaign_id: campaignId })
            .eq('id', recipient.id);
        } else {
          return {
            valid: false,
            reason: 'CAMPAIGN_MISMATCH',
            message: 'This code is not valid for the specified campaign',
            recipient: null,
            existingCards: [],
            canRedeem: false,
          };
        }
      } else {
        return {
          valid: false,
          reason: 'CAMPAIGN_MISMATCH',
          message: 'This code is not valid for the specified campaign',
          recipient: null,
          existingCards: [],
          canRedeem: false,
        };
      }
    }
  }

  // 3. Check recipient status using business rules
  const approvalValidation = checkRecipientApprovalStatus(
    recipient.approval_status,
    recipient.rejection_reason
  );

  let canRedeem = approvalValidation.valid && recipient.approval_status === 'approved';
  let statusMessage = approvalValidation.message;

  // 4. Check SMS opt-in status
  const smsValidation = checkSmsOptInForRedemption(recipient.sms_opt_in_status);
  
  if (!smsValidation.valid) {
    return {
      valid: true,
      reason: smsValidation.reason || 'OPT_IN_ISSUE',
      message: smsValidation.message,
      recipient: {
        id: recipient.id,
        firstName: recipient.first_name,
        lastName: recipient.last_name,
        status: recipient.approval_status,
        smsOptInStatus: recipient.sms_opt_in_status,
        campaigns: [],
      },
      existingCards: [],
      canRedeem: false,
    };
  }

  // 5. Check for existing gift card assignments (supports both legacy and inventory models)
  const { data: existingAssignments } = await supabase
    .from('recipient_gift_cards')
    .select(`
      id,
      gift_card_id,
      inventory_card_id,
      condition_id,
      assigned_at,
      delivered_at,
      delivery_status,
      delivery_method,
      campaign_conditions(
        condition_name,
        brand_id,
        card_value
      ),
      gift_cards(
        card_code,
        card_number,
        card_value,
        gift_card_pools(
          pool_name,
          gift_card_brands(
            brand_name,
            logo_url
          )
        )
      ),
      gift_card_inventory(
        card_code,
        card_number,
        denomination,
        gift_card_brands(
          brand_name,
          logo_url
        )
      )
    `)
    .eq('recipient_id', recipient.id);

  const existingCards: ExistingCardInfo[] = (existingAssignments || []).map((assignment: Record<string, unknown>) => {
    const legacyCard = assignment.gift_cards as Record<string, unknown>;
    const inventoryCard = assignment.gift_card_inventory as Record<string, unknown>;
    const condition = assignment.campaign_conditions as Record<string, unknown>;

    // Prefer inventory card data, fall back to legacy
    if (inventoryCard) {
      const brand = inventoryCard.gift_card_brands as Record<string, unknown>;
      return {
        giftCardId: (assignment.inventory_card_id || assignment.gift_card_id) as string,
        conditionId: assignment.condition_id as string,
        conditionName: condition?.condition_name as string,
        cardCode: inventoryCard.card_code as string,
        cardValue: inventoryCard.denomination as number,
        brandName: brand?.brand_name as string,
        brandLogo: brand?.logo_url as string,
        assignedAt: assignment.assigned_at as string,
        deliveredAt: assignment.delivered_at as string,
        deliveryStatus: assignment.delivery_status as string,
        deliveryMethod: assignment.delivery_method as string,
      };
    }

    // Legacy card fallback
    const pool = legacyCard?.gift_card_pools as Record<string, unknown>;
    const brand = pool?.gift_card_brands as Record<string, unknown>;
    return {
      giftCardId: assignment.gift_card_id as string,
      conditionId: assignment.condition_id as string,
      conditionName: condition?.condition_name as string,
      cardCode: legacyCard?.card_code as string,
      cardValue: legacyCard?.card_value as number,
      brandName: (brand?.brand_name || pool?.pool_name) as string,
      brandLogo: brand?.logo_url as string,
      assignedAt: assignment.assigned_at as string,
      deliveredAt: assignment.delivered_at as string,
      deliveryStatus: assignment.delivery_status as string,
      deliveryMethod: assignment.delivery_method as string,
    };
  });

  // If recipient is redeemed but has cards, update message
  if (recipient.approval_status === 'redeemed' && existingCards.length > 0) {
    canRedeem = false;
    statusMessage = `Code already redeemed with ${existingCards.length} gift card(s)`;
  }

  // 6. Get available conditions for this recipient's campaign
  const campaign = recipient.campaign as { id: string; name?: string } | null;
  let effectiveCampaignId = recipient.campaign_id || campaign?.id;

  // Fallback via audience
  if (!effectiveCampaignId && recipient.audience_id) {
    const { data: audienceCampaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('audience_id', recipient.audience_id)
      .maybeSingle();
    
    effectiveCampaignId = audienceCampaign?.id;
    
    if (effectiveCampaignId) {
      await supabase
        .from('recipients')
        .update({ campaign_id: effectiveCampaignId })
        .eq('id', recipient.id);
    }
  }

  let conditions: ConditionInfo[] = [];
  if (effectiveCampaignId) {
    const { data } = await supabase
      .from('campaign_conditions')
      .select('id, condition_name, brand_id, card_value')
      .eq('campaign_id', effectiveCampaignId)
      .not('brand_id', 'is', null);
    
    conditions = (data || []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: c.condition_name as string,
      hasAssignment: existingCards.some(ec => ec.conditionId === c.id),
    }));
  }

  const audience = recipient.audience as { name?: string } | null;

  console.log('[VALIDATE] Validation successful:', {
    recipientId: recipient.id,
    status: recipient.approval_status,
    canRedeem,
    existingCardsCount: existingCards.length,
  });

  return {
    valid: true,
    reason: recipient.approval_status,
    message: statusMessage,
    recipient: {
      id: recipient.id,
      firstName: recipient.first_name,
      lastName: recipient.last_name,
      phone: recipient.phone,
      email: recipient.email,
      status: recipient.approval_status,
      smsOptInStatus: recipient.sms_opt_in_status,
      audienceName: audience?.name,
      campaignId: effectiveCampaignId,
      campaignName: campaign?.name,
      campaigns: effectiveCampaignId ? [{ id: effectiveCampaignId, name: campaign?.name }] : [],
    },
    existingCards,
    availableConditions: conditions,
    canRedeem,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleValidateRedemptionCode, {
  requireAuth: false, // Public endpoint for call center pre-validation
  parseBody: true,
  auditAction: 'validate_redemption_code',
}));
