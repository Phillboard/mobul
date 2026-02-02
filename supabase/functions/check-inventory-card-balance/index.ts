/**
 * Check Inventory Card Balance Edge Function
 * 
 * Checks balances for cards in gift_card_inventory table.
 * Supports multiple balance check methods per brand:
 * - tillo_api: Use Tillo's balance check API (auto-detected for Tillo brands)
 * - other_api: Generic API with configurable endpoint
 * - manual: Requires manual balance entry (returns info only)
 * - none: Balance checking not supported
 * 
 * Smart Detection: If balance_check_method is not set, the function will
 * automatically use Tillo API for brands with provider='tillo' or tillo_brand_code set.
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { createTilloClientFromEnv, TilloClient } from '../_shared/tillo-client.ts';
import { 
  determineBalanceCheckMethod, 
  validateBalanceCheckRequest,
  type BalanceCheckResult,
} from '../_shared/business-rules/gift-card-rules.ts';

// ============================================================================
// Types
// ============================================================================

interface CheckInventoryBalanceRequest {
  cardIds?: string[];
  brandId?: string;
  denomination?: number;
  statusFilter?: string;
  limit?: number;
  userId?: string;
}

interface BrandConfig {
  balance_check_method: string | null;
  balance_check_api_endpoint?: string;
  balance_check_config?: Record<string, unknown>;
  tillo_brand_code?: string;
  provider?: string;
  brand_code?: string;
}

interface InventoryCard {
  id: string;
  card_code: string;
  brand_id: string;
  denomination: number;
  current_balance: number | null;
  gift_card_brands: BrandConfig;
}

interface BalanceCheckResultItem {
  cardId: string;
  cardCodeLast4: string;
  brandId: string;
  previousBalance: number | null;
  newBalance: number | null;
  status: string;
  error?: string;
}

interface CheckInventoryBalanceResponse {
  message: string;
  results: BalanceCheckResultItem[];
  summary: {
    checked: number;
    success: number;
    error: number;
    manual: number;
    notSupported: number;
  };
}

// ============================================================================
// Balance Check Logic
// ============================================================================

// Cached Tillo client instance
let tilloClient: TilloClient | null = null;

function getTilloClient(): TilloClient | null {
  if (tilloClient) return tilloClient;
  
  try {
    tilloClient = createTilloClientFromEnv();
    return tilloClient;
  } catch (error) {
    console.warn("[BALANCE-CHECK] Tillo client not available:", (error as Error).message);
    return null;
  }
}

async function checkTilloBalance(
  cardCode: string,
  brandCode: string
): Promise<BalanceCheckResult> {
  try {
    const client = getTilloClient();
    
    if (!client) {
      return {
        balance: null,
        status: "error",
        error: "Tillo API credentials not configured. Set TILLO_API_KEY and TILLO_SECRET_KEY environment variables.",
      };
    }

    if (!brandCode) {
      return {
        balance: null,
        status: "error",
        error: "Brand code is required for Tillo balance check",
      };
    }

    console.log(`[BALANCE-CHECK] Checking balance via Tillo API for brand: ${brandCode}`);
    
    const result = await client.checkBalance(cardCode, brandCode);
    
    return {
      balance: result.balance,
      status: "success",
    };
  } catch (error) {
    console.error("[BALANCE-CHECK] Tillo balance check error:", error);
    return {
      balance: null,
      status: "error",
      error: (error as Error).message,
    };
  }
}

async function checkGenericApiBalance(
  cardCode: string,
  endpoint: string,
  config: Record<string, unknown>
): Promise<BalanceCheckResult> {
  try {
    const {
      method = "POST",
      headers = {},
      bodyTemplate,
      responseBalancePath,
    } = config as {
      method?: string;
      headers?: Record<string, string>;
      bodyTemplate?: unknown;
      responseBalancePath?: string;
    };

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

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

    let balance: number | null = null;
    if (responseBalancePath) {
      const paths = responseBalancePath.split(".");
      let value: unknown = data;
      for (const path of paths) {
        value = (value as Record<string, unknown>)?.[path];
      }
      balance = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(balance)) balance = null;
    }

    if (balance !== null) {
      return { balance, status: "success" };
    } else {
      return {
        balance: null,
        status: "error",
        error: "Could not extract balance from API response",
      };
    }
  } catch (error) {
    console.error("[BALANCE-CHECK] Generic API balance check error:", error);
    return {
      balance: null,
      status: "error",
      error: (error as Error).message,
    };
  }
}

async function checkCardBalance(card: InventoryCard): Promise<BalanceCheckResult> {
  const brand = card.gift_card_brands;
  
  // Determine balance check method using business rules
  const method = determineBalanceCheckMethod(
    brand.balance_check_method,
    brand.provider || null,
    brand.tillo_brand_code || null
  );

  console.log(`[BALANCE-CHECK] Using method '${method}' for card ${card.id}`);

  switch (method) {
    case "tillo_api": {
      const brandCode = brand.tillo_brand_code || brand.brand_code;
      const validation = validateBalanceCheckRequest(card.card_code, brandCode || null, method);
      
      if (!validation.valid) {
        return {
          balance: null,
          status: "error",
          error: validation.error,
        };
      }
      
      return await checkTilloBalance(card.card_code, brandCode!);
    }

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

// ============================================================================
// Main Handler
// ============================================================================

async function handleCheckInventoryBalance(
  request: CheckInventoryBalanceRequest,
  context: { user: { id: string } | null }
): Promise<CheckInventoryBalanceResponse> {
  const supabase = createServiceClient();
  
  const { 
    cardIds,
    brandId,
    denomination,
    statusFilter = "available",
    limit = 100,
    userId,
  } = request;

  if (!cardIds && !brandId) {
    throw new ApiError('Either cardIds or brandId must be provided', 'VALIDATION_ERROR', 400);
  }

  // Build query for inventory cards with brand info
  let query = supabase
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
        tillo_brand_code,
        provider,
        brand_code
      )
    `)
    .not("card_code", "is", null)
    .limit(limit);

  if (cardIds && Array.isArray(cardIds)) {
    query = query.in("id", cardIds);
  } else if (brandId) {
    query = query.eq("brand_id", brandId);
    if (denomination) {
      query = query.eq("denomination", denomination);
    }
  }

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: cards, error: fetchError } = await query;

  if (fetchError) {
    throw new ApiError(`Failed to fetch cards: ${fetchError.message}`, 'DATABASE_ERROR', 500);
  }

  if (!cards || cards.length === 0) {
    return {
      message: "No cards found to check",
      results: [],
      summary: { checked: 0, success: 0, error: 0, manual: 0, notSupported: 0 },
    };
  }

  const results: BalanceCheckResultItem[] = [];
  const summary = {
    checked: 0,
    success: 0,
    error: 0,
    manual: 0,
    notSupported: 0,
  };

  for (const card of cards as InventoryCard[]) {
    summary.checked++;

    // Rate limit protection
    if (summary.checked > 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const balanceResult = await checkCardBalance(card);

    // Update database for success/error
    if (balanceResult.status === "success" || balanceResult.status === "error") {
      await supabase
        .from("gift_card_inventory")
        .update({
          current_balance: balanceResult.balance,
          last_balance_check: new Date().toISOString(),
          balance_check_status: balanceResult.status,
          balance_check_error: balanceResult.error || null,
        })
        .eq("id", card.id);

      // Determine actual method used for audit
      const brand = card.gift_card_brands;
      const methodUsed = determineBalanceCheckMethod(
        brand.balance_check_method,
        brand.provider || null,
        brand.tillo_brand_code || null
      );

      // Record history
      await supabase
        .from("gift_card_inventory_balance_history")
        .insert({
          inventory_card_id: card.id,
          previous_balance: card.current_balance,
          new_balance: balanceResult.balance,
          check_method: methodUsed,
          check_status: balanceResult.status,
          error_message: balanceResult.error,
          checked_by_user_id: userId || context.user?.id || null,
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

  console.log(`[BALANCE-CHECK] Checked ${summary.checked} inventory cards: ${summary.success} success, ${summary.error} error`);

  return {
    message: `Checked ${summary.checked} cards`,
    results,
    summary,
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleCheckInventoryBalance, {
  requireAuth: true,
  requiredRole: ['admin', 'platform_admin', 'client_admin'],
  parseBody: true,
  auditAction: 'check_inventory_card_balance',
}));
