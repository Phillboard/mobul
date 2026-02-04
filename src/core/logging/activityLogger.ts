/**
 * Activity Logger Service
 * 
 * Unified logging service for the platform.
 * Ensures consistent metadata and proper tenant scoping.
 */

import { supabase } from '@core/services/supabase';

// ============================================================================
// Types
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

export interface LogActivityParams {
  /** Event category */
  category: ActivityCategory;
  /** Specific event type within category */
  event_type: string;
  /** Event status */
  status: ActivityStatus;
  /** Human-readable description */
  description: string;
  
  /** Severity level (default: info) */
  severity?: Severity;
  /** Retention class (default: operational) */
  retention_class?: RetentionClass;
  
  /** Organization ID (required for non-system events) */
  organization_id?: string;
  /** Client ID */
  client_id?: string;
  /** User who triggered the action */
  user_id?: string;
  
  /** Resource type being affected */
  resource_type?: string;
  /** Resource ID being affected */
  resource_id?: string;
  /** Related campaign */
  campaign_id?: string;
  /** Related recipient */
  recipient_id?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  
  /** Request correlation ID */
  request_id?: string;
  /** Client IP address */
  ip_address?: string;
  /** Client user agent */
  user_agent?: string;
}

// ============================================================================
// Logger Class
// ============================================================================

class ActivityLogger {
  private defaultRequestId: string | null = null;

  /**
   * Set a default request ID for all subsequent logs in this context
   */
  setRequestId(requestId: string) {
    this.defaultRequestId = requestId;
  }

  /**
   * Clear the default request ID
   */
  clearRequestId() {
    this.defaultRequestId = null;
  }

  /**
   * Log an activity event
   */
  async log(params: LogActivityParams): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('log_activity', {
        p_category: params.category,
        p_event_type: params.event_type,
        p_status: params.status,
        p_description: params.description,
        p_severity: params.severity || 'info',
        p_user_id: params.user_id || null,
        p_client_id: params.client_id || null,
        p_campaign_id: params.campaign_id || null,
        p_recipient_id: params.recipient_id || null,
        p_resource_type: params.resource_type || null,
        p_resource_id: params.resource_id || null,
        p_metadata: {
          ...params.metadata,
          retention_class: params.retention_class || 'operational',
        },
        p_ip_address: params.ip_address || null,
        p_user_agent: params.user_agent || null,
        p_request_id: params.request_id || this.defaultRequestId || null,
      });

      if (error) {
        console.warn('Activity logging failed:', error);
        return null;
      }

      return data;
    } catch (err) {
      // Never let logging failures break the application
      console.warn('Activity logging error:', err);
      return null;
    }
  }

  // ============================================================================
  // Convenience Methods by Category
  // ============================================================================

  /**
   * Log a gift card event
   */
  async logGiftCard(
    event_type: string,
    status: ActivityStatus,
    description: string,
    context: Partial<LogActivityParams> = {}
  ) {
    return this.log({
      category: 'gift_card',
      event_type,
      status,
      description,
      retention_class: 'audit', // Gift cards are always audit
      ...context,
    });
  }

  /**
   * Log a campaign event
   */
  async logCampaign(
    event_type: string,
    status: ActivityStatus,
    description: string,
    context: Partial<LogActivityParams> = {}
  ) {
    return this.log({
      category: 'campaign',
      event_type,
      status,
      description,
      ...context,
    });
  }

  /**
   * Log a communication event (email, SMS)
   */
  async logCommunication(
    event_type: string,
    status: ActivityStatus,
    description: string,
    context: Partial<LogActivityParams> = {}
  ) {
    return this.log({
      category: 'communication',
      event_type,
      status,
      description,
      retention_class: 'audit', // Communications are audit for compliance
      ...context,
    });
  }

  /**
   * Log an API event
   */
  async logApi(
    event_type: string,
    status: ActivityStatus,
    description: string,
    context: Partial<LogActivityParams> = {}
  ) {
    return this.log({
      category: 'api',
      event_type,
      status,
      description,
      retention_class: 'operational',
      ...context,
    });
  }

  /**
   * Log a user event
   */
  async logUser(
    event_type: string,
    status: ActivityStatus,
    description: string,
    context: Partial<LogActivityParams> = {}
  ) {
    return this.log({
      category: 'user',
      event_type,
      status,
      description,
      retention_class: event_type.includes('login') || event_type.includes('password') 
        ? 'audit' 
        : 'operational',
      ...context,
    });
  }

  /**
   * Log a system event
   */
  async logSystem(
    event_type: string,
    status: ActivityStatus,
    description: string,
    context: Partial<LogActivityParams> = {}
  ) {
    return this.log({
      category: 'system',
      event_type,
      status,
      description,
      ...context,
    });
  }

  /**
   * Log a billing event
   */
  async logBilling(
    event_type: string,
    status: ActivityStatus,
    description: string,
    context: Partial<LogActivityParams> = {}
  ) {
    return this.log({
      category: 'billing',
      event_type,
      status,
      description,
      retention_class: 'audit', // Billing is always audit
      ...context,
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

/** Singleton instance */
export const activityLogger = new ActivityLogger();

/** Convenience function */
export const logActivity = (params: LogActivityParams) => activityLogger.log(params);

// Re-export types
export type { LogActivityParams as ActivityLogParams };
