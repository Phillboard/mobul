/**
 * Revoke Gift Card Edge Function
 * 
 * Allows admins to revoke (take back) gift cards from recipients.
 * - Validates admin role via withApiGateway
 * - Updates recipient_gift_cards status to 'revoked'
 * - Returns card to inventory if applicable
 * - Creates audit log entry with full snapshot
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createActivityLogger } from '../_shared/activity-logger.ts';
import { 
  validateRevocation, 
  validateRevocationReason,
  REVOCATION_MIN_REASON_LENGTH,
} from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface RevokeRequest {
  assignmentId: string;
  reason: string;
}

interface RevokeResponse {
  message: string;
  data: {
    assignmentId: string;
    recipientName: string;
    cardValue: number | null;
    brandName: string | null;
    originalStatus: string;
    revokedAt: string;
    revokedBy: string;
    cardReturnedToInventory: boolean;
  };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleRevokeGiftCard(
  request: RevokeRequest,
  context: AuthContext,
  rawRequest: Request
): Promise<RevokeResponse> {
  const supabase = createServiceClient();
  const activityLogger = createActivityLogger('revoke-gift-card', rawRequest);
  
  const { assignmentId, reason } = request;

  // Validate required fields
  if (!assignmentId) {
    throw new ApiError('Missing required field: assignmentId', 'VALIDATION_ERROR', 400);
  }

  // Validate reason using business rules
  const reasonValidation = validateRevocationReason(reason);
  if (!reasonValidation.valid) {
    throw new ApiError(reasonValidation.error!, 'VALIDATION_ERROR', 400);
  }

  // Fetch the gift card assignment with related data
  const { data: assignment, error: fetchError } = await supabase
    .from('recipient_gift_cards')
    .select(`
      *,
      recipient:recipients(
        id,
        first_name,
        last_name,
        phone,
        email
      ),
      campaign:campaigns(
        id,
        name
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (fetchError || !assignment) {
    console.error('[REVOKE] Assignment fetch error:', fetchError);
    throw new ApiError('Gift card assignment not found', 'NOT_FOUND', 404);
  }

  // Validate revocation is allowed using business rules
  const revocationValidation = validateRevocation(
    assignment.delivery_status,
    null, // cardSource would need additional lookup
    false // hasBeenUsed would need balance check
  );

  if (!revocationValidation.canRevoke) {
    throw new ApiError(revocationValidation.reason!, 'VALIDATION_ERROR', 400);
  }

  const now = new Date().toISOString();
  const originalStatus = assignment.delivery_status;

  // Get card details for snapshot
  let cardValue: number | null = null;
  let brandName: string | null = null;

  // Determine which card ID to use (new inventory_card_id or legacy gift_card_id)
  const inventoryCardId = assignment.inventory_card_id || assignment.gift_card_id;

  // Try to get card info from gift_card_inventory
  if (inventoryCardId) {
    const { data: inventoryCard } = await supabase
      .from('gift_card_inventory')
      .select(`
        denomination,
        gift_card_brands(brand_name)
      `)
      .eq('id', inventoryCardId)
      .single();

    if (inventoryCard) {
      cardValue = inventoryCard.denomination;
      brandName = (inventoryCard.gift_card_brands as { brand_name?: string })?.brand_name || null;
    }
  }

  // Try billing ledger if we don't have card value yet
  if (!cardValue) {
    const { data: billingEntry } = await supabase
      .from('gift_card_billing_ledger')
      .select(`
        denomination,
        gift_card_brands(brand_name)
      `)
      .eq('recipient_id', assignment.recipient_id)
      .eq('campaign_id', assignment.campaign_id)
      .order('billed_at', { ascending: false })
      .limit(1)
      .single();

    if (billingEntry) {
      cardValue = billingEntry.denomination;
      brandName = (billingEntry.gift_card_brands as { brand_name?: string })?.brand_name || brandName;
    }
  }

  // 1. Update recipient_gift_cards status to 'revoked'
  const { error: updateError } = await supabase
    .from('recipient_gift_cards')
    .update({
      delivery_status: 'revoked',
      revoked_at: now,
      revoked_by: context.user.id,
      revoke_reason: reason.trim()
    })
    .eq('id', assignmentId);

  if (updateError) {
    console.error('[REVOKE] Error updating recipient_gift_cards:', updateError);
    throw new ApiError(
      'Failed to revoke gift card. Please try again or contact support.',
      'DATABASE_ERROR',
      500
    );
  }

  // 2. Return card to inventory if applicable
  let cardReturnedToInventory = false;
  if (inventoryCardId) {
    const { error: inventoryError } = await supabase
      .from('gift_card_inventory')
      .update({
        status: 'available',
        assigned_to_recipient_id: null,
        assigned_to_campaign_id: null,
        assigned_at: null
      })
      .eq('id', inventoryCardId);

    if (inventoryError) {
      console.warn('[REVOKE] Failed to return card to inventory:', inventoryError);
      // Don't fail the whole operation - the revoke is still valid
    } else {
      cardReturnedToInventory = true;
      console.log(`[REVOKE] Card ${inventoryCardId} returned to inventory`);
    }
  }

  // 3. Create audit log entry
  const recipient = assignment.recipient as { first_name?: string; last_name?: string; phone?: string; email?: string } | null;
  const recipientName = recipient 
    ? `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
    : 'Unknown';

  const { error: logError } = await supabase
    .from('gift_card_revoke_log')
    .insert({
      recipient_gift_card_id: assignmentId,
      inventory_card_id: inventoryCardId,
      recipient_id: assignment.recipient_id,
      campaign_id: assignment.campaign_id,
      condition_id: assignment.condition_id,
      revoked_by: context.user.id,
      revoked_at: now,
      reason: reason.trim(),
      recipient_name: recipientName,
      recipient_phone: recipient?.phone || null,
      recipient_email: recipient?.email || null,
      card_value: cardValue,
      brand_name: brandName,
      original_delivery_status: originalStatus
    });

  if (logError) {
    console.error('[REVOKE] Failed to create audit log:', logError);
    // Don't fail - the revoke already happened
  }

  console.log(`[REVOKE] Gift card revoked: assignment=${assignmentId}, by=${context.user.id}, reason="${reason}"`);

  // Log activity
  await activityLogger.giftCard('card_revoked', 'success',
    `Gift card revoked for ${recipientName}`,
    {
      userId: context.user.id,
      recipientId: assignment.recipient_id,
      campaignId: assignment.campaign_id,
      brandName: brandName || undefined,
      amount: cardValue || undefined,
      metadata: {
        assignment_id: assignmentId,
        reason: reason.trim(),
        original_status: originalStatus,
        card_returned_to_inventory: cardReturnedToInventory,
      },
    }
  );

  return {
    message: 'Gift card successfully revoked',
    data: {
      assignmentId,
      recipientName,
      cardValue,
      brandName,
      originalStatus,
      revokedAt: now,
      revokedBy: context.user.id,
      cardReturnedToInventory,
    },
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleRevokeGiftCard, {
  requireAuth: true,
  requiredRole: 'admin',
  parseBody: true,
  auditAction: 'revoke_gift_card',
}));
