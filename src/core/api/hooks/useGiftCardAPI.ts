/**
 * Gift Card API Hooks
 * 
 * Comprehensive TanStack Query hooks for ALL gift card operations.
 * These hooks provide type-safe access to gift card edge functions
 * with built-in caching, invalidation, and error handling.
 * 
 * Usage:
 * ```typescript
 * import { useProvisionGiftCard, useCheckGiftCardBalance } from '@core/api/hooks/useGiftCardAPI';
 * 
 * function MyComponent() {
 *   const provision = useProvisionGiftCard();
 *   const handleProvision = () => provision.mutate({ recipientId: '123', ... });
 * }
 * ```
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callEdgeFunction, callPublicEdgeFunction } from '../client';
import { Endpoints } from '../endpoints';

// ============================================================================
// Query Keys Factory
// ============================================================================

/**
 * Centralized query key factory for gift card operations.
 * Use these for cache invalidation and prefetching.
 */
export const giftCardKeys = {
  all: ['gift-cards'] as const,
  
  // Balance queries
  balance: (cardId: string) => ['gift-cards', 'balance', cardId] as const,
  inventoryBalance: (cardId: string) => ['gift-cards', 'inventory-balance', cardId] as const,
  
  // Validation queries
  validation: (code: string) => ['gift-cards', 'validation', code] as const,
  configValidation: (campaignId: string) => ['gift-cards', 'config-validation', campaignId] as const,
  
  // Pool/inventory queries
  pools: () => ['gift-cards', 'pools'] as const,
  pool: (poolId: string) => ['gift-cards', 'pools', poolId] as const,
  
  // System queries
  monitor: () => ['gift-cards', 'monitor'] as const,
  brands: () => ['gift-cards', 'brands'] as const,
  brand: (brandName: string) => ['gift-cards', 'brands', brandName] as const,
  
  // Delivery queries
  deliveries: (recipientId: string) => ['gift-cards', 'deliveries', recipientId] as const,
};

// ============================================================================
// Provision Types
// ============================================================================

export type ProvisionEntryPoint = 
  | 'unified'
  | 'call_center'
  | 'api'
  | 'condition_trigger'
  | 'manual';

export interface ProvisionGiftCardRequest {
  /** Entry point for tracking/auditing */
  entryPoint?: ProvisionEntryPoint;
  /** Campaign ID */
  campaignId?: string;
  /** Recipient ID */
  recipientId: string;
  /** Pool ID for inventory cards */
  poolId?: string;
  /** Tillo brand code */
  brandCode?: string;
  /** Card denomination */
  denomination?: number;
  /** Condition number that triggered provisioning */
  conditionNumber?: number;
  /** Delivery method */
  deliveryMethod?: 'email' | 'sms' | 'none';
  /** Recipient email for email delivery */
  recipientEmail?: string;
  /** Recipient phone for SMS delivery */
  recipientPhone?: string;
  /** Client ID for authorization */
  clientId?: string;
  /** Call session ID for call center */
  callSessionId?: string;
}

export interface ProvisionedGiftCard {
  id: string;
  code: string;
  pin?: string;
  brand_name: string;
  card_value: number;
  balance_check_url?: string;
  redemption_url?: string;
  expiration_date?: string;
  provider?: string;
}

export interface ProvisionGiftCardResponse {
  success: boolean;
  giftCard?: ProvisionedGiftCard;
  deliveryId?: string;
  message?: string;
  error?: string;
  code?: string;
}

// ============================================================================
// Balance Check Types
// ============================================================================

export interface CheckBalanceRequest {
  cardId: string;
  brandCode?: string;
  poolId?: string;
}

export interface CheckBalanceResponse {
  success: boolean;
  balance?: number;
  currency?: string;
  lastChecked?: string;
  error?: string;
}

export interface CheckInventoryBalanceRequest {
  cardId: string;
  poolId?: string;
}

export interface CheckInventoryBalanceResponse {
  success: boolean;
  balance?: number;
  originalValue?: number;
  usedValue?: number;
  status?: 'available' | 'assigned' | 'redeemed' | 'expired';
  lastActivity?: string;
  error?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidateCodeRequest {
  code: string;
  campaignId?: string;
}

export interface ValidateCodeResponse {
  valid: boolean;
  giftCard?: {
    id: string;
    brand_name: string;
    card_value: number;
    status: string;
  };
  error?: string;
}

export interface ValidateConfigRequest {
  campaignId: string;
  poolId?: string;
  conditionNumber?: number;
}

export interface ValidateConfigResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  poolStatus?: {
    available: number;
    required: number;
    sufficient: boolean;
  };
}

export interface ValidateRedemptionRequest {
  code: string;
  recipientId?: string;
}

export interface ValidateRedemptionResponse {
  valid: boolean;
  canRedeem: boolean;
  giftCard?: {
    id: string;
    brand_name: string;
    card_value: number;
    code: string;
    pin?: string;
  };
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  error?: string;
}

// ============================================================================
// Redemption Types
// ============================================================================

export interface RedeemCustomerCodeRequest {
  code: string;
  recipientId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface RedeemCustomerCodeResponse {
  success: boolean;
  giftCard?: ProvisionedGiftCard;
  message?: string;
  error?: string;
}

export interface RedeemEmbedRequest {
  code: string;
  formId?: string;
  data?: Record<string, unknown>;
}

export interface RedeemEmbedResponse {
  success: boolean;
  giftCard?: ProvisionedGiftCard;
  formResponse?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Revocation Types
// ============================================================================

export interface RevokeGiftCardRequest {
  cardId: string;
  reason: string;
  refund?: boolean;
}

export interface RevokeGiftCardResponse {
  success: boolean;
  refunded?: boolean;
  refundAmount?: number;
  error?: string;
}

// ============================================================================
// Transfer Types
// ============================================================================

export interface TransferCardsRequest {
  sourcePoolId: string;
  targetPoolId: string;
  cardIds?: string[];
  count?: number;
}

export interface TransferCardsResponse {
  success: boolean;
  transferred: number;
  errors?: string[];
}

// ============================================================================
// Purchase Types
// ============================================================================

export interface PurchaseGiftCardsRequest {
  brandCode: string;
  denomination: number;
  quantity: number;
  poolId: string;
  clientId?: string;
}

export interface PurchaseGiftCardsResponse {
  success: boolean;
  purchased: number;
  totalCost: number;
  cards?: Array<{
    id: string;
    code: string;
  }>;
  error?: string;
}

// ============================================================================
// Import Types
// ============================================================================

export interface ImportGiftCardsRequest {
  poolId: string;
  cards: Array<{
    code: string;
    pin?: string;
    value: number;
    expirationDate?: string;
  }>;
  brandName?: string;
}

export interface ImportGiftCardsResponse {
  success: boolean;
  imported: number;
  failed: number;
  errors?: Array<{
    row: number;
    error: string;
  }>;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportPoolCardsRequest {
  poolId: string;
  status?: 'all' | 'available' | 'assigned' | 'redeemed';
  format?: 'csv' | 'json';
}

export interface ExportPoolCardsResponse {
  success: boolean;
  data?: string;
  downloadUrl?: string;
  count?: number;
  error?: string;
}

// ============================================================================
// Admin/System Types
// ============================================================================

export interface CleanupStuckCardsRequest {
  poolId?: string;
  olderThanMinutes?: number;
  dryRun?: boolean;
}

export interface CleanupStuckCardsResponse {
  success: boolean;
  cleaned: number;
  dryRun: boolean;
  details?: Array<{
    cardId: string;
    status: string;
    stuckSince: string;
  }>;
}

export interface MonitorSystemResponse {
  healthy: boolean;
  checks: {
    tilloConnection: boolean;
    databaseConnection: boolean;
    poolsWithLowInventory: number;
    stuckProvisionings: number;
  };
  pools?: Array<{
    id: string;
    name: string;
    available: number;
    threshold: number;
    status: 'ok' | 'low' | 'empty';
  }>;
  lastChecked: string;
}

export interface LookupBrandRequest {
  brandName: string;
}

export interface LookupBrandResponse {
  found: boolean;
  tilloBrandCode?: string;
  brandName?: string;
  denominations?: number[];
  costs?: Array<{
    denomination: number;
    cost: number;
  }>;
  error?: string;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Provision a gift card for a recipient.
 * Supports both inventory pool and Tillo API provisioning.
 */
export function useProvisionGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ProvisionGiftCardRequest) =>
      callEdgeFunction<ProvisionGiftCardResponse>(
        Endpoints.giftCards.provision,
        { ...request, entryPoint: request.entryPoint || 'unified' }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
      if (variables.recipientId) {
        queryClient.invalidateQueries({
          queryKey: giftCardKeys.deliveries(variables.recipientId),
        });
      }
    },
  });
}

/**
 * Validate a gift card code.
 * Public endpoint - no authentication required.
 */
export function useValidateGiftCardCode() {
  return useMutation({
    mutationFn: (request: ValidateCodeRequest) =>
      callPublicEdgeFunction<ValidateCodeResponse>(
        Endpoints.giftCards.validateCode,
        request
      ),
  });
}

/**
 * Validate campaign gift card configuration.
 * Checks pool availability, budget, and settings.
 */
export function useValidateGiftCardConfiguration() {
  return useMutation({
    mutationFn: (request: ValidateConfigRequest) =>
      callEdgeFunction<ValidateConfigResponse>(
        Endpoints.giftCards.validateConfig,
        request
      ),
  });
}

/**
 * Validate a redemption code (rate-limited).
 * Public endpoint for redemption pages.
 */
export function useValidateRedemptionCode() {
  return useMutation({
    mutationFn: (request: ValidateRedemptionRequest) =>
      callPublicEdgeFunction<ValidateRedemptionResponse>(
        Endpoints.giftCards.validateRedemption,
        request
      ),
  });
}

/**
 * Redeem a customer code.
 * Public endpoint for redemption flow.
 */
export function useRedeemCustomerCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RedeemCustomerCodeRequest) =>
      callPublicEdgeFunction<RedeemCustomerCodeResponse>(
        Endpoints.giftCards.redeemCustomerCode,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
    },
  });
}

/**
 * Redeem via embedded widget.
 * Public endpoint for embedded redemption.
 */
export function useRedeemGiftCardEmbed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RedeemEmbedRequest) =>
      callPublicEdgeFunction<RedeemEmbedResponse>(
        Endpoints.giftCards.redeemEmbed,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
    },
  });
}

/**
 * Revoke a gift card.
 * Cancels the card and optionally processes refund.
 */
export function useRevokeGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RevokeGiftCardRequest) =>
      callEdgeFunction<RevokeGiftCardResponse>(
        Endpoints.giftCards.revoke,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
    },
  });
}

/**
 * Transfer cards between pools.
 * Admin operation for inventory management.
 */
export function useTransferAdminCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TransferCardsRequest) =>
      callEdgeFunction<TransferCardsResponse>(
        Endpoints.giftCards.transfer,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.pool(variables.sourcePoolId) });
      queryClient.invalidateQueries({ queryKey: giftCardKeys.pool(variables.targetPoolId) });
      queryClient.invalidateQueries({ queryKey: giftCardKeys.pools() });
    },
  });
}

/**
 * Purchase gift cards from Tillo.
 * Creates new cards in the specified pool.
 */
export function usePurchaseGiftCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PurchaseGiftCardsRequest) =>
      callEdgeFunction<PurchaseGiftCardsResponse>(
        Endpoints.giftCards.purchase,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.pool(variables.poolId) });
      queryClient.invalidateQueries({ queryKey: giftCardKeys.pools() });
    },
  });
}

/**
 * Import gift cards to inventory pool.
 * Bulk import from CSV or array.
 */
export function useImportGiftCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ImportGiftCardsRequest) =>
      callEdgeFunction<ImportGiftCardsResponse>(
        Endpoints.giftCards.import,
        request
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.pool(variables.poolId) });
      queryClient.invalidateQueries({ queryKey: giftCardKeys.pools() });
    },
  });
}

/**
 * Export pool cards to CSV.
 */
export function useExportPoolCards() {
  return useMutation({
    mutationFn: (request: ExportPoolCardsRequest) =>
      callEdgeFunction<ExportPoolCardsResponse>(
        Endpoints.giftCards.exportPool,
        request
      ),
  });
}

/**
 * Cleanup stuck gift card provisionings.
 * Admin operation to reset stuck states.
 */
export function useCleanupStuckGiftCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CleanupStuckCardsRequest) =>
      callEdgeFunction<CleanupStuckCardsResponse>(
        Endpoints.giftCards.cleanup,
        request
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
      queryClient.invalidateQueries({ queryKey: giftCardKeys.monitor() });
    },
  });
}

/**
 * Lookup Tillo brand details.
 * Admin operation to find brand codes.
 */
export function useLookupTilloBrand() {
  return useMutation({
    mutationFn: (request: LookupBrandRequest) =>
      callEdgeFunction<LookupBrandResponse>(
        Endpoints.giftCards.lookupBrand,
        request
      ),
  });
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Check gift card balance via Tillo API.
 * For Tillo-provisioned cards.
 */
export function useCheckGiftCardBalance(
  cardId: string,
  brandCode: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: giftCardKeys.balance(cardId),
    queryFn: () =>
      callEdgeFunction<CheckBalanceResponse>(
        Endpoints.giftCards.checkBalance,
        { cardId, brandCode }
      ),
    enabled: options?.enabled !== false && !!cardId && !!brandCode,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check inventory card balance.
 * For uploaded/imported cards.
 */
export function useCheckInventoryCardBalance(
  cardId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: giftCardKeys.inventoryBalance(cardId),
    queryFn: () =>
      callEdgeFunction<CheckInventoryBalanceResponse>(
        Endpoints.giftCards.checkInventoryBalance,
        { cardId }
      ),
    enabled: options?.enabled !== false && !!cardId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Monitor gift card system health.
 * Returns pool status, connection health, and alerts.
 */
export function useMonitorGiftCardSystem(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: giftCardKeys.monitor(),
    queryFn: () =>
      callEdgeFunction<MonitorSystemResponse>(
        Endpoints.giftCards.monitor,
        {}
      ),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: options?.refetchInterval ?? 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query hook for brand lookup (when you need to cache results).
 */
export function useTilloBrandLookup(
  brandName: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: giftCardKeys.brand(brandName),
    queryFn: () =>
      callEdgeFunction<LookupBrandResponse>(
        Endpoints.giftCards.lookupBrand,
        { brandName }
      ),
    enabled: options?.enabled !== false && !!brandName,
    staleTime: 30 * 60 * 1000, // 30 minutes (brand info doesn't change often)
  });
}

/**
 * Validate gift card configuration (query version).
 * Use when you want to check config without user action.
 */
export function useGiftCardConfigValidation(
  campaignId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: giftCardKeys.configValidation(campaignId),
    queryFn: () =>
      callEdgeFunction<ValidateConfigResponse>(
        Endpoints.giftCards.validateConfig,
        { campaignId }
      ),
    enabled: options?.enabled !== false && !!campaignId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================/**
 * Invalidate all gift card queries.
 * Useful after bulk operations.
 */
export function useInvalidateGiftCardQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: giftCardKeys.all });
  };
}

/**
 * Prefetch gift card balance.
 * Call this to warm the cache before showing balance.
 */
export function usePrefetchGiftCardBalance() {
  const queryClient = useQueryClient();  return (cardId: string, brandCode: string) => {
    queryClient.prefetchQuery({
      queryKey: giftCardKeys.balance(cardId),
      queryFn: () =>
        callEdgeFunction<CheckBalanceResponse>(
          Endpoints.giftCards.checkBalance,
          { cardId, brandCode }
        ),
      staleTime: 5 * 60 * 1000,
    });
  };
}
