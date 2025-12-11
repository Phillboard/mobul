import { Database } from "@core/services/supabase/types";

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
export type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

export type ContactList = Database["public"]["Tables"]["contact_lists"]["Row"];
export type ContactListInsert = Database["public"]["Tables"]["contact_lists"]["Insert"];
export type ContactListUpdate = Database["public"]["Tables"]["contact_lists"]["Update"];

export type ContactListMember = Database["public"]["Tables"]["contact_list_members"]["Row"];
export type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];

export type LifecycleStage = "lead" | "mql" | "sql" | "opportunity" | "customer" | "evangelist";
export type ListType = "static" | "dynamic";

export interface ContactWithRelations extends Contact {
  tags?: ContactTag[];
  lists?: ContactList[];
}

export interface ContactListWithCount extends ContactList {
  contact_count: number;
  member_count?: number;
  contact_list_members?: Array<{ count: number }>;
}

export interface ContactFormData {
  customer_code: string; // Required unique code - database uses customer_code, prefer unique_code in UI/code (see PLATFORM_DICTIONARY.md)
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  company?: string;
  job_title?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lifecycle_stage?: LifecycleStage;
  lead_source?: string;
  lead_score?: number;
  do_not_contact?: boolean;
  email_opt_out?: boolean;
  sms_opt_out?: boolean;
  notes?: string;
  custom_fields?: Record<string, any>;
}

export interface ContactListFormData {
  name: string;
  description?: string;
  list_type: ListType;
  filter_rules?: Record<string, any>;
}

export interface ContactFilters {
  search?: string;
  lifecycle_stage?: LifecycleStage[];
  lead_source?: string[];
  tags?: string[];
  list_id?: string;
  has_email?: boolean;
  has_phone?: boolean;
  do_not_contact?: boolean;
  lead_score_min?: number;
  lead_score_max?: number;
  engagement_score_min?: number;
  engagement_score_max?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SegmentRule {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
  value: any;
}

export interface SegmentRules {
  logic: "and" | "or";
  rules: SegmentRule[];
}
