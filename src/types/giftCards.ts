/**
 * Gift Card Type Definitions
 * 
 * **Gift Card System per PLATFORM_DICTIONARY.md:**
 * - **Gift Card Brand:** The merchant brand (Amazon, Visa, Target, etc.)
 * - **Denomination:** The dollar value of a gift card ($25, $50, $100)
 * - **Brand-Denomination:** Specific combination of brand and value (e.g., "Amazon $25")
 * - **Gift Card Pool:** Inventory of gift cards available for a Client
 * - **Provisioning:** Process of allocating and delivering a gift card to a Recipient
 *   Waterfall: CSV inventory → API (Tillo) → Buffer pool
 * 
 * @see PLATFORM_DICTIONARY.md for complete definitions
 * @see src/lib/terminology.ts for constants
 */

export interface GiftCardBrand {
  id: string;
  brand_name: string;
  brand_code: string;
  tillo_brand_code?: string;
  provider?: string;
  logo_url?: string;
  category?: string;
  is_enabled_by_admin: boolean;
  balance_check_enabled?: boolean;
  balance_check_url?: string;
  balance_check_method?: 'tillo_api' | 'manual' | 'other_api' | 'none';
  balance_check_api_endpoint?: string;
  balance_check_config?: Record<string, any>;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
  // New optional metadata fields
  website_url?: string;
  description?: string;
  terms_url?: string;
  brand_colors?: {
    primary?: string;
    secondary?: string;
  };
  metadata_source?: 'auto_lookup' | 'manual' | 'tillo';
}

export interface GiftCardDenomination {
  id: string;
  brand_id: string;
  denomination: number;
  is_enabled_by_admin: boolean;
  admin_cost_per_card?: number;
  tillo_cost_per_card?: number;
  last_tillo_price_check?: string;
  created_at: string;
  updated_at: string;
}

export interface GiftCardInventory {
  id: string;
  brand_id: string;
  denomination: number;
  card_code: string;
  card_number?: string;
  expiration_date?: string;
  status: 'available' | 'assigned' | 'delivered' | 'expired';
  uploaded_at: string;
  uploaded_by_user_id?: string;
  upload_batch_id?: string;
  assigned_to_recipient_id?: string;
  assigned_to_campaign_id?: string;
  assigned_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
}

export interface ClientAvailableGiftCard {
  id: string;
  client_id: string;
  brand_id: string;
  denomination: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgencyAvailableGiftCard {
  id: string;
  agency_id: string;
  brand_id: string;
  denomination: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftCardBillingLedger {
  id: string;
  transaction_type: 'purchase_from_inventory' | 'purchase_from_tillo' | 'refund';
  billed_entity_type: 'client' | 'agency';
  billed_entity_id: string;
  campaign_id?: string;
  recipient_id?: string;
  brand_id: string;
  denomination: number;
  amount_billed: number;
  cost_basis?: number;
  profit: number;
  inventory_card_id?: string;
  tillo_transaction_id?: string;
  tillo_order_reference?: string;
  billed_at: string;
  metadata?: Record<string, any>;
  notes?: string;
}

export interface CampaignGiftCardConfig {
  id: string;
  campaign_id: string;
  brand_id: string;
  denomination: number;
  condition_number: number;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface GiftCardInventoryWithBrand extends GiftCardInventory {
  gift_card_brands: GiftCardBrand;
}

export interface ClientAvailableGiftCardWithBrand extends ClientAvailableGiftCard {
  gift_card_brands: GiftCardBrand;
}

export interface BillingLedgerWithRelations extends GiftCardBillingLedger {
  gift_card_brands?: GiftCardBrand;
  campaigns?: { name: string };
  recipients?: { first_name: string; last_name: string };
  gift_card_inventory?: GiftCardInventory;
}

export interface CampaignGiftCardConfigWithBrand extends CampaignGiftCardConfig {
  gift_card_brands: GiftCardBrand;
}

// Legacy types (deprecated - for backward compatibility)
/** @deprecated Use GiftCardInventory instead */
export interface GiftCard {
  id: string;
  pool_id?: string;
  card_code: string;
  card_number?: string;
  status: string;
  claimed_at?: string;
  delivered_at?: string;
}

/** @deprecated Use GiftCardBillingLedger instead */
export interface GiftCardDelivery {
  id: string;
  gift_card_id: string;
  recipient_id: string;
  campaign_id: string;
  delivery_method: string;
  delivery_status: string;
  delivered_at?: string;
}

// Brand Lookup Types
export interface BrandLookupResult {
  found: boolean;
  brandName?: string; // Full brand name from database
  logoUrl?: string;
  website?: string;
  category?: string;
  description?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  source: 'popular_db' | 'clearbit' | 'not_found';
}

export interface TilloBrandSearchResult {
  found: boolean;
  tillo_brand_code?: string;
  brand_name?: string;
  denominations?: number[];
  costs?: Array<{
    denomination: number;
    cost: number;
  }>;
}

export interface BrandFormData {
  brand_name: string;
  brand_code?: string;
  logo_url: string;
  website_url?: string;
  category?: string;
  description?: string;
  terms_url?: string;
  brand_colors?: {
    primary?: string;
    secondary?: string;
  };
  tillo_brand_code?: string;
  metadata_source: 'auto_lookup' | 'manual' | 'tillo';
  // Balance check configuration
  balance_check_method?: 'tillo_api' | 'manual' | 'other_api' | 'none';
  balance_check_url?: string;
  balance_check_api_endpoint?: string;
  balance_check_config?: {
    apiKey?: string;
    secretKey?: string;
    headers?: Record<string, string>;
    bodyTemplate?: Record<string, any>;
    responseBalancePath?: string;
  };
}

export type BalanceCheckMethod = 'tillo_api' | 'manual' | 'other_api' | 'none';
