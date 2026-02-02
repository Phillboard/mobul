/**
 * Check Gift Card Balance Edge Function
 * 
 * Checks balances for gift cards in the legacy gift_cards table via Tillo API.
 * For inventory cards, use check-inventory-card-balance instead.
 * 
 * Requires authentication (admin or service role).
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { getTilloClient } from '../_shared/tillo-client.ts';
import { validateBalanceCheckRequest } from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface CheckBalanceRequest {
  cardIds?: string[];
  poolId?: string;
}

interface BalanceCheckResultItem {
  cardId: string;
  cardCode: string;
  previousBalance: number | null;
  newBalance: number;
  status: 'success' | 'error';
  error?: string;
}

interface CheckBalanceResponse {
  message: string;
  results: BalanceCheckResultItem[];
  checked: number;
  success: number;
  failed: number;
}

// ============================================================================
// Balance Check Logic
// ============================================================================

async function checkTilloBalance(
  cardCode: string,
  apiKey: string,
  secretKey: string
): Promise<{ balance: number; status: 'success' | 'error'; error?: string }> {
  try {
    // Use the shared Tillo client for consistency
    const tilloClient = getTilloClient();
    
    // Note: The checkBalance method needs brandCode. For legacy cards without brand info,
    // we use the stored pool config. This is a limitation of the legacy system.
    // The check-inventory-card-balance function handles this better with brand lookup.
    
    const timestamp = Date.now();
    const { createHmac } = await import("https://deno.land/std@0.177.0/node/crypto.ts");
    
    const signature = createHmac("sha256", secretKey)
      .update(timestamp.toString())
      .digest("base64");

    const response = await fetch(`https://api.tillo.tech/v2/balance`, {
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
  } catch (error) {
    console.error("[BALANCE-CHECK] Tillo balance check error:", error);
    return {
      balance: 0,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleCheckBalance(
  request: CheckBalanceRequest,
  context: { user: { id: string } | null; client: ReturnType<typeof createServiceClient> }
): Promise<CheckBalanceResponse> {
  const supabase = createServiceClient();
  const { cardIds, poolId } = request;

  if (!cardIds && !poolId) {
    throw new ApiError('Either cardIds or poolId must be provided', 'VALIDATION_ERROR', 400);
  }

  // Build query for cards with pool info
  let query = supabase
    .from("gift_cards")
    .select(`
      *,
      pool:gift_card_pools(
        api_provider,
        api_config
      )
    `);

  if (cardIds && Array.isArray(cardIds)) {
    query = query.in("id", cardIds);
  } else if (poolId) {
    query = query.eq("pool_id", poolId);
  }

  // Only check delivered cards with valid codes
  query = query.eq("status", "delivered").not("card_code", "is", null);

  const { data: cards, error: fetchError } = await query;

  if (fetchError) {
    throw new ApiError(`Failed to fetch cards: ${fetchError.message}`, 'DATABASE_ERROR', 500);
  }

  if (!cards || cards.length === 0) {
    return {
      message: "No cards to check",
      results: [],
      checked: 0,
      success: 0,
      failed: 0,
    };
  }

  const results: BalanceCheckResultItem[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const card of cards) {
    const pool = card.pool as { api_provider?: string; api_config?: { apiKey?: string; secretKey?: string } } | null;

    if (pool?.api_provider === "tillo" && pool?.api_config) {
      const { apiKey, secretKey } = pool.api_config;

      if (!apiKey || !secretKey) {
        console.warn(`[BALANCE-CHECK] Missing API credentials for card ${card.id}`);
        failedCount++;
        results.push({
          cardId: card.id,
          cardCode: card.card_code.slice(-4),
          previousBalance: card.current_balance,
          newBalance: 0,
          status: "error",
          error: "Missing API credentials",
        });
        continue;
      }

      const balanceResult = await checkTilloBalance(card.card_code, apiKey, secretKey);

      // Update card balance in database
      await supabase
        .from("gift_cards")
        .update({
          current_balance: balanceResult.balance,
          last_balance_check: new Date().toISOString(),
          balance_check_status: balanceResult.status,
        })
        .eq("id", card.id);

      // Record balance history
      await supabase.from("gift_card_balance_history").insert({
        gift_card_id: card.id,
        previous_balance: card.current_balance,
        new_balance: balanceResult.balance,
        change_amount: balanceResult.balance - (card.current_balance || 0),
        status: balanceResult.status,
        error_message: balanceResult.error,
      });

      if (balanceResult.status === "success") {
        successCount++;
      } else {
        failedCount++;
      }

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

  console.log(`[BALANCE-CHECK] Checked ${results.length} cards: ${successCount} success, ${failedCount} failed`);

  return {
    message: `Checked ${results.length} cards`,
    results,
    checked: results.length,
    success: successCount,
    failed: failedCount,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleCheckBalance, {
  requireAuth: true,
  requiredRole: ['admin', 'platform_admin'],
  parseBody: true,
  auditAction: 'check_gift_card_balance',
}));
