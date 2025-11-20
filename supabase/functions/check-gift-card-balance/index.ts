import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate Tillo HMAC signature
function generateTilloSignature(secretKey: string, timestamp: number, body?: string): string {
  const message = body ? `${timestamp}${body}` : timestamp.toString();
  return createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
}

async function checkTilloBalance(
  cardCode: string,
  apiKey: string,
  secretKey: string
): Promise<{ balance: number; status: string; error?: string }> {
  try {
    const timestamp = Date.now();
    const signature = generateTilloSignature(secretKey, timestamp);

    // Tillo balance check endpoint
    const response = await fetch(`https://api.tillo.tech/v2/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "API-Key": apiKey,
        "Signature": signature,
        "Timestamp": timestamp.toString(),
      },
      body: JSON.stringify({
        code: cardCode,
      }),
    });

    const data = await response.json();

    if (data.code === "000") {
      return {
        balance: data.data.balance.amount,
        status: "success",
      };
    } else {
      return {
        balance: 0,
        status: "error",
        error: data.message || "Unknown error",
      };
    }
  } catch (error: any) {
    console.error("Tillo balance check error:", error);
    return {
      balance: 0,
      status: "error",
      error: error.message,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { cardIds, poolId } = await req.json();

    if (!cardIds && !poolId) {
      throw new Error("Either cardIds or poolId must be provided");
    }

    // Get cards to check
    let query = supabaseClient
      .from("gift_cards")
      .select(`
        *,
        pool:gift_card_pools(
          api_provider,
          api_config
        )
      `);

    if (cardIds) {
      query = query.in("id", cardIds);
    } else if (poolId) {
      query = query.eq("pool_id", poolId);
    }

    query = query.eq("status", "delivered").not("card_code", "is", null);

    const { data: cards, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ message: "No cards to check", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const card of cards) {
      const pool = card.pool as any;
      
      if (pool?.api_provider === "tillo" && pool?.api_config) {
        const { apiKey, secretKey } = pool.api_config;

        if (!apiKey || !secretKey) {
          console.warn(`Missing API credentials for card ${card.id}`);
          continue;
        }

        const balanceResult = await checkTilloBalance(
          card.card_code,
          apiKey,
          secretKey
        );

        // Update card balance
        await supabaseClient
          .from("gift_cards")
          .update({
            current_balance: balanceResult.balance,
            last_balance_check: new Date().toISOString(),
            balance_check_status: balanceResult.status,
          })
          .eq("id", card.id);

        // Record balance history
        await supabaseClient.from("gift_card_balance_history").insert({
          gift_card_id: card.id,
          previous_balance: card.current_balance,
          new_balance: balanceResult.balance,
          change_amount: balanceResult.balance - (card.current_balance || 0),
          status: balanceResult.status,
          error_message: balanceResult.error,
        });

        results.push({
          cardId: card.id,
          cardCode: card.card_code.slice(-4),
          previousBalance: card.current_balance,
          newBalance: balanceResult.balance,
          status: balanceResult.status,
          error: balanceResult.error,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${results.length} cards`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error checking balances:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});