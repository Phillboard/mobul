/**
 * Shared Activity Logger for Edge Functions
 * 
 * Provides unified activity logging to the activity_log table.
 * Non-blocking - errors in logging won't break main flow.
 * 
 * Categories:
 * - gift_card: Card provisioning, SMS delivery, redemptions
 * - campaign: Campaign lifecycle, mail tracking
 * - communication: Calls, SMS, opt-in/opt-out
 * - api: API requests, webhooks, integrations
 * - user: Login, user management, permissions
 * - system: Jobs, errors, integrations
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

export type ActivityCategory = 'gift_card' | 'campaign' | 'communication' | 'api' | 'user' | 'system';
export type ActivityStatus = 'success' | 'failed' | 'pending' | 'cancelled';
export type ActivitySeverity = 'info' | 'warning' | 'error' | 'critical';

// Event types by category
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
  | 'card_revoked'
  | 'card_validated'
  | 'delivery_retry';

export type CampaignEventType = 
  | 'campaign_created'
  | 'campaign_updated'
  | 'campaign_launched'
  | 'campaign_paused'
  | 'campaign_completed'
  | 'campaign_deleted'
  | 'recipient_added'
  | 'recipient_imported'
  | 'mail_sent'
  | 'mail_delivered'
  | 'mail_returned'
  | 'automation_triggered';

export type CommunicationEventType = 
  | 'call_inbound'
  | 'call_outbound'
  | 'call_completed'
  | 'call_missed'
  | 'call_recorded'
  | 'call_status_updated'
  | 'sms_inbound'
  | 'sms_outbound'
  | 'sms_status_updated'
  | 'opt_in'
  | 'opt_out';

export type ApiEventType = 
  | 'api_request'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'webhook_sent'
  | 'webhook_received'
  | 'webhook_failed'
  | 'rate_limit_hit'
  | 'integration_sync';

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
  | 'organization_updated';

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

export type EventType = 
  | GiftCardEventType 
  | CampaignEventType 
  | CommunicationEventType 
  | ApiEventType 
  | UserEventType 
  | SystemEventType;

export interface LogActivityParams {
  category: ActivityCategory;
  eventType: EventType;
  status: ActivityStatus;
  description: string;
  severity?: ActivitySeverity;
  userId?: string;
  clientId?: string;
  campaignId?: string;
  recipientId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface ActivityLogResult {
  success: boolean;
  logId?: string;
  error?: string;
}

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

// ============================================================================
// Request ID Generation
// ============================================================================

/**
 * Generate a unique request ID for correlation
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `act_${timestamp}_${random}`;
}

// ============================================================================
// Core Logging Function
// ============================================================================

/**
 * Log an activity to the activity_log table
 * Non-blocking - errors won't fail the calling operation
 */
export async function logActivity(params: LogActivityParams): Promise<ActivityLogResult> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('activity_log')
      .insert({
        category: params.category,
        event_type: params.eventType,
        status: params.status,
        severity: params.severity || 'info',
        description: params.description,
        user_id: params.userId || null,
        client_id: params.clientId || null,
        campaign_id: params.campaignId || null,
        recipient_id: params.recipientId || null,
        resource_type: params.resourceType || null,
        resource_id: params.resourceId || null,
        metadata: params.metadata || {},
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        request_id: params.requestId || generateRequestId(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[ACTIVITY-LOGGER] Failed to log activity:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`[ACTIVITY-LOGGER] Logged ${params.category}/${params.eventType} (${params.status})`);
    return { success: true, logId: data.id };
  } catch (err) {
    // Never throw from activity logger
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ACTIVITY-LOGGER] Exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Category-Specific Logging Functions
// ============================================================================

/**
 * Log a gift card activity
 */
export async function logGiftCardActivity(
  eventType: GiftCardEventType,
  status: ActivityStatus,
  description: string,
  context?: {
    userId?: string;
    clientId?: string;
    campaignId?: string;
    recipientId?: string;
    brandName?: string;
    amount?: number;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActivityLogResult> {
  return logActivity({
    category: 'gift_card',
    eventType,
    status,
    description,
    severity: status === 'failed' ? 'error' : 'info',
    userId: context?.userId,
    clientId: context?.clientId,
    campaignId: context?.campaignId,
    recipientId: context?.recipientId,
    requestId: context?.requestId,
    metadata: {
      brand_name: context?.brandName,
      amount: context?.amount,
      ...context?.metadata,
    },
  });
}

/**
 * Log a campaign activity
 */
export async function logCampaignActivity(
  eventType: CampaignEventType,
  status: ActivityStatus,
  description: string,
  context?: {
    userId?: string;
    clientId?: string;
    campaignId?: string;
    campaignName?: string;
    recipientsAffected?: number;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActivityLogResult> {
  return logActivity({
    category: 'campaign',
    eventType,
    status,
    description,
    severity: status === 'failed' ? 'error' : 'info',
    userId: context?.userId,
    clientId: context?.clientId,
    campaignId: context?.campaignId,
    requestId: context?.requestId,
    metadata: {
      campaign_name: context?.campaignName,
      recipients_affected: context?.recipientsAffected,
      ...context?.metadata,
    },
  });
}

/**
 * Log a communication activity
 */
export async function logCommunicationActivity(
  eventType: CommunicationEventType,
  status: ActivityStatus,
  description: string,
  context?: {
    userId?: string;
    clientId?: string;
    campaignId?: string;
    recipientId?: string;
    direction?: 'inbound' | 'outbound';
    fromNumber?: string;
    toNumber?: string;
    durationSeconds?: number;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActivityLogResult> {
  return logActivity({
    category: 'communication',
    eventType,
    status,
    description,
    severity: status === 'failed' ? 'warning' : 'info',
    userId: context?.userId,
    clientId: context?.clientId,
    campaignId: context?.campaignId,
    recipientId: context?.recipientId,
    requestId: context?.requestId,
    metadata: {
      direction: context?.direction,
      from_number: context?.fromNumber,
      to_number: context?.toNumber,
      duration_seconds: context?.durationSeconds,
      ...context?.metadata,
    },
  });
}

/**
 * Log an API/webhook activity
 */
export async function logApiActivity(
  eventType: ApiEventType,
  status: ActivityStatus,
  description: string,
  context?: {
    userId?: string;
    clientId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    latencyMs?: number;
    webhookUrl?: string;
    apiKeyName?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActivityLogResult> {
  return logActivity({
    category: 'api',
    eventType,
    status,
    description,
    severity: status === 'failed' ? 'warning' : 'info',
    userId: context?.userId,
    clientId: context?.clientId,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    requestId: context?.requestId,
    metadata: {
      endpoint: context?.endpoint,
      method: context?.method,
      status_code: context?.statusCode,
      latency_ms: context?.latencyMs,
      webhook_url: context?.webhookUrl,
      api_key_name: context?.apiKeyName,
      ...context?.metadata,
    },
  });
}

/**
 * Log a user activity
 */
export async function logUserActivity(
  eventType: UserEventType,
  status: ActivityStatus,
  description: string,
  context?: {
    userId?: string;
    clientId?: string;
    targetUserId?: string;
    targetUserEmail?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActivityLogResult> {
  return logActivity({
    category: 'user',
    eventType,
    status,
    description,
    severity: eventType === 'login_failed' ? 'warning' : 'info',
    userId: context?.userId,
    clientId: context?.clientId,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
    requestId: context?.requestId,
    resourceType: 'user',
    resourceId: context?.targetUserId,
    metadata: {
      target_user_email: context?.targetUserEmail,
      role: context?.role,
      ...context?.metadata,
    },
  });
}

/**
 * Log a system activity
 */
export async function logSystemActivity(
  eventType: SystemEventType,
  status: ActivityStatus,
  description: string,
  context?: {
    userId?: string;
    clientId?: string;
    jobName?: string;
    integrationName?: string;
    affectedRecords?: number;
    severity?: ActivitySeverity;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActivityLogResult> {
  return logActivity({
    category: 'system',
    eventType,
    status,
    description,
    severity: context?.severity || (status === 'failed' ? 'error' : 'info'),
    userId: context?.userId,
    clientId: context?.clientId,
    requestId: context?.requestId,
    metadata: {
      job_name: context?.jobName,
      integration_name: context?.integrationName,
      affected_records: context?.affectedRecords,
      ...context?.metadata,
    },
  });
}

// ============================================================================
// Activity Logger Factory
// ============================================================================

/**
 * Create an activity logger instance for an edge function
 * Provides convenient methods and automatic request ID tracking
 * 
 * Usage:
 * ```typescript
 * const logger = createActivityLogger('my-function', req);
 * 
 * // Log gift card provisioning
 * await logger.giftCard('card_provisioned', 'success', 'Gift card provisioned successfully', {
 *   campaignId: '...',
 *   recipientId: '...',
 *   amount: 25,
 * });
 * ```
 */
export function createActivityLogger(functionName: string, req?: Request) {
  const requestId = generateRequestId();
  const ipAddress = req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || undefined;
  const userAgent = req?.headers.get('user-agent') || undefined;

  return {
    requestId,
    functionName,

    // Gift card logging
    giftCard: (
      eventType: GiftCardEventType,
      status: ActivityStatus,
      description: string,
      context?: Omit<Parameters<typeof logGiftCardActivity>[3], 'requestId'>
    ) => logGiftCardActivity(eventType, status, description, { ...context, requestId }),

    // Campaign logging
    campaign: (
      eventType: CampaignEventType,
      status: ActivityStatus,
      description: string,
      context?: Omit<Parameters<typeof logCampaignActivity>[3], 'requestId'>
    ) => logCampaignActivity(eventType, status, description, { ...context, requestId }),

    // Communication logging
    communication: (
      eventType: CommunicationEventType,
      status: ActivityStatus,
      description: string,
      context?: Omit<Parameters<typeof logCommunicationActivity>[3], 'requestId'>
    ) => logCommunicationActivity(eventType, status, description, { ...context, requestId }),

    // API logging
    api: (
      eventType: ApiEventType,
      status: ActivityStatus,
      description: string,
      context?: Omit<Parameters<typeof logApiActivity>[3], 'requestId' | 'ipAddress' | 'userAgent'>
    ) => logApiActivity(eventType, status, description, { ...context, requestId, ipAddress, userAgent }),

    // User logging
    user: (
      eventType: UserEventType,
      status: ActivityStatus,
      description: string,
      context?: Omit<Parameters<typeof logUserActivity>[3], 'requestId' | 'ipAddress' | 'userAgent'>
    ) => logUserActivity(eventType, status, description, { ...context, requestId, ipAddress, userAgent }),

    // System logging
    system: (
      eventType: SystemEventType,
      status: ActivityStatus,
      description: string,
      context?: Omit<Parameters<typeof logSystemActivity>[3], 'requestId'>
    ) => logSystemActivity(eventType, status, description, { ...context, requestId }),

    // Generic logging
    log: (params: Omit<LogActivityParams, 'requestId'>) => 
      logActivity({ ...params, requestId }),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  logActivity,
  logGiftCardActivity,
  logCampaignActivity,
  logCommunicationActivity,
  logApiActivity,
  logUserActivity,
  logSystemActivity,
  createActivityLogger,
  generateRequestId,
};
