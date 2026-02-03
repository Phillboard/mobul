/**
 * Edge Function: transfer-admin-cards
 * 
 * Purpose: Transfer gift cards from admin master pool to a client pool
 * Called by: AdminGiftCardMarketplace (SellGiftCardsDialog component)
 * 
 * Permissions: Requires admin authentication
 * 
 * Request Body:
 * - masterPoolId: string (UUID) - ID of the master pool to transfer from
 * - buyerClientId: string (UUID) - ID of the client purchasing the cards
 * - quantity: number - Number of cards to transfer
 * - pricePerCard: number - Sale price per card (client pays this amount)
 * - soldByUserId: string (UUID) - ID of admin user making the sale
 * - notes: string (optional) - Additional notes about the transfer
 * 
 * Response:
 * - success: boolean
 * - message: string - Success/error message
 * - targetPoolId: string (UUID) - ID of the client pool that received the cards
 * - totalAmount: number - Total amount charged to client
 * - remainingBalance: number - Client's remaining wallet balance
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { validateAdminTransfer } from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface TransferRequest {
  masterPoolId: string;
  buyerClientId: string;
  quantity: number;
  pricePerCard: number;
  soldByUserId: string;
  notes?: string;
}

interface TransferResponse {
  message: string;
  targetPoolId: string;
  totalAmount: number;
  remainingBalance: number;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleTransferAdminCards(
  request: TransferRequest,
  context: AuthContext
): Promise<TransferResponse> {
  const supabase = createServiceClient();
  
  const { masterPoolId, buyerClientId, quantity, pricePerCard, soldByUserId, notes } = request;

  // Validate required fields
  if (!masterPoolId || !buyerClientId || !quantity || !pricePerCard) {
    throw new ApiError(
      'Missing required fields: masterPoolId, buyerClientId, quantity, pricePerCard',
      'VALIDATION_ERROR',
      400
    );
  }

  console.log('[TRANSFER] Request:', { masterPoolId, buyerClientId, quantity, pricePerCard });

  // 1. Verify master pool has sufficient cards
  const { data: masterPool, error: poolError } = await supabase
    .from('gift_card_pools')
    .select('*, gift_card_brands(brand_name)')
    .eq('id', masterPoolId)
    .eq('is_master_pool', true)
    .single();

  if (poolError || !masterPool) {
    throw new ApiError('Master pool not found or not a master pool', 'NOT_FOUND', 404);
  }

  // 2. Verify client exists and has sufficient wallet balance
  const totalAmount = quantity * pricePerCard;
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('credits, name')
    .eq('id', buyerClientId)
    .single();

  if (clientError || !client) {
    throw new ApiError('Client not found', 'NOT_FOUND', 404);
  }

  // Validate transfer using business rules
  const validation = validateAdminTransfer(
    masterPool.available_cards || 0,
    quantity,
    client.credits || 0,
    totalAmount
  );

  if (!validation.valid) {
    throw new ApiError(validation.errors.join('; '), 'VALIDATION_ERROR', 400);
  }

  // 3. Find or create target client pool
  let targetPoolId: string;
  
  const { data: existingPools } = await supabase
    .from('gift_card_pools')
    .select('id')
    .eq('client_id', buyerClientId)
    .eq('brand_id', masterPool.brand_id)
    .eq('card_value', masterPool.card_value)
    .eq('is_master_pool', false)
    .limit(1);

  if (existingPools && existingPools.length > 0) {
    targetPoolId = existingPools[0].id;
    console.log('[TRANSFER] Using existing client pool:', targetPoolId);
  } else {
    // Create new pool for client
    const brandInfo = masterPool.gift_card_brands as { brand_name?: string } | null;
    const { data: newPool, error: createError } = await supabase
      .from('gift_card_pools')
      .insert({
        client_id: buyerClientId,
        brand_id: masterPool.brand_id,
        pool_name: `${brandInfo?.brand_name || 'Gift Card'} Pool`,
        card_value: masterPool.card_value,
        provider: masterPool.provider,
        is_master_pool: false,
        available_cards: 0,
        total_cards: 0,
        claimed_cards: 0,
        delivered_cards: 0,
        failed_cards: 0,
      })
      .select()
      .single();

    if (createError || !newPool) {
      throw new ApiError(`Failed to create client pool: ${createError?.message}`, 'DATABASE_ERROR', 500);
    }

    targetPoolId = newPool.id;
    console.log('[TRANSFER] Created new client pool:', targetPoolId);
  }

  // 4. Get available cards from inventory (linked to master pool)
  const { data: inventoryCards, error: invError } = await supabase
    .from('gift_card_inventory')
    .select('id')
    .eq('legacy_pool_id', masterPoolId)
    .eq('status', 'available')
    .is('assigned_to_recipient_id', null)
    .limit(quantity);

  // Fallback to legacy gift_cards if no inventory cards found
  let cardIds: string[];
  let usedLegacy = false;

  if (inventoryCards && inventoryCards.length >= quantity) {
    cardIds = inventoryCards.map(c => c.id);

    // 5. Transfer cards (update legacy_pool_id to target pool)
    const { error: transferError } = await supabase
      .from('gift_card_inventory')
      .update({ legacy_pool_id: targetPoolId })
      .in('id', cardIds);

    if (transferError) {
      throw new ApiError(`Failed to transfer cards: ${transferError.message}`, 'DATABASE_ERROR', 500);
    }
  } else {
    // Fallback: try legacy gift_cards table
    const { data: legacyCards, error: legacyError } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('pool_id', masterPoolId)
      .eq('status', 'available')
      .limit(quantity);

    if (legacyError || !legacyCards || legacyCards.length < quantity) {
      const availableCount = (inventoryCards?.length || 0) + (legacyCards?.length || 0);
      throw new ApiError(
        `Could not find ${quantity} available cards in master pool (found ${availableCount})`,
        'VALIDATION_ERROR',
        400
      );
    }

    cardIds = legacyCards.map(c => c.id);
    usedLegacy = true;

    const { error: transferError } = await supabase
      .from('gift_cards')
      .update({ pool_id: targetPoolId })
      .in('id', cardIds);

    if (transferError) {
      throw new ApiError(`Failed to transfer cards: ${transferError.message}`, 'DATABASE_ERROR', 500);
    }
  }

  // 6. Update master pool counts
  const { error: masterPoolUpdateError } = await supabase
    .from('gift_card_pools')
    .update({
      available_cards: (masterPool.available_cards || 0) - quantity,
      total_cards: (masterPool.total_cards || 0) - quantity,
    })
    .eq('id', masterPoolId);

  if (masterPoolUpdateError) {
    console.error('[TRANSFER] Failed to update master pool counts:', masterPoolUpdateError);
  }

  // 7. Update target pool counts
  const { data: targetPool } = await supabase
    .from('gift_card_pools')
    .select('available_cards, total_cards')
    .eq('id', targetPoolId)
    .single();

  const { error: targetPoolUpdateError } = await supabase
    .from('gift_card_pools')
    .update({
      available_cards: (targetPool?.available_cards || 0) + quantity,
      total_cards: (targetPool?.total_cards || 0) + quantity,
    })
    .eq('id', targetPoolId);

  if (targetPoolUpdateError) {
    console.error('[TRANSFER] Failed to update target pool counts:', targetPoolUpdateError);
  }

  // 8. Deduct from client wallet
  const newCredits = (client.credits || 0) - totalAmount;
  const { error: walletError } = await supabase
    .from('clients')
    .update({ credits: newCredits })
    .eq('id', buyerClientId);

  if (walletError) {
    console.error('[TRANSFER] Failed to deduct from client wallet:', walletError);
    // Note: In production, this should be part of a transaction
  }

  // 9. Query actual cost from admin_gift_card_inventory
  const { data: inventoryData } = await supabase
    .from('admin_gift_card_inventory')
    .select('cost_per_card')
    .eq('brand_id', masterPool.brand_id)
    .order('purchase_date', { ascending: false })
    .limit(1)
    .single();
  
  const costPerCard = inventoryData?.cost_per_card || 0;
  
  if (!inventoryData) {
    console.warn(`[TRANSFER] No inventory cost found for brand ${masterPool.brand_id}, using cost = 0`);
  }
  
  const profit = totalAmount - (costPerCard * quantity);
  
  // 10. Create admin_card_sales record
  const { error: salesError } = await supabase
    .from('admin_card_sales')
    .insert({
      master_pool_id: masterPoolId,
      buyer_client_id: buyerClientId,
      buyer_pool_id: targetPoolId,
      quantity: quantity,
      price_per_card: pricePerCard,
      total_amount: totalAmount,
      cost_per_card: costPerCard,
      profit: profit,
      sold_by_user_id: soldByUserId || context.user.id,
      notes: notes,
    });

  if (salesError) {
    console.error('[TRANSFER] Failed to record sale:', salesError);
  }

  // 11. Create audit log
  const { error: auditError } = await supabase
    .from('gift_card_audit_log')
    .insert({
      entity_type: 'gift_card_transfer',
      entity_id: masterPoolId,
      action: 'transfer_to_client',
      user_id: context.user.id,
      changes: {
        master_pool_id: masterPoolId,
        target_pool_id: targetPoolId,
        buyer_client_id: buyerClientId,
        quantity: quantity,
        total_amount: totalAmount,
      },
      metadata: {
        card_ids: cardIds,
        client_name: client.name,
      },
    });

  if (auditError) {
    console.error('[TRANSFER] Failed to create audit log:', auditError);
  }

  console.log('[TRANSFER] Completed successfully');

  return {
    message: `Successfully transferred ${quantity} cards to ${client.name}`,
    targetPoolId: targetPoolId,
    totalAmount: totalAmount,
    remainingBalance: newCredits,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleTransferAdminCards, {
  requireAuth: true,
  requiredRole: 'admin',
  parseBody: true,
  auditAction: 'transfer_admin_cards',
}));
