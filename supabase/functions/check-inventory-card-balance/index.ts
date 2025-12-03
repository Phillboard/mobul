/**
 * Check Inventory Card Balance Edge Function
 * 
 * Checks balances for cards in gift_card_inventory table
 * Supports multiple balance check methods per brand:
 * - tillo_api: Use Tillo's balance check API
 * - other_api: Generic API with configurable endpoint
 * - manual: Requires manual balance entry (returns info only)
 * - none: Balance checking not supported
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BalanceCheckResult {
  balance: number | null;
  status: "success" | "error" | "manual_required" | "not_supported";
  error?: string;
}

interface BrandConfig {
  balance_check_method: string;
  balance_check_api_endpoint?: string;
  balance_check_config?: Record<string, any>;
  tillo_brand_code?: string;
}

interface InventoryCard {
  id: string;
  card_code: string;
  brand_id: string;
  denomination: number;
  current_balance: number | null;
  gift_card_brands: BrandConfig;
}

// Generate Tillo HMAC signature
function generateTilloSignature(secretKey: string, timestamp: number, body?: string): string {
  const message = body ? `${timestamp}${body}` : timestamp.toString();
  return createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
}

// Check balance using Tillo API
async function checkTilloBalance(
  cardCode: string,
  config: Record<string, any>
): Promise<BalanceCheckResult> {
  try {
    const { apiKey, secretKey } = config;
    
    if (!apiKey || !secretKey) {
      return {
        balance: null,
        status: "error",
        error: "Missing Tillo API credentials in brand configuration",
      };
    }

    const timestamp = Date.now();
    const signature = generateTilloSignature(secretKey, timestamp);

    const response = await fetch("https://api.tillo.tech/v2/balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "API-Key": apiKey,
        "Signature": signature,
        "Timestamp": timestamp.toString(),
      },
      body: JSON.stringify({ code: cardCode }),
    });

    const data = await response.json();

    if (data.code === "000") {
      return {
        balance: data.data?.balance?.amount ?? 0,
        status: "success",
      };
    } else {
      return {
        balance: null,
        status: "error",
        error: data.message || `Tillo error code: ${data.code}`,
      };
    }
  } catch (error: any) {
    console.error("Tillo balance check error:", error);
    return {
      balance: null,
      status: "error",
      error: error.message,
    };
  }
}

// Check balance using generic API endpoint
async function checkGenericApiBalance(
  cardCode: string,
  endpoint: string,
  config: Record<string, any>
): Promise<BalanceCheckResult> {
  try {
    const {
      method = "POST",
      headers = {},
      bodyTemplate,
      responseBalancePath,
    } = config;

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    // Prepare body (replace {{cardCode}} placeholder)
    let body: string | undefined;
    if (bodyTemplate) {
      body = JSON.stringify(bodyTemplate).replace(/\{\{cardCode\}\}/g, cardCode);
    } else {
      body = JSON.stringify({ code: cardCode });
    }

    const response = await fetch(endpoint, {
      method,
      headers: requestHeaders,
      body: method !== "GET" ? body : undefined,
    });

    const data = await response.json();

    // Extract balance from response using path (e.g., "data.balance.amount")
    let balance: number | null = null;
    if (responseBalancePath) {
      const paths = responseBalancePath.split(".");
      let value = data;
      for (const path of paths) {
        value = value?.[path];
      }
      balance = typeof value === "number" ? value : parseFloat(value);
      if (isNaN(balance)) balance = null;
    }

    if (balance !== null) {
      return {
        balance,
        status: "success",
      };
    } else {
      return {
        balance: null,
        status: "error",
        error: "Could not extract balance from API response",
      };
    }
  } catch (error: any) {
    console.error("Generic API balance check error:", error);
    return {
      balance: null,
      status: "error",
      error: error.message,
    };
  }
}

// Main balance check orchestrator
async function checkCardBalance(
  card: InventoryCard
): Promise<BalanceCheckResult> {
  const brand = card.gift_card_brands;
  const method = brand.balance_check_method || "manual";

  switch (method) {
    case "tillo_api":
      return await checkTilloBalance(
        card.card_code,
        brand.balance_check_config || {}
      );

    case "other_api":
      if (!brand.balance_check_api_endpoint) {
        return {
          balance: null,
          status: "error",
          error: "No API endpoint configured for balance checking",
        };
      }
      return await checkGenericApiBalance(
        card.card_code,
        brand.balance_check_api_endpoint,
        brand.balance_check_config || {}
      );

    case "manual":
      return {
        balance: card.current_balance,
        status: "manual_required",
        error: "This brand requires manual balance entry",
      };

    case "none":
    default:
      return {
        balance: null,
        status: "not_supported",
        error: "Balance checking not supported for this brand",
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

    const body = await req.json();
    const { 
      cardIds,           // Array of specific card IDs to check
      brandId,           // Check all cards of a specific brand
      denomination,      // Optional: filter by denomination
      statusFilter = "available", // Which card statuses to check
      limit = 100,       // Max cards to check in one request
      userId,            // User who initiated the check (for audit)
    } = body;

    if (!cardIds && !brandId) {
      throw new Error("Either cardIds or brandId must be provided");
    }

    // Build query for inventory cards
    let query = supabaseClient
      .from("gift_card_inventory")
      .select(`
        id,
        card_code,
        brand_id,
        denomination,
        current_balance,
        gift_card_brands (
          balance_check_method,
          balance_check_api_endpoint,
          balance_check_config,
          tillo_brand_code
        )
      `)
      .not("card_code", "is", null)
      .limit(limit);

    // Apply filters
    if (cardIds && Array.isArray(cardIds)) {
      query = query.in("id", cardIds);
    } else if (brandId) {
      query = query.eq("brand_id", brandId);
      if (denomination) {
        query = query.eq("denomination", denomination);
      }
    }

    // Filter by status if specified
    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: cards, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!cards || cards.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No cards found to check", 
          results: [],
          summary: { checked: 0, success: 0, error: 0, manual: 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      cardId: string;
      cardCodeLast4: string;
      brandId: string;
      previousBalance: number | null;
      newBalance: number | null;
      status: string;
      error?: string;
    }> = [];

    const summary = {
      checked: 0,
      success: 0,
      error: 0,
      manual: 0,
      notSupported: 0,
    };

    // Process each card
    for (const card of cards as InventoryCard[]) {
      summary.checked++;

      // Add small delay to avoid rate limiting
      if (summary.checked > 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const balanceResult = await checkCardBalance(card);

      // Update card in database (only for success or error)
      if (balanceResult.status === "success" || balanceResult.status === "error") {
        await supabaseClient
          .from("gift_card_inventory")
          .update({
            current_balance: balanceResult.balance,
            last_balance_check: new Date().toISOString(),
            balance_check_status: balanceResult.status,
            balance_check_error: balanceResult.error || null,
          })
          .eq("id", card.id);

        // Record in history
        await supabaseClient
          .from("gift_card_inventory_balance_history")
          .insert({
            inventory_card_id: card.id,
            previous_balance: card.current_balance,
            new_balance: balanceResult.balance,
            check_method: card.gift_card_brands.balance_check_method || "unknown",
            check_status: balanceResult.status,
            error_message: balanceResult.error,
            checked_by_user_id: userId || null,
          });
      }

      // Update summary
      switch (balanceResult.status) {
        case "success":
          summary.success++;
          break;
        case "error":
          summary.error++;
          break;
        case "manual_required":
          summary.manual++;
          break;
        case "not_supported":
          summary.notSupported++;
          break;
      }

      results.push({
        cardId: card.id,
        cardCodeLast4: card.card_code.slice(-4),
        brandId: card.brand_id,
        previousBalance: card.current_balance,
        newBalance: balanceResult.balance,
        status: balanceResult.status,
        error: balanceResult.error,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${summary.checked} cards`,
        results,
        summary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error checking inventory balances:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

