/**
 * Gift Card System Type Definitions
 * 
 * Centralized TypeScript types for the gift card management system.
 * These types extend the auto-generated Supabase types with composite
 * types and helper interfaces used throughout the application.
 */

import { Tables } from "@/integrations/supabase/types";

// ============================================================================
// Base Types (from Supabase)
// ============================================================================

export type GiftCard = Tables<"gift_cards">;
export type GiftCardPool = Tables<"gift_card_pools">;
export type GiftCardBrand = Tables<"gift_card_brands">;
export type GiftCardDelivery = Tables<"gift_card_deliveries">;
export type GiftCardBalanceHistory = Tables<"gift_card_balance_history">;
export type AdminCardSale = Tables<"admin_card_sales">;
export type AdminGiftCardInventory = Tables<"admin_gift_card_inventory">;

// ============================================================================
// Status & Type Enums
// ============================================================================

/**
 * Possible statuses for gift cards
 */
export type GiftCardStatus = 'available' | 'claimed' | 'delivered' | 'failed';

/**
 * Pool type classification
 */
export type PoolType = 'master' | 'client';

/**
 * Methods for purchasing/provisioning cards into pools
 */
export type PurchaseMethod = 'csv_only' | 'api_only' | 'csv_with_fallback';

/**
 * Balance check status
 */
export type BalanceCheckStatus = 'success' | 'error' | 'pending';

// ============================================================================
// Composite Types (with Relationships)
// ============================================================================

/**
 * Gift Card Pool with its associated brand information
 */
export interface GiftCardPoolWithBrand extends GiftCardPool {
  gift_card_brands?: GiftCardBrand;
}

/**
 * Gift Card with its pool and brand information
 */
export interface GiftCardWithPool extends GiftCard {
  gift_card_pools?: GiftCardPoolWithBrand;
}

/**
 * Admin sale record with full relationship data
 */
export interface AdminSaleWithRelations extends AdminCardSale {
  gift_card_pools?: GiftCardPoolWithBrand;
  clients?: {
    id: string;
    name: string;
  };
}

/**
 * Gift card delivery with full relationship data
 */
export interface GiftCardDeliveryWithRelations extends GiftCardDelivery {
  gift_cards?: GiftCardWithPool;
  recipients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  campaigns?: {
    id: string;
    name: string;
  };
}

/**
 * Balance history with card reference
 */
export interface BalanceHistoryWithCard extends GiftCardBalanceHistory {
  gift_cards?: {
    card_code: string;
  };
}

/**
 * Inventory purchase with brand information
 */
export interface InventoryPurchaseWithBrand extends AdminGiftCardInventory {
  gift_card_brands?: {
    brand_name: string;
  };
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Statistics for a gift card pool
 */
export interface PoolStats {
  totalCards: number;
  availableCards: number;
  claimedCards: number;
  deliveredCards: number;
  failedCards: number;
  totalValue: number;
  availableValue: number;
  utilizationPercent: number;
}

/**
 * Filter options for card listings
 */
export interface CardFilters {
  status?: GiftCardStatus;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Options for exporting pool data
 */
export interface ExportOptions {
  poolId: string;
  includeSensitiveData: boolean;
  format: 'csv' | 'json';
}

/**
 * Balance check result
 */
export interface BalanceCheckResult {
  cardId: string;
  cardCode: string;
  previousBalance: number | null;
  newBalance: number;
  status: BalanceCheckStatus;
  error?: string;
}

// ============================================================================
// Form Types
// ============================================================================

/**
 * Form data for creating a new pool
 */
export interface CreatePoolFormData {
  poolName: string;
  brandId: string;
  cardValue: number;
  provider: string;
  isMasterPool: boolean;
  clientId?: string;
  autoBalanceCheck?: boolean;
  balanceCheckFrequencyHours?: number;
  lowStockThreshold?: number;
}

/**
 * Form data for recording inventory purchase
 */
export interface RecordPurchaseFormData {
  brandId: string;
  quantity: number;
  costPerCard: number;
  totalCost: number;
  supplierName?: string;
  supplierReference?: string;
  purchaseDate: string;
  notes?: string;
}

/**
 * Form data for transferring cards (selling to client)
 */
export interface TransferCardsFormData {
  masterPoolId: string;
  buyerClientId: string;
  quantity: number;
  pricePerCard: number;
  notes?: string;
}

/**
 * Form data for pool settings update
 */
export interface PoolSettingsFormData {
  autoBalanceCheck: boolean;
  balanceCheckFrequencyHours: number;
  lowStockThreshold: number;
}
