/**
 * Credit Account System Type Definitions
 * 
 * Hierarchical credit-based architecture for gift card provisioning.
 * Platform → Agency → Client → Campaign
 * 
 * Core Principle: Money flows DOWN only. Credits cascade but never flow upward.
 */

import { Tables } from "@/integrations/supabase/types";

// ============================================================================
// Base Types (from Supabase)
// ============================================================================

export type CreditAccount = Tables<"credit_accounts">;
export type CreditTransaction = Tables<"credit_transactions">;
export type GiftCardRedemption = Tables<"gift_card_redemptions">;
export type Agency = Tables<"agencies">;

// ============================================================================
// Account Types & Status
// ============================================================================

export type AccountType = 'platform' | 'agency' | 'client' | 'campaign';

export type AccountStatus = 'active' | 'suspended' | 'depleted';

export type TransactionType = 
  | 'purchase'       // External money coming in
  | 'allocation_out' // Parent allocating to child
  | 'allocation_in'  // Child receiving from parent
  | 'redemption'     // Gift card provisioned (deduction)
  | 'refund'         // Money returned
  | 'adjustment';    // Admin correction

export type RedemptionStatus = 'pending' | 'provisioned' | 'delivered' | 'failed';

export type ProvisioningSource = 'csv' | 'buffer' | 'api';

// ============================================================================
// Composite Types (with Relationships)
// ============================================================================

/**
 * Credit Account with parent/child relationships
 */
export interface CreditAccountWithRelations extends CreditAccount {
  parent_account?: CreditAccount;
  children_accounts?: CreditAccount[];
  agency?: Agency;
  client?: {
    id: string;
    name: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
}

/**
 * Credit Transaction with account details
 */
export interface CreditTransactionWithAccount extends CreditTransaction {
  credit_accounts?: CreditAccount;
  related_transaction?: CreditTransaction;
  redemption?: GiftCardRedemption;
}

/**
 * Gift Card Redemption with full context
 */
export interface GiftCardRedemptionWithDetails extends GiftCardRedemption {
  campaign?: {
    id: string;
    name: string;
    client_id: string;
  };
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  brand?: {
    id: string;
    brand_name: string;
    brand_code: string;
    logo_url?: string;
  };
  gift_card?: {
    id: string;
    card_code: string;
    card_number?: string;
  };
  credit_account?: CreditAccount;
  credit_transaction?: CreditTransaction;
}

/**
 * Agency with credit account and stats
 */
export interface AgencyWithCredit extends Agency {
  credit_account?: CreditAccount;
  client_count?: number;
  cards_this_month?: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request to allocate credit between accounts
 */
export interface AllocateCreditRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  allocatedByUserId?: string;
  notes?: string;
}

/**
 * Response from credit allocation
 */
export interface AllocateCreditResponse {
  success: boolean;
  outTransaction: CreditTransaction;
  inTransaction: CreditTransaction;
  fromAccountBalance: number;
  toAccountBalance: number;
}

/**
 * Request to purchase credit
 */
export interface PurchaseCreditRequest {
  accountId: string;
  amount: number;
  paymentMethod: 'stripe' | 'invoice' | 'wire';
  paymentReference?: string;
  purchasedByUserId?: string;
  notes?: string;
}

/**
 * Response from credit purchase
 */
export interface PurchaseCreditResponse {
  success: boolean;
  transaction: CreditTransaction;
  newBalance: number;
}

/**
 * Request to provision a gift card
 */
export interface ProvisionGiftCardRequest {
  campaignId: string;
  brandId: string;
  denomination: number;
  recipientId?: string;
  redemptionCode: string;
  deliveryMethod?: 'sms' | 'email';
  deliveryAddress?: string;
}

/**
 * Response from gift card provisioning
 */
export interface ProvisionGiftCardResponse {
  success: boolean;
  redemption: GiftCardRedemption;
  card: {
    id: string;
    cardCode: string;
    cardNumber?: string;
    cardValue: number;
  };
  source: ProvisioningSource;
  creditTransaction: CreditTransaction;
}

/**
 * Credit check result
 */
export interface CreditCheckResult {
  sufficient: boolean;
  accountId: string;
  availableCredit: number;
  requiredAmount: number;
  accountType: AccountType;
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * Account balance summary
 */
export interface AccountBalanceSummary {
  accountId: string;
  accountType: AccountType;
  totalPurchased: number;
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  status: AccountStatus;
  percentUsed: number;
  children?: AccountBalanceSummary[];
}

/**
 * Transaction history filters
 */
export interface TransactionFilters {
  accountId?: string;
  accountType?: AccountType;
  transactionType?: TransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Redemption analytics
 */
export interface RedemptionAnalytics {
  totalRedemptions: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageProfit: number;
  profitMargin: number;
  bySource: {
    csv: number;
    buffer: number;
    api: number;
  };
  byStatus: {
    pending: number;
    provisioned: number;
    delivered: number;
    failed: number;
  };
}

/**
 * Agency performance metrics
 */
export interface AgencyMetrics {
  agencyId: string;
  agencyName: string;
  creditBalance: number;
  totalClientsCount: number;
  activeClientsCount: number;
  cardsThisMonth: number;
  revenueThisMonth: number;
  profitThisMonth: number;
  topClients: {
    clientId: string;
    clientName: string;
    cardsRedeemed: number;
    revenue: number;
  }[];
}

/**
 * Client usage summary
 */
export interface ClientUsageSummary {
  clientId: string;
  clientName: string;
  creditBalance: number;
  campaignsCount: number;
  activeCampaignsCount: number;
  cardsRedeemedThisMonth: number;
  spentThisMonth: number;
  lowCredit: boolean; // true if below threshold
}

/**
 * Campaign budget status
 */
export interface CampaignBudgetStatus {
  campaignId: string;
  campaignName: string;
  usesSharedCredit: boolean;
  allocatedBudget?: number;
  budgetUsed?: number;
  budgetRemaining?: number;
  sharedCreditAvailable?: number;
  redemptionsCount: number;
  estimatedRedemptionsRemaining?: number;
  status: 'healthy' | 'low' | 'depleted';
}

/**
 * Pool health status for admin view
 */
export interface PoolHealthStatus {
  poolId: string;
  brandName: string;
  denomination: number;
  poolType: 'csv' | 'buffer' | 'api_config';
  availableCards: number;
  totalCards: number;
  threshold: number;
  status: 'healthy' | 'low' | 'empty';
  apiProvider?: string;
  costPerCard?: number;
}

// ============================================================================
// Form Types
// ============================================================================

/**
 * Form data for creating an agency
 */
export interface CreateAgencyFormData {
  name: string;
  slug?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  enabledBrands?: string[];
  pricingTier?: string;
  defaultMarkupPercentage?: number;
}

/**
 * Form data for allocating credit
 */
export interface AllocateCreditFormData {
  recipientType: 'client' | 'campaign';
  recipientId: string;
  amount: number;
  notes?: string;
}

/**
 * Form data for purchasing credit
 */
export interface PurchaseCreditFormData {
  amount: number;
  paymentMethod: 'stripe' | 'invoice' | 'wire';
  notes?: string;
}

/**
 * Form data for creating campaign with budget
 */
export interface CampaignBudgetFormData {
  usesSharedCredit: boolean;
  allocatedBudget?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default credit thresholds for warnings
 */
export const CREDIT_THRESHOLDS = {
  AGENCY_LOW: 1000,
  CLIENT_LOW: 500,
  CAMPAIGN_LOW: 100,
} as const;

/**
 * Default pool thresholds
 */
export const POOL_THRESHOLDS = {
  CSV_HEALTHY: 50,
  CSV_LOW: 10,
  BUFFER_TARGET: 100,
  BUFFER_REFILL: 20,
} as const;

/**
 * Pricing tiers (example values - adjust based on actual costs)
 */
export const PRICING_TIERS = {
  CSV_COST: 23.50,      // What we pay for bulk CSV cards
  API_COST: 24.50,      // What we pay for API cards
  WHOLESALE: 26.00,     // What agencies pay us
  RETAIL: 27.50,        // What clients pay agencies (agency sets this)
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isCreditAccount(obj: any): obj is CreditAccount {
  return obj && typeof obj === 'object' && 'account_type' in obj && 'total_remaining' in obj;
}

export function isCreditTransaction(obj: any): obj is CreditTransaction {
  return obj && typeof obj === 'object' && 'transaction_type' in obj && 'amount' in obj;
}

export function isGiftCardRedemption(obj: any): obj is GiftCardRedemption {
  return obj && typeof obj === 'object' && 'redemption_code' in obj && 'denomination' in obj;
}

