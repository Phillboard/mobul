/**
 * Gift Card Type Definitions
 * Consolidated type definitions for gift card features
 */

export type PoolHealth = 'healthy' | 'warning' | 'critical';
export type CardStatus = 'available' | 'claimed' | 'delivered' | 'redeemed' | 'expired' | 'failed';
export type PurchaseMethod = 'manual' | 'api';

export interface GiftCardPool {
  id: string;
  pool_name: string;
  brand_id: string | null;
  client_id: string | null;
  is_master_pool: boolean | null;
  card_value: number;
  total_cards: number | null;
  available_cards: number | null;
  claimed_cards: number | null;
  delivered_cards: number | null;
  failed_cards: number | null;
  provider: string | null;
  purchase_method: PurchaseMethod | null;
  low_stock_threshold: number | null;
  sale_price_per_card: number | null;
  markup_percentage: number | null;
  available_for_purchase: boolean | null;
  min_purchase_quantity: number | null;
  auto_balance_check: boolean | null;
  balance_check_frequency_hours: number | null;
  last_auto_balance_check: string | null;
  api_provider: string | null;
  api_config: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GiftCard {
  id: string;
  pool_id: string;
  brand_id: string | null;
  card_code: string;
  card_number: string | null;
  status: CardStatus | null;
  current_balance: number | null;
  expiration_date: string | null;
  claimed_at: string | null;
  claimed_by_recipient_id: string | null;
  claimed_by_call_session_id: string | null;
  delivered_at: string | null;
  delivery_method: string | null;
  delivery_address: string | null;
  balance_check_status: string | null;
  last_balance_check: string | null;
  notes: string | null;
  tags: any | null;
  created_at: string | null;
}

export interface GiftCardBrand {
  id: string;
  brand_name: string;
  brand_code: string;
  provider: string;
  category: string | null;
  logo_url: string | null;
  balance_check_enabled: boolean | null;
  balance_check_url: string | null;
  typical_denominations: any | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface PoolStats {
  totalValue: number;
  availableValue: number;
  claimedValue: number;
  deliveredValue: number;
  utilizationRate: number;
  health: PoolHealth;
}

export interface AdminCardSale {
  id: string;
  master_pool_id: string | null;
  buyer_client_id: string | null;
  buyer_pool_id: string | null;
  quantity: number;
  price_per_card: number;
  cost_per_card: number | null;
  total_amount: number;
  profit: number | null;
  sale_date: string | null;
  sold_by_user_id: string | null;
  notes: string | null;
  created_at: string | null;
}
