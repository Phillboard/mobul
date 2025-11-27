/**
 * API Response Type Definitions
 * 
 * Standard types for all edge function responses
 */

// Standard API response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    request_id?: string;
    execution_time?: number;
  };
}

// Gift card operations
export interface GiftCardProvisionResponse {
  success: boolean;
  gift_card?: {
    id: string;
    card_code: string;
    card_number?: string;
    pin?: string;
    card_value: number;
    brand_name: string;
    expiration_date?: string;
  };
  delivery?: {
    id: string;
    method: 'sms' | 'email';
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    address: string;
  };
  error?: string;
}

export interface BalanceCheckResponse {
  success: boolean;
  card_id: string;
  current_balance: number;
  previous_balance?: number;
  last_checked: string;
  error?: string;
}

// Campaign operations
export interface GenerateTokensResponse {
  success: boolean;
  tokens_generated: number;
  recipients_updated: number;
  batch_id?: string;
  error?: string;
}

export interface CampaignSubmitResponse {
  success: boolean;
  campaign_id: string;
  mail_vendor_response?: {
    job_id: string;
    estimated_delivery: string;
    tracking_url?: string;
  };
  error?: string;
}

// Audience operations
export interface AudienceImportResponse {
  success: boolean;
  audience_id?: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

// Form operations
export interface FormSubmissionResponse {
  success: boolean;
  submission_id?: string;
  gift_card_triggered?: boolean;
  gift_card?: {
    code: string;
    value: number;
    redemption_url?: string;
  };
  redirect_url?: string;
  error?: string;
}

// Call tracking
export interface CallWebhookResponse {
  success: boolean;
  call_session_id?: string;
  recipient_matched: boolean;
  recipient_id?: string;
  action_taken?: 'forwarded' | 'voicemail' | 'rejected';
  error?: string;
}

// Condition evaluation
export interface ConditionEvaluationResponse {
  success: boolean;
  conditions_met: number;
  conditions_total: number;
  rewards_triggered: Array<{
    condition_number: number;
    reward_type: string;
    gift_card_id?: string;
    delivery_id?: string;
  }>;
  error?: string;
}

// Analytics
export interface AnalyticsResponse {
  success: boolean;
  metrics: {
    total_campaigns?: number;
    active_campaigns?: number;
    total_recipients?: number;
    engagement_rate?: number;
    conversion_rate?: number;
    gift_cards_delivered?: number;
    [key: string]: number | undefined;
  };
  time_series?: Array<{
    date: string;
    value: number;
  }>;
  error?: string;
}

// Demo data generation
export interface DemoDataResponse {
  success: boolean;
  batch_id: string;
  records_created: {
    campaigns?: number;
    recipients?: number;
    contacts?: number;
    gift_cards?: number;
    events?: number;
    [key: string]: number | undefined;
  };
  total_records: number;
  execution_time?: number;
  error?: string;
}

// Email operations
export interface EmailSendResponse {
  success: boolean;
  message_id?: string;
  provider?: 'resend' | 'sendgrid' | 'ses';
  status?: 'queued' | 'sent' | 'delivered' | 'failed';
  error?: string;
}

// SMS operations
export interface SMSSendResponse {
  success: boolean;
  message_sid?: string;
  status?: 'queued' | 'sent' | 'delivered' | 'failed';
  to_number: string;
  error?: string;
}

// Webhook operations
export interface WebhookDeliveryResponse {
  success: boolean;
  delivery_id?: string;
  status_code?: number;
  response_body?: string;
  retry_count?: number;
  error?: string;
}

// User operations
export interface UserInvitationResponse {
  success: boolean;
  invitation_id?: string;
  email_sent: boolean;
  expires_at?: string;
  error?: string;
}

// Export operations
export interface ExportResponse {
  success: boolean;
  file_url?: string;
  file_name?: string;
  record_count: number;
  format: 'csv' | 'json' | 'xlsx';
  expires_at?: string;
  error?: string;
}

// Pagination metadata
export interface PaginationMetadata {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: PaginationMetadata;
}

// Error response standard
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    suggestion?: string;
    support_url?: string;
  };
  request_id?: string;
  timestamp: string;
}

// Type guards for runtime checking
export function isAPIResponse<T>(data: any): data is APIResponse<T> {
  return typeof data === 'object' && 'success' in data;
}

export function isErrorResponse(data: any): data is ErrorResponse {
  return typeof data === 'object' && 'error' in data && typeof data.error === 'object';
}

export function isPaginatedResponse<T>(data: any): data is PaginatedResponse<T> {
  return isAPIResponse(data) && 'pagination' in data;
}

