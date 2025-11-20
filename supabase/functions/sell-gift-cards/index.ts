import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify admin user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      throw new Error("Only admins can sell gift cards");
    }

    const { clientId, poolId, quantity, pricePerCard } = await req.json();

    if (!clientId || !poolId || !quantity || !pricePerCard) {
      throw new Error("Missing required fields");
    }

    const totalAmount = quantity * pricePerCard;

    // Get client's current credits
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("credits")
      .eq("id", clientId)
      .single();

    if (clientError) throw clientError;

    if (client.credits < totalAmount) {
      throw new Error(
        `Insufficient wallet balance. Client has ${client.credits} credits but needs ${totalAmount}`
      );
    }

    // Check if pool has enough cards
    const { data: pool, error: poolError } = await supabaseClient
      .from("gift_card_pools")
      .select("available_cards, pool_name, card_value")
      .eq("id", poolId)
      .single();

    if (poolError) throw poolError;

    if (pool.available_cards < quantity) {
      throw new Error(
        `Insufficient cards in pool. Only ${pool.available_cards} available, requested ${quantity}`
      );
    }

    // Get available cards from pool
    const { data: cards, error: cardsError } = await supabaseClient
      .from("gift_cards")
      .select("id")
      .eq("pool_id", poolId)
      .eq("status", "available")
      .limit(quantity);

    if (cardsError) throw cardsError;
    if (cards.length < quantity) {
      throw new Error("Unable to retrieve enough available cards");
    }

    const cardIds = cards.map((c) => c.id);

    // Start transaction-like operations
    // 1. Deduct credits from client
    const { error: deductError } = await supabaseClient
      .from("clients")
      .update({ credits: client.credits - totalAmount })
      .eq("id", clientId);

    if (deductError) throw deductError;

    // 2. Mark cards as claimed
    const { error: claimError } = await supabaseClient
      .from("gift_cards")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .in("id", cardIds);

    if (claimError) {
      // Rollback credits
      await supabaseClient
        .from("clients")
        .update({ credits: client.credits })
        .eq("id", clientId);
      throw claimError;
    }

    // 3. Update pool counts
    const { data: currentPool } = await supabaseClient
      .from("gift_card_pools")
      .select("claimed_cards")
      .eq("id", poolId)
      .single();

    const { error: poolUpdateError } = await supabaseClient
      .from("gift_card_pools")
      .update({
        available_cards: pool.available_cards - quantity,
        claimed_cards: (currentPool?.claimed_cards || 0) + quantity,
      })
      .eq("id", poolId);

    if (poolUpdateError) throw poolUpdateError;

    // 4. Record the sale
    const { error: saleError } = await supabaseClient
      .from("gift_card_sales")
      .insert({
        client_id: clientId,
        pool_id: poolId,
        quantity,
        price_per_card: pricePerCard,
        total_amount: totalAmount,
        sold_by_user_id: user.id,
        notes: `Sold ${quantity}x ${pool.pool_name} cards`,
      });

    if (saleError) throw saleError;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully sold ${quantity} gift cards`,
        transaction: {
          quantity,
          totalAmount,
          remainingCredits: client.credits - totalAmount,
          poolName: pool.pool_name,
          cardValue: pool.card_value,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error selling gift cards:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});