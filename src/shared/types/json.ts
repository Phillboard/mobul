/**
 * JSON Schema Type Definitions
 * 
 * Comprehensive types for all JSONB columns in the database
 * Provides type safety for JSON data structures
 */

// Campaign-related JSON schemas
export interface CampaignConditionMetadata {
  trigger_source?: 'manual' | 'automatic' | 'api';
  form_data?: Record<string, string | number | boolean>;
  call_duration?: number;
  call_disposition?: string;
  timestamp?: string;
}

export interface CampaignVersionData {
  name?: string;
  size?: string;
  status?: string;
  template_id?: string;
  audience_id?: string;
  landing_page_id?: string;
  changes?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
}

// Template JSON schemas
export interface TemplateLayer {
  id: string;
  type: 'text' | 'image' | 'qr_code' | 'shape' | 'background';
  left: number;
  top: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
  visible: boolean;
  locked?: boolean;
  
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  fill?: string;
  textAlign?: string;
  lineHeight?: number;
  
  // Image-specific
  src?: string;
  scaleX?: number;
  scaleY?: number;
  cropX?: number;
  cropY?: number;
  
  // QR code-specific
  data?: string;
  qrSize?: number;
  qrColor?: string;
  qrBackgroundColor?: string;
}

export interface TemplateDesign {
  version: string;
  canvasSize: {
    width: number;
    height: number;
  };
  backgroundColor: string;
  layers: TemplateLayer[];
  variables?: Record<string, string>;
}

// Form JSON schemas
export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'gift-card-code';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: string;
  };
  options?: string[];
  defaultValue?: string;
  conditional?: {
    field: string;
    operator: '=' | '!=' | '>' | '<' | 'contains';
    value: string;
  };
}

export interface FormSettings {
  title?: string;
  description?: string;
  submitButtonText?: string;
  successMessage?: string;
  redirectUrl?: string;
  primaryColor?: string;
  showBranding?: boolean;
  requireConsent?: boolean;
  consentText?: string;
}

export interface RevealSettings {
  animationStyle?: 'confetti' | 'fireworks' | 'none';
  revealBackground?: 'gradient' | 'solid' | 'transparent';
  showConfetti?: boolean;
  showShareButton?: boolean;
  showDownloadButton?: boolean;
  showWalletButton?: boolean;
  customMessage?: string;
}

export interface FormConfig {
  fields: FormField[];
  settings?: FormSettings;
  revealSettings?: RevealSettings;
  giftCardPoolId?: string;
  triggerCondition?: boolean;
}

// Event JSON schemas
export interface EventData {
  browser?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  os?: string;
  location?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  form_name?: string;
  fields_submitted?: number;
  call_duration?: number;
  call_status?: string;
}

// Contact JSON schemas
export interface ContactCustomFields {
  [key: string]: string | number | boolean | Date | null;
}

export interface ContactMetadata {
  import_source?: string;
  import_date?: string;
  enrichment_status?: 'pending' | 'complete' | 'failed';
  enrichment_data?: {
    company_size?: string;
    industry_confidence?: number;
    data_quality_score?: number;
  };
  tags?: string[];
}

// Client branding JSON schemas
export interface BrandColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

export interface FontPreferences {
  heading?: string;
  body?: string;
  weights?: number[];
}

export interface ClientBranding {
  colors?: BrandColors;
  fonts?: FontPreferences;
  logo_url?: string;
  favicon_url?: string;
}

// Webhook JSON schemas
export interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    source?: string;
    version?: string;
  };
}

export interface WebhookHeaders {
  [key: string]: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: WebhookHeaders;
  secret?: string;
  retry_policy?: {
    max_attempts: number;
    backoff_multiplier: number;
  };
}

// CRM Integration JSON schemas
export interface CRMFieldMapping {
  crm_field: string;
  ace_field: string;
  transformation?: 'uppercase' | 'lowercase' | 'trim' | 'phone_format';
  default_value?: string;
}

export interface CRMSyncConfig {
  field_mappings: CRMFieldMapping[];
  sync_frequency?: number;
  last_sync?: string;
  sync_direction?: 'push' | 'pull' | 'bidirectional';
}

// Gift card provider JSON schemas
export interface TilloCardData {
  order_id?: string;
  reference_id?: string;
  currency?: string;
  activation_code?: string;
  redemption_url?: string;
}

export interface ProviderMetadata {
  provider: 'tillo' | 'giftbit' | 'rybbon' | 'manual';
  provider_data?: TilloCardData | Record<string, any>;
  external_id?: string;
  api_version?: string;
}

// Call session JSON schemas
export interface CallRecording {
  sid?: string;
  url?: string;
  duration?: number;
  transcription?: string;
}

export interface CallMetadata {
  recording?: CallRecording;
  caller_name?: string;
  caller_company?: string;
  call_quality?: 'excellent' | 'good' | 'fair' | 'poor';
  agent_notes?: string;
}

// Simulation/Demo data JSON schemas
export interface SimulationParameters {
  dataTypes: string[];
  quantities: Record<string, number>;
  selectedBrands?: string[];
  scope?: 'total' | 'per_agency' | 'per_client';
  randomnessFactor?: number;
  timeRangeDays?: number;
  trendPattern?: 'growing' | 'stable' | 'declining';
}

// Helper type guards
export function isTemplateDesign(data: any): data is TemplateDesign {
  return data && data.version && data.canvasSize && Array.isArray(data.layers);
}

export function isFormConfig(data: any): data is FormConfig {
  return data && Array.isArray(data.fields);
}

export function isEventData(data: any): data is EventData {
  return data && typeof data === 'object';
}

