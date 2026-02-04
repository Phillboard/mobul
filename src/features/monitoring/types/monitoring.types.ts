/**
 * Monitoring Types
 * 
 * Type definitions for the unified monitoring system.
 */

// ============================================================================
// Activity Categories & Events
// ============================================================================

export type ActivityCategory = 
  | 'gift_card'
  | 'campaign'
  | 'communication'
  | 'api'
  | 'user'
  | 'system'
  | 'billing';

export type ActivityStatus = 'success' | 'failed' | 'pending' | 'cancelled';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export type RetentionClass = 'operational' | 'audit';

// ============================================================================
// Activity Log Entry
// ============================================================================

export interface ActivityLogEntry {
  id: string;
  category: ActivityCategory;
  event_type: string;
  status: ActivityStatus;
  severity: Severity;
  retention_class: RetentionClass;
  
  // Actor/Context
  user_id: string | null;
  client_id: string | null;
  organization_id: string | null;
  
  // Resource references
  resource_type: string | null;
  resource_id: string | null;
  campaign_id: string | null;
  recipient_id: string | null;
  
  // Event details
  description: string;
  metadata: Record<string, unknown>;
  
  // Request context
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  
  // Timestamps
  created_at: string;
  archived_at: string | null;
}

// ============================================================================
// Real-time Event
// ============================================================================

export interface RealtimeActivityEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ActivityLogEntry | null;
  old: ActivityLogEntry | null;
}

// ============================================================================
// Stats & Aggregations
// ============================================================================

export interface HourlyStats {
  id: string;
  organization_id: string;
  client_id: string | null;
  hour_start: string;
  category: ActivityCategory;
  event_type: string | null;
  total_count: number;
  success_count: number;
  failed_count: number;
  warning_count: number;
  error_count: number;
  avg_duration_ms: number | null;
}

export interface DailyStats {
  id: string;
  organization_id: string;
  client_id: string | null;
  day_start: string;
  category: ActivityCategory;
  event_type: string | null;
  total_count: number;
  success_count: number;
  failed_count: number;
  warning_count: number;
  error_count: number;
  avg_duration_ms: number | null;
  unique_users: number;
  unique_campaigns: number;
  unique_recipients: number;
}

export interface MonthlyStats {
  id: string;
  organization_id: string;
  client_id: string | null;
  month_start: string;
  category: ActivityCategory;
  total_count: number;
  success_count: number;
  failed_count: number;
  total_value_cents: number;
  gift_cards_provisioned: number;
  gift_cards_redeemed: number;
}

export interface ActivityStatsResponse {
  period_start: string;
  category: ActivityCategory;
  total_count: number;
  success_count: number;
  failed_count: number;
  error_count: number;
}

// ============================================================================
// Dashboard Props
// ============================================================================

export type DataScope = 
  | { type: 'platform' }
  | { type: 'agency'; organizationId: string }
  | { type: 'client'; clientId: string };

export interface DashboardFilters {
  categories?: ActivityCategory[];
  status?: ActivityStatus[];
  severity?: Severity[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  search?: string;
}

// ============================================================================
// Tab Configuration
// ============================================================================

export interface MonitoringTab {
  id: string;
  label: string;
  permission: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: 'alertCount' | 'unresolvedErrors';
  subtabs?: string[];
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule {
  id: string;
  organization_id: string | null;
  client_id: string | null;
  name: string;
  description: string | null;
  enabled: boolean;
  category: ActivityCategory;
  event_type: string | null;
  severity_threshold: Severity | null;
  count_threshold: number | null;
  time_window_minutes: number;
  notify_email: boolean;
  notify_in_app: boolean;
  notify_slack: boolean;
  notify_roles: string[];
  created_at: string;
}

export interface AlertInstance {
  id: string;
  rule_id: string | null;
  organization_id: string | null;
  client_id: string | null;
  title: string;
  message: string;
  severity: AlertSeverity;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  filters?: DashboardFilters;
  columns?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ScheduledReport {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  report_type: string;
  format: ExportFormat;
  schedule_cron: string;
  timezone: string;
  recipients: string[];
  filters: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}
