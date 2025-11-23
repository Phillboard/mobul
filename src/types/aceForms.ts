/**
 * Ace Forms Type Definitions
 * Types for AI-powered form builder and gift card redemption
 */

export type FieldType = 
  | 'text'
  | 'email'
  | 'phone'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'date'
  | 'file'
  | 'gift-card-code';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: string[]; // For select, radio, checkbox
  conditional?: ConditionalLogic;
  styling?: FieldStyling;
}

export interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value: string | number;
  message: string;
}

export interface ConditionalLogic {
  showIf: {
    fieldId: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: string;
  };
}

export interface FieldStyling {
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
}

export interface FormSettings {
  title?: string;
  description?: string;
  submitButtonText?: string;
  successMessage?: string;
  primaryColor?: string;
  backgroundColor?: string;
  showBranding?: boolean;
}

export interface FormConfig {
  fields: FormField[];
  settings: FormSettings;
}

export interface AceForm {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  form_config: FormConfig;
  template_id?: string;
  is_active: boolean;
  total_submissions: number;
  total_views: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  gift_card_id?: string;
  recipient_id?: string;
  submission_data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  redemption_token?: string;
  submitted_at: string;
}

export interface GiftCardRedemption {
  card_code: string;
  card_number?: string;
  card_value: number;
  provider: string;
  brand_name: string;
  brand_logo?: string;
  brand_color?: string;
  store_url?: string;
  expiration_date?: string;
  usage_restrictions?: string[];
  redemption_instructions?: string;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'simple' | 'data-collection' | 'survey' | 'contest' | 'lead-gen';
  preview_image?: string;
  config: FormConfig;
}

export type ExportFormat = 'html' | 'javascript' | 'iframe' | 'react';

export interface ExportOptions {
  format: ExportFormat;
  includeStyles: boolean;
  customDomain?: string;
  primaryColor?: string;
  logo?: string;
}
