/**
 * Audience & Recipient Type Definitions
 * 
 * Types for managing mailing lists, recipients, and data hygiene.
 */

import { Database } from "@core/services/supabase/types";

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Audience
 * Mailing list or segment
 */
export type Audience = Tables<'audiences'>;

/**
 * Recipient
 * Individual person in an audience
 */
export type Recipient = Tables<'recipients'>;

/**
 * Audience Status
 * Processing state of an audience
 */
export type AudienceStatus = 'processing' | 'ready' | 'failed';

/**
 * Audience Source
 * How the audience was created
 */
export type AudienceSource = 'manual' | 'csv' | 'api' | 'crm';

/**
 * Audience with Relations
 * Audience with commonly joined data
 */
export interface AudienceWithRelations extends Audience {
  client?: Tables<'clients'>;
  recipients?: Recipient[];
  campaigns?: Tables<'campaigns'>[];
}

/**
 * Recipient with Relations
 * Recipient with event tracking data
 */
export interface RecipientWithRelations extends Recipient {
  audience?: Audience;
  events?: Tables<'events'>[];
  gift_card_deliveries?: Tables<'gift_card_deliveries'>[];
  call_sessions?: Tables<'call_sessions'>[];
}

/**
 * Data Hygiene Results
 * Validation and cleaning results for audience data
 */
export interface DataHygieneResults {
  total_checked: number;
  valid_emails: number;
  invalid_emails: number;
  valid_phones: number;
  invalid_phones: number;
  valid_addresses: number;
  invalid_addresses: number;
  duplicates_found: number;
  duplicates_removed: number;
}

/**
 * Suppression Results
 * Records filtered out due to suppression rules
 */
export interface SuppressionResults {
  total_suppressed: number;
  reasons: {
    opted_out: number;
    bounced: number;
    complained: number;
    previous_recipient: number;
  };
}

/**
 * CSV Import Mapping
 * Maps CSV columns to recipient fields
 */
export interface CSVImportMapping {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  custom_fields?: Record<string, string>; // CSV column -> custom field name
}

/**
 * Import Results
 * Summary of CSV import operation
 */
export interface ImportResults {
  total_rows: number;
  imported: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

/**
 * Recipient Form Data
 * Shape for creating/editing individual recipients
 */
export interface RecipientFormData {
  audience_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  custom_fields?: Record<string, any>;
}

/**
 * Audience Stats
 * Aggregated statistics for an audience
 */
export interface AudienceStats {
  total_recipients: number;
  valid_recipients: number;
  invalid_recipients: number;
  with_email: number;
  with_phone: number;
  with_complete_address: number;
  campaigns_using: number;
}
