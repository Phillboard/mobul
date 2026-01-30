/**
 * Activity & Logs Types
 * 
 * Type definitions for the unified activity logging system.
 * Supports ISO 27001, SOC 2, and government contract compliance requirements.
 */

// ============================================================================
// Base Types
// ============================================================================

export type ActivityCategory = 
  | 'gift_card'
  | 'campaign'
  | 'communication'
  | 'api'
  | 'user'
  | 'system';

export type ActivityStatus = 'success' | 'failed' | 'pending' | 'cancelled';

export type ActivitySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface BaseActivityLog {
  id: string;
  timestamp: string;
  category: ActivityCategory;
  event_type: string;
  status: ActivityStatus;
  user_id?: string;
  user_email?: string;
  client_id?: string;
  organization_id?: string;
  correlation_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Gift Card Activity
// ============================================================================

export type GiftCardEventType = 
  | 'card_provisioned'
  | 'card_assigned'
  | 'card_claimed'
  | 'sms_sent'
  | 'sms_delivered'
  | 'sms_failed'
  | 'card_redeemed'
  | 'card_activated'
  | 'card_cancelled'
  | 'delivery_retry';

export interface GiftCardActivityLog extends BaseActivityLog {
  category: 'gift_card';
  event_type: GiftCardEventType;
  recipient_id?: string;
  recipient_name?: string;
  recipient_phone?: string;
  campaign_id?: string;
  campaign_name?: string;
  gift_card_id?: string;
  brand_name?: string;
  amount?: number;
  retry_count?: number;
  error_message?: string;
}

// ============================================================================
// Campaign Activity
// ============================================================================

export type CampaignEventType = 
  | 'campaign_created'
  | 'campaign_updated'
  | 'campaign_launched'
  | 'campaign_paused'
  | 'campaign_completed'
  | 'campaign_deleted'
  | 'mail_piece_sent'
  | 'mail_piece_delivered'
  | 'mail_piece_returned'
  | 'recipient_added'
  | 'recipient_removed'
  | 'list_uploaded'
  | 'response_recorded'
  | 'conversion_tracked';

export interface CampaignActivityLog extends BaseActivityLog {
  category: 'campaign';
  event_type: CampaignEventType;
  campaign_id?: string;
  campaign_name?: string;
  recipients_affected?: number;
  mail_piece_id?: string;
  tracking_number?: string;
}

// ============================================================================
// Communications Activity
// ============================================================================

export type CommunicationEventType = 
  | 'call_inbound'
  | 'call_outbound'
  | 'call_completed'
  | 'call_missed'
  | 'call_recorded'
  | 'sms_inbound'
  | 'sms_outbound'
  | 'opt_in'
  | 'opt_out'
  | 'webhook_twilio';

export interface CommunicationActivityLog extends BaseActivityLog {
  category: 'communication';
  event_type: CommunicationEventType;
  direction?: 'inbound' | 'outbound';
  from_number?: string;
  to_number?: string;
  duration_seconds?: number;
  recording_url?: string;
  message_length?: number;
}

// ============================================================================
// API Activity
// ============================================================================

export type ApiEventType = 
  | 'api_request'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'webhook_sent'
  | 'webhook_received'
  | 'webhook_failed'
  | 'rate_limit_hit'
  | 'integration_sync';

export interface ApiActivityLog extends BaseActivityLog {
  category: 'api';
  event_type: ApiEventType;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  status_code?: number;
  latency_ms?: number;
  api_key_id?: string;
  api_key_name?: string;
  webhook_url?: string;
  request_id?: string;
}

// ============================================================================
// User Activity
// ============================================================================

export type UserEventType = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | 'password_reset_requested'
  | 'user_created'
  | 'user_invited'
  | 'user_accepted_invite'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'role_assigned'
  | 'role_removed'
  | 'permission_changed'
  | 'session_created'
  | 'session_expired';

export interface UserActivityLog extends BaseActivityLog {
  category: 'user';
  event_type: UserEventType;
  target_user_id?: string;
  target_user_email?: string;
  role?: string;
  permission?: string;
  session_id?: string;
  location?: string;
}

// ============================================================================
// System Activity
// ============================================================================

export type SystemEventType = 
  | 'error'
  | 'job_started'
  | 'job_completed'
  | 'job_failed'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'integration_error'
  | 'database_operation'
  | 'security_event'
  | 'performance_alert';

export interface SystemActivityLog extends BaseActivityLog {
  category: 'system';
  event_type: SystemEventType;
  severity: ActivitySeverity;
  message: string;
  stack_trace?: string;
  job_name?: string;
  integration_name?: string;
  affected_records?: number;
}

// ============================================================================
// Union Type
// ============================================================================

export type ActivityLog = 
  | GiftCardActivityLog
  | CampaignActivityLog
  | CommunicationActivityLog
  | ApiActivityLog
  | UserActivityLog
  | SystemActivityLog;

// ============================================================================
// Filter & Search Types
// ============================================================================

export interface ActivityFilters {
  category?: ActivityCategory;
  status?: ActivityStatus[];
  event_types?: string[];
  user_id?: string;
  campaign_id?: string;
  client_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
  severity?: ActivitySeverity[];
}

export interface ActivityPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface ActivityQueryResult {
  data: ActivityLog[];
  pagination: ActivityPagination;
  filters_applied: ActivityFilters;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  columns?: string[];
  include_header?: boolean;
  date_range?: { start: string; end: string };
  filters?: ActivityFilters;
}

export interface ExportResult {
  url?: string;
  blob?: Blob;
  filename: string;
  records_exported: number;
  generated_at: string;
}

// ============================================================================
// Tab Configuration
// ============================================================================

export interface ActivityTabConfig {
  id: string;
  label: string;
  icon: string;
  category?: ActivityCategory;
  description: string;
  adminOnly?: boolean;
  columns: string[];
}

export const ACTIVITY_TABS: ActivityTabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'LayoutDashboard',
    description: 'Recent activity across all categories',
    columns: ['timestamp', 'category', 'event_type', 'user_email', 'status', 'details'],
  },
  {
    id: 'gift-cards',
    label: 'Gift Cards',
    icon: 'Gift',
    category: 'gift_card',
    description: 'Gift card provisioning, SMS delivery, and redemptions',
    columns: ['timestamp', 'event_type', 'recipient_name', 'campaign_name', 'brand_name', 'amount', 'status'],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: 'Megaphone',
    category: 'campaign',
    description: 'Campaign lifecycle and mail piece tracking',
    columns: ['timestamp', 'event_type', 'campaign_name', 'user_email', 'recipients_affected', 'status'],
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: 'Phone',
    category: 'communication',
    description: 'Phone calls, SMS messages, and opt-in/opt-out events',
    columns: ['timestamp', 'event_type', 'direction', 'from_number', 'to_number', 'duration_seconds', 'status'],
  },
  {
    id: 'api',
    label: 'API & Webhooks',
    icon: 'Code',
    category: 'api',
    description: 'API requests, webhook deliveries, and integrations',
    columns: ['timestamp', 'event_type', 'endpoint', 'method', 'status_code', 'latency_ms', 'api_key_name'],
  },
  {
    id: 'users',
    label: 'Users & Access',
    icon: 'Users',
    category: 'user',
    description: 'Login activity, permission changes, and user management',
    columns: ['timestamp', 'event_type', 'user_email', 'ip_address', 'location', 'status'],
  },
  {
    id: 'system',
    label: 'System',
    icon: 'Server',
    category: 'system',
    description: 'Error logs, background jobs, and system events',
    adminOnly: true,
    columns: ['timestamp', 'severity', 'event_type', 'message', 'job_name', 'status'],
  },
];
