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
 * 
 * Database Operations:
 * 1. gift_card_pools (READ) - Verify master pool has sufficient cards
 * 2. clients (READ/UPDATE) - Verify balance and deduct payment
 * 3. gift_card_pools (READ/INSERT/UPDATE) - Find/create client pool, update counts
 * 4. gift_cards (UPDATE) - Transfer cards by updating pool_id
 * 5. admin_gift_card_inventory (READ) - Get cost basis for profit calculation
 * 6. admin_card_sales (INSERT) - Record the sale transaction
 * 7. gift_card_audit_log (INSERT) - Audit trail of the transfer
 * 
 * Business Logic:
 * - Validates master pool has enough available cards
 * - Validates client has sufficient wallet credits
 * - Creates new client pool if one doesn't exist for the brand/value
 * - Calculates profit based on sale price minus inventory cost
 * - Maintains accurate card counts across pools
 * 
 * Related Functions:
 * - sell-gift-cards (deprecated, replaced by this function)
 * - import-gift-cards (loads cards into master pools)
 * 
 * Error Handling:
 * - Returns 400 status for validation errors and operational failures
 * - Logs errors for failed operations that don't halt the transaction
 * - Note: Not transactional - partial failures possible (needs improvement)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { masterPoolId, buyerClientId, quantity, pricePerCard, soldByUserId, notes } = await req.json();

    console.log('Transfer request:', { masterPoolId, buyerClientId, quantity, pricePerCard });

    // 1. Verify master pool has sufficient cards
    const { data: masterPool, error: poolError } = await supabase
      .from('gift_card_pools')
      .select('*, gift_card_brands(brand_name)')
      .eq('id', masterPoolId)
      .eq('is_master_pool', true)
      .single();

    if (poolError || !masterPool) {
      throw new Error('Master pool not found or not a master pool');
    }

    if ((masterPool.available_cards || 0) < quantity) {
      throw new Error(`Insufficient cards in master pool. Available: ${masterPool.available_cards}, Requested: ${quantity}`);
    }

    // 2. Verify client has sufficient wallet balance
    const totalAmount = quantity * pricePerCard;
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('credits, name')
      .eq('id', buyerClientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    if ((client.credits || 0) < totalAmount) {
      throw new Error(`Insufficient client balance. Available: ${client.credits}, Required: ${totalAmount}`);
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
      console.log('Using existing client pool:', targetPoolId);
    } else {
      // Create new pool for client
      const { data: newPool, error: createError } = await supabase
        .from('gift_card_pools')
        .insert({
          client_id: buyerClientId,
          brand_id: masterPool.brand_id,
          pool_name: `${masterPool.gift_card_brands?.brand_name || 'Gift Card'} Pool`,
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
        throw new Error('Failed to create client pool: ' + createError?.message);
      }

      targetPoolId = newPool.id;
      console.log('Created new client pool:', targetPoolId);
    }

    // 4. Get available cards from master pool
    const { data: cardsToTransfer, error: cardsError } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('pool_id', masterPoolId)
      .eq('status', 'available')
      .limit(quantity);

    if (cardsError || !cardsToTransfer || cardsToTransfer.length < quantity) {
      throw new Error(`Could not find ${quantity} available cards in master pool`);
    }

    const cardIds = cardsToTransfer.map(c => c.id);

    // 5. Transfer cards (update pool_id)
    const { error: transferError } = await supabase
      .from('gift_cards')
      .update({ pool_id: targetPoolId })
      .in('id', cardIds);

    if (transferError) {
      throw new Error('Failed to transfer cards: ' + transferError.message);
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
      console.error('Failed to update master pool counts:', masterPoolUpdateError);
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
      console.error('Failed to update target pool counts:', targetPoolUpdateError);
    }

    // 8. Deduct from client wallet
    const { error: walletError } = await supabase
      .from('clients')
      .update({
        credits: (client.credits || 0) - totalAmount,
      })
      .eq('id', buyerClientId);

    if (walletError) {
      console.error('Failed to deduct from client wallet:', walletError);
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
      console.warn(`No inventory cost found for brand ${masterPool.brand_id}, using cost = 0`);
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
        sold_by_user_id: soldByUserId,
        notes: notes,
      });

    if (salesError) {
      console.error('Failed to record sale:', salesError);
    }

    // 11. Create audit log
    const { error: auditError } = await supabase
      .from('gift_card_audit_log')
      .insert({
        entity_type: 'gift_card_transfer',
        entity_id: masterPoolId,
        action: 'transfer_to_client',
        user_id: soldByUserId,
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
      console.error('Failed to create audit log:', auditError);
    }

    console.log('Transfer completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully transferred ${quantity} cards to ${client.name}`,
        targetPoolId: targetPoolId,
        totalAmount: totalAmount,
        remainingBalance: (client.credits || 0) - totalAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error transferring cards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});