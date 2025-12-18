/**
 * Database Type Helpers
 * 
 * Provides type utilities for working with Supabase database tables.
 * These helpers reduce `any` types and improve type safety.
 * 
 * Usage:
 * ```typescript
 * import type { Row, Insert, Update } from '@/core/types/database.helpers';
 * 
 * type Campaign = Row<'campaigns'>;
 * type NewCampaign = Insert<'campaigns'>;
 * type CampaignUpdate = Update<'campaigns'>;
 * ```
 * 
 * To regenerate types from the database:
 * ```bash
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/core/types/database.generated.ts
 * ```
 */

// Common table row types - manually defined for most-used tables
// These can be replaced with auto-generated types later

export interface CampaignRow {
  id: string;
  name: string;
  client_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  audience_id: string | null;
  landing_page_id: string | null;
  sms_opt_in_message: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  [key: string]: unknown;
}

export interface RecipientRow {
  id: string;
  audience_id: string | null;
  campaign_id: string | null;
  contact_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  redemption_code: string | null;
  approval_status: string;
  sms_opt_in_status: string | null;
  verification_method: string | null;
  disposition: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface GiftCardBrandRow {
  id: string;
  brand_name: string;
  brand_code: string | null;
  provider: string | null;
  logo_url: string | null;
  balance_check_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftCardInventoryRow {
  id: string;
  brand_id: string;
  pool_id: string | null;
  card_code: string;
  card_number: string | null;
  denomination: number;
  status: string;
  assigned_to_recipient_id: string | null;
  assigned_at: string | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  agency_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AudienceRow {
  id: string;
  name: string;
  client_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignConditionRow {
  id: string;
  campaign_id: string;
  condition_number: number;
  condition_name: string;
  is_active: boolean;
  brand_id: string | null;
  card_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: string;
  client_id: string | null;
  agency_id: string | null;
  created_at: string;
}

// Table name union type
export type TableName = 
  | 'campaigns'
  | 'recipients'
  | 'gift_card_brands'
  | 'gift_card_inventory'
  | 'clients'
  | 'audiences'
  | 'campaign_conditions'
  | 'user_roles'
  | 'contacts'
  | 'activities'
  | 'audit_log';

// Table row type mapping
export interface TableRowTypes {
  campaigns: CampaignRow;
  recipients: RecipientRow;
  gift_card_brands: GiftCardBrandRow;
  gift_card_inventory: GiftCardInventoryRow;
  clients: ClientRow;
  audiences: AudienceRow;
  campaign_conditions: CampaignConditionRow;
  user_roles: UserRoleRow;
  contacts: Record<string, unknown>;
  activities: Record<string, unknown>;
  audit_log: Record<string, unknown>;
}

// Type helpers
export type Row<T extends TableName> = TableRowTypes[T];
export type Insert<T extends TableName> = Partial<Omit<TableRowTypes[T], 'id' | 'created_at' | 'updated_at'>>;
export type Update<T extends TableName> = Partial<Omit<TableRowTypes[T], 'id' | 'created_at'>>;

// Query result types for common patterns
export interface CampaignWithRelations extends CampaignRow {
  clients?: ClientRow | null;
  audiences?: AudienceRow | null;
  campaign_conditions?: CampaignConditionRow[];
}

export interface RecipientWithRelations extends RecipientRow {
  campaign?: CampaignWithRelations | null;
  audience?: AudienceRow | null;
}

export interface GiftCardWithBrand extends GiftCardInventoryRow {
  gift_card_brands?: GiftCardBrandRow | null;
}

// API Response wrapper types
export interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface SupabaseListResponse<T> {
  data: T[] | null;
  error: { message: string; code?: string } | null;
  count?: number;
}

// Edge function response types
export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  requestId?: string;
}
