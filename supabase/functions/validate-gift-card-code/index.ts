/**
 * Validate Gift Card Code Edge Function
 * 
 * Public endpoint that validates a gift card code and creates a redemption record.
 * Used by landing pages to verify codes before showing gift card details.
 * 
 * Features:
 * - Rate limiting (5 attempts per IP per 5 minutes)
 * - Validates recipient exists and belongs to campaign
 * - Creates redemption tracking record
 * - Returns redemption token for subsequent reveal
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { ERROR_MESSAGES } from '../_shared/config.ts';
import { validateRedemptionCodeFormat } from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface ValidateCodeRequest {
  code: string;
  campaignId: string;
}

interface ValidateCodeResponse {
  valid: boolean;
  message?: string;
  alreadyViewed?: boolean;
  redemptionToken?: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleValidateGiftCardCode(
  request: ValidateCodeRequest,
  _context: PublicContext,
  rawRequest: Request
): Promise<ValidateCodeResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('validate-gift-card-code', rawRequest);
  
  const { code, campaignId } = request;

  // Validate input
  if (!code || !campaignId) {
    return {
      valid: false,
      message: 'Missing required parameters',
    };
  }

  // Validate code format
  const formatValidation = validateRedemptionCodeFormat(code);
  if (!formatValidation.valid) {
    return {
      valid: false,
      message: formatValidation.message,
    };
  }

  // Apply rate limiting
  const rateLimitResult = await checkRateLimit(
    supabase,
    rawRequest,
    { maxRequests: 5, windowMs: 5 * 60 * 1000 },
    'validate-gift-card-code'
  );

  if (!rateLimitResult.allowed) {
    throw new ApiError(
      `Too many attempts. Please try again in ${Math.ceil((rateLimitResult.retryAfter || 300) / 60)} minutes.`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  // 1. Look up recipient by token (code)
  const { data: recipient, error: recipientError } = await supabase
    .from('recipients')
    .select('*, audience:audiences(client_id)')
    .eq('token', code)
    .single();

  if (recipientError || !recipient) {
    console.log('[VALIDATE] Recipient not found:', code);
    return {
      valid: false,
      message: ERROR_MESSAGES.INVALID_CODE,
    };
  }

  // 2. Check if campaign matches and belongs to same client
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*, audience:audiences!inner(id, client_id)')
    .eq('id', campaignId)
    .eq('audiences.id', recipient.audience_id)
    .single();

  if (campaignError || !campaign) {
    console.log('[VALIDATE] Campaign not found or doesn\'t match:', campaignId);
    return {
      valid: false,
      message: ERROR_MESSAGES.CAMPAIGN_MISMATCH,
    };
  }

  // 3. Check if gift card has been delivered to this recipient
  const { data: delivery, error: deliveryError } = await supabase
    .from('gift_card_deliveries')
    .select(`
      *,
      gift_card:gift_cards(
        *,
        pool:gift_card_pools(*)
      )
    `)
    .eq('recipient_id', recipient.id)
    .eq('campaign_id', campaignId)
    .in('delivery_status', ['sent', 'delivered'])
    .maybeSingle();

  if (deliveryError) {
    console.error('[VALIDATE] Error fetching delivery:', deliveryError);
    return {
      valid: false,
      message: 'Error checking gift card status. Please try again.',
    };
  }

  if (!delivery) {
    console.log('[VALIDATE] No delivery found for recipient:', recipient.id);
    return {
      valid: false,
      message: 'No gift card has been approved for this code yet. Please contact support if you believe this is an error.',
    };
  }

  // 4. Check if already redeemed/viewed
  const { data: existingRedemption } = await supabase
    .from('gift_card_redemptions')
    .select('*')
    .eq('recipient_id', recipient.id)
    .eq('campaign_id', campaignId)
    .eq('redemption_status', 'viewed')
    .maybeSingle();

  if (existingRedemption) {
    console.log('[VALIDATE] Redemption already exists, allowing re-view');
    return {
      valid: true,
      alreadyViewed: true,
      redemptionToken: existingRedemption.id,
    };
  }

  // 5. Create redemption record
  const { data: redemption, error: redemptionError } = await supabase
    .from('gift_card_redemptions')
    .insert({
      campaign_id: campaignId,
      recipient_id: recipient.id,
      gift_card_delivery_id: delivery.id,
      code_entered: code,
      redemption_status: 'pending',
      redemption_ip: rawRequest.headers.get('x-forwarded-for'),
      redemption_user_agent: rawRequest.headers.get('user-agent'),
    })
    .select()
    .single();

  if (redemptionError) {
    console.error('[VALIDATE] Error creating redemption:', redemptionError);
    return {
      valid: false,
      message: 'Error processing redemption. Please try again.',
    };
  }

  // 6. Log event
  await supabase.from('events').insert({
    campaign_id: campaignId,
    recipient_id: recipient.id,
    event_type: 'gift_card_code_entered',
    source: 'landing_page',
    event_data_json: { code, valid: true },
  });

  console.log('[VALIDATE] Code validated successfully:', code);
  
  // Log activity
  await activityLogger.giftCard('card_validated', 'success',
    'Gift card code validated successfully',
    {
      recipientId: recipient.id,
      campaignId,
      metadata: {
        redemption_id: redemption.id,
      },
    }
  );
  
  return {
    valid: true,
    redemptionToken: redemption.id,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleValidateGiftCardCode, {
  requireAuth: false, // Public endpoint for landing pages
  parseBody: true,
  auditAction: 'validate_gift_card_code',
}));
