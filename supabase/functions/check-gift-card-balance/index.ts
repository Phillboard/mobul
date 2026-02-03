/**
 * Check Gift Card Balance Edge Function
 *
 * Delegates to check-inventory-card-balance with source='legacy'.
 * This function is kept for backward compatibility - all balance checking
 * logic is now unified in check-inventory-card-balance.
 *
 * Requires authentication (admin or service role).
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';

// ============================================================================
// Types
// ============================================================================

interface CheckBalanceRequest {
  cardIds?: string[];
  poolId?: string;
  cardId?: string;
  brandCode?: string;
}

interface CheckBalanceResponse {
  message: string;
  results: unknown[];
  checked: number;
  success: number;
  failed: number;
}

// ============================================================================
// Main Handler - Delegates to check-inventory-card-balance
// ============================================================================

async function handleCheckBalance(
  request: CheckBalanceRequest,
  context: { user: { id: string } | null }
): Promise<CheckBalanceResponse> {
  const supabase = createServiceClient();

  // Normalize: single cardId → cardIds array for consistency
  const cardIds = request.cardIds || (request.cardId ? [request.cardId] : undefined);

  console.log('[BALANCE-CHECK] Delegating legacy balance check to unified handler');

  // Delegate to the unified balance check function
  const { data, error } = await supabase.functions.invoke('check-inventory-card-balance', {
    body: {
      cardIds,
      poolId: request.poolId,
      source: 'legacy',
      userId: context.user?.id,
    },
  });

  if (error) {
    throw new ApiError(`Balance check delegation failed: ${error.message}`, 'DELEGATION_ERROR', 500);
  }

  // Map the unified response back to the legacy format
  const results = data?.results || [];
  const summary = data?.summary || { checked: 0, success: 0, error: 0 };

  return {
    message: data?.message || `Checked ${summary.checked} cards`,
    results,
    checked: summary.checked,
    success: summary.success,
    failed: summary.error,
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
