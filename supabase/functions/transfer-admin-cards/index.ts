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

    // 9. Create admin_card_sales record
    const costPerCard = 0; // TODO: Track actual cost from admin_gift_card_inventory
    const profit = totalAmount - (costPerCard * quantity);

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

    // 10. Create audit log
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