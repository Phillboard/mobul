/**
 * Shared Error Logger for Edge Functions
 * 
 * Provides centralized error logging to the error_logs table.
 * Non-blocking - errors in logging won't break main flow.
 * 
 * SCHEMA MAPPING (error_logs table):
 * - severity: 'low' | 'medium' | 'high' | 'critical'
 * - category: 'gift_card' | 'campaign' | 'contact' | 'form' | 'auth' | 'call_center' | 'api' | 'database' | 'external_service' | 'unknown'
 * - message: TEXT (the error message)
 * - error_details: JSONB (structured error data)
 * - context: JSONB (request context)
 * - stack_trace: TEXT
 * - occurred_at: TIMESTAMPTZ
 * - user_id: UUID
 * - client_id: UUID
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Database category values
export type ErrorCategory = 'gift_card' | 'campaign' | 'contact' | 'form' | 'auth' | 'call_center' | 'api' | 'database' | 'external_service' | 'unknown';

// Database severity values
export type DbSeverity = 'low' | 'medium' | 'high' | 'critical';

// User-friendly severity
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// Gift card provisioning error codes
export const PROVISIONING_ERROR_CODES = {
  'GC-001': 'Missing campaign condition configuration (brand_id or card_value is NULL)',
  'GC-002': 'Gift card brand not found in database',
  'GC-003': 'No gift card inventory available for this brand and denomination',
  'GC-004': 'Tillo API credentials not configured',
  'GC-005': 'Tillo API call failed',
  'GC-006': 'Insufficient client/agency credits for this purchase',
  'GC-007': 'Billing transaction recording failed',
  'GC-008': 'Campaign not found or no billing entity configured',
  'GC-009': 'Recipient verification required',
  'GC-010': 'Gift card already provisioned for this recipient',
  'GC-011': 'Invalid redemption code',
  'GC-012': 'Missing required parameters',
  'GC-013': 'Database function call failed',
  'GC-014': 'SMS/Email delivery failed',
  'GC-015': 'Unknown provisioning error',
} as const;

export type ProvisioningErrorCode = keyof typeof PROVISIONING_ERROR_CODES;

export interface LogErrorParams {
  category: ErrorCategory;
  severity: ErrorSeverity;
  source: string;
  message: string;
  errorDetails?: Record<string, any>;
  context?: Record<string, any>;
  stackTrace?: string;
  userId?: string;
  clientId?: string;
  recipientId?: string;
  campaignId?: string;
  requestId?: string;
}

export interface ErrorLogResult {
  success: boolean;
  logId?: string;
  error?: string;
}

export interface ProvisioningCheckpoint {
  stepNumber: number;
  stepName: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  durationMs?: number;
  details?: Record<string, any>;
  errorMessage?: string;
  errorCode?: ProvisioningErrorCode;
}

/**
 * Create a Supabase client for error logging
 */
function getSupabaseClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * Map user-friendly severity to database severity
 */
function mapSeverity(severity: ErrorSeverity): DbSeverity {
  const severityMap: Record<ErrorSeverity, DbSeverity> = {
    'info': 'low',
    'warning': 'medium',
    'error': 'high',
    'critical': 'critical',
  };
  return severityMap[severity] || 'medium';
}

/**
 * Log an error to the error_logs table
 * 
 * Uses correct database column names:
 * - category (not error_type)
 * - message (not error_message)
 * - occurred_at (not timestamp)
 * - error_details (not metadata)
 * - stack_trace (not error_stack)
 * - client_id (not organization_id)
 */
export async function logError(params: LogErrorParams): Promise<ErrorLogResult> {
  try {
    const supabase = getSupabaseClient();
    
    const insertData = {
      category: params.category,
      severity: mapSeverity(params.severity),
      message: `[${params.source}] ${params.message}`,
      error_details: {
        source: params.source,
        request_id: params.requestId || generateRequestId(),
        recipient_id: params.recipientId,
        campaign_id: params.campaignId,
        ...params.errorDetails,
      },
      context: params.context || {},
      stack_trace: params.stackTrace || null,
      occurred_at: new Date().toISOString(),
      user_id: params.userId || null,
      client_id: params.clientId || null,
    };

    console.log(`[ERROR-LOGGER] Inserting error log:`, JSON.stringify({
      category: insertData.category,
      severity: insertData.severity,
      message: insertData.message.substring(0, 100),
    }));

    const { data, error } = await supabase
      .from('error_logs')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('[ERROR-LOGGER] Failed to log error to database:', error);
      console.error('[ERROR-LOGGER] Insert data was:', JSON.stringify(insertData, null, 2));
      return { success: false, error: error.message };
    }

    console.log(`[ERROR-LOGGER] Successfully logged ${params.severity} error (ID: ${data.id}): ${params.message.substring(0, 100)}`);
    return { success: true, logId: data.id };
  } catch (err) {
    // Never throw from error logger - just log to console
    console.error('[ERROR-LOGGER] Exception while logging:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Log a provisioning trace checkpoint to the provisioning_trace table
 */
export async function logProvisioningCheckpoint(
  requestId: string,
  checkpoint: ProvisioningCheckpoint,
  context: {
    campaignId?: string;
    recipientId?: string;
    brandId?: string;
    denomination?: number;
  }
): Promise<ErrorLogResult> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('gift_card_provisioning_trace')
      .insert({
        request_id: requestId,
        campaign_id: context.campaignId || null,
        recipient_id: context.recipientId || null,
        brand_id: context.brandId || null,
        denomination: context.denomination || null,
        step_number: checkpoint.stepNumber,
        step_name: checkpoint.stepName,
        status: checkpoint.status,
        duration_ms: checkpoint.durationMs || null,
        details: checkpoint.details || {},
        error_message: checkpoint.errorMessage || null,
        error_code: checkpoint.errorCode || null,
      })
      .select('id')
      .single();

    if (error) {
      // Don't fail silently - log the issue
      console.error('[ERROR-LOGGER] Failed to log provisioning checkpoint:', error);
      return { success: false, error: error.message };
    }

    console.log(`[PROVISION-TRACE] [${requestId}] Step ${checkpoint.stepNumber}: ${checkpoint.stepName} - ${checkpoint.status}`);
    return { success: true, logId: data.id };
  } catch (err) {
    console.error('[ERROR-LOGGER] Exception logging checkpoint:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Log an edge function error with automatic context extraction
 */
export async function logEdgeFunctionError(
  functionName: string,
  error: Error | unknown,
  context?: {
    userId?: string;
    clientId?: string;
    recipientId?: string;
    campaignId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }
): Promise<ErrorLogResult> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Determine severity based on error message
  let severity: ErrorSeverity = 'error';
  const lowerMessage = errorMessage.toLowerCase();
  
  if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) {
    severity = 'critical';
  } else if (lowerMessage.includes('warning') || lowerMessage.includes('not found')) {
    severity = 'warning';
  } else if (lowerMessage.includes('info') || lowerMessage.includes('already')) {
    severity = 'info';
  }

  // Determine category based on function name
  let category: ErrorCategory = 'unknown';
  if (functionName.includes('gift-card') || functionName.includes('provision')) {
    category = 'gift_card';
  } else if (functionName.includes('campaign')) {
    category = 'campaign';
  } else if (functionName.includes('call-center') || functionName.includes('call_center')) {
    category = 'call_center';
  } else if (functionName.includes('auth')) {
    category = 'auth';
  }

  return logError({
    category,
    severity,
    source: functionName,
    message: errorMessage,
    stackTrace: errorStack,
    userId: context?.userId,
    clientId: context?.clientId,
    recipientId: context?.recipientId,
    campaignId: context?.campaignId,
    requestId: context?.requestId,
    errorDetails: context?.metadata,
  });
}

/**
 * Log an external service error (Tillo, Twilio, etc.)
 */
export async function logExternalServiceError(
  serviceName: string,
  error: Error | unknown,
  context?: {
    userId?: string;
    clientId?: string;
    recipientId?: string;
    campaignId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }
): Promise<ErrorLogResult> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return logError({
    category: 'external_service',
    severity: 'error',
    source: serviceName,
    message: errorMessage,
    stackTrace: errorStack,
    userId: context?.userId,
    clientId: context?.clientId,
    recipientId: context?.recipientId,
    campaignId: context?.campaignId,
    requestId: context?.requestId,
    errorDetails: context?.metadata,
  });
}

/**
 * Log a database error
 */
export async function logDatabaseError(
  operation: string,
  error: Error | { message: string } | unknown,
  context?: {
    table?: string;
    userId?: string;
    clientId?: string;
    recipientId?: string;
    campaignId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }
): Promise<ErrorLogResult> {
  const errorMessage = error && typeof error === 'object' && 'message' in error 
    ? (error as { message: string }).message 
    : String(error);

  return logError({
    category: 'database',
    severity: 'error',
    source: `db:${operation}`,
    message: errorMessage,
    userId: context?.userId,
    clientId: context?.clientId,
    recipientId: context?.recipientId,
    campaignId: context?.campaignId,
    requestId: context?.requestId,
    errorDetails: {
      ...context?.metadata,
      table: context?.table,
    },
  });
}

/**
 * Log a gift card provisioning error with structured error code
 */
export async function logProvisioningError(
  errorCode: ProvisioningErrorCode,
  error: Error | unknown,
  context: {
    requestId: string;
    campaignId?: string;
    recipientId?: string;
    brandId?: string;
    denomination?: number;
    stepNumber?: number;
    stepName?: string;
    metadata?: Record<string, any>;
  }
): Promise<ErrorLogResult> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Determine severity based on error code
  let severity: ErrorSeverity = 'error';
  if (['GC-001', 'GC-004', 'GC-006'].includes(errorCode)) {
    severity = 'critical'; // Config/credit issues need immediate attention
  } else if (['GC-009', 'GC-010', 'GC-011'].includes(errorCode)) {
    severity = 'warning'; // User-facing issues
  }

  // Log to error_logs table
  const logResult = await logError({
    category: 'gift_card',
    severity,
    source: 'gift-card-provisioning',
    message: `[${errorCode}] ${PROVISIONING_ERROR_CODES[errorCode]}: ${errorMessage}`,
    stackTrace: errorStack,
    recipientId: context.recipientId,
    campaignId: context.campaignId,
    requestId: context.requestId,
    errorDetails: {
      error_code: errorCode,
      error_description: PROVISIONING_ERROR_CODES[errorCode],
      brand_id: context.brandId,
      denomination: context.denomination,
      step_number: context.stepNumber,
      step_name: context.stepName,
      ...context.metadata,
    },
  });

  // Also log to provisioning trace table
  if (context.stepNumber && context.stepName) {
    await logProvisioningCheckpoint(context.requestId, {
      stepNumber: context.stepNumber,
      stepName: context.stepName,
      status: 'failed',
      errorMessage: `[${errorCode}] ${errorMessage}`,
      errorCode,
      details: context.metadata,
    }, {
      campaignId: context.campaignId,
      recipientId: context.recipientId,
      brandId: context.brandId,
      denomination: context.denomination,
    });
  }

  return logResult;
}

/**
 * Create an enhanced error logging wrapper for edge functions
 * 
 * Usage:
 * ```typescript
 * const logger = createErrorLogger('my-function');
 * 
 * try {
 *   await logger.checkpoint(1, 'Validating input', 'started', { input });
 *   // ... your code
 *   await logger.checkpoint(1, 'Validating input', 'completed');
 * } catch (error) {
 *   await logger.logError(error, { userId: 'xxx' });
 *   throw error;
 * }
 * ```
 */
export function createErrorLogger(functionName: string) {
  const requestId = generateRequestId();
  let provisioningContext: {
    campaignId?: string;
    recipientId?: string;
    brandId?: string;
    denomination?: number;
  } = {};
  
  const checkpointTimers: Map<number, number> = new Map();
  
  return {
    requestId,
    
    // Set provisioning context for checkpoints
    setProvisioningContext: (ctx: typeof provisioningContext) => {
      provisioningContext = { ...provisioningContext, ...ctx };
    },
    
    // Log a provisioning checkpoint
    checkpoint: async (
      stepNumber: number,
      stepName: string,
      status: ProvisioningCheckpoint['status'],
      details?: Record<string, any>
    ) => {
      let durationMs: number | undefined;
      
      if (status === 'started') {
        checkpointTimers.set(stepNumber, Date.now());
      } else if (status === 'completed' || status === 'failed') {
        const startTime = checkpointTimers.get(stepNumber);
        if (startTime) {
          durationMs = Date.now() - startTime;
          checkpointTimers.delete(stepNumber);
        }
      }
      
      return logProvisioningCheckpoint(requestId, {
        stepNumber,
        stepName,
        status,
        durationMs,
        details,
      }, provisioningContext);
    },
    
    // Log general error
    logError: (error: Error | unknown, context?: {
      userId?: string;
      clientId?: string;
      recipientId?: string;
      campaignId?: string;
      metadata?: Record<string, any>;
    }) => logEdgeFunctionError(functionName, error, { ...context, requestId }),
    
    // Log provisioning-specific error with code
    logProvisioningError: (
      errorCode: ProvisioningErrorCode,
      error: Error | unknown,
      stepInfo?: { stepNumber: number; stepName: string },
      metadata?: Record<string, any>
    ) => logProvisioningError(errorCode, error, {
      requestId,
      ...provisioningContext,
      ...stepInfo,
      metadata,
    }),
    
    // Log warning
    logWarning: (message: string, metadata?: Record<string, any>) => logError({
      category: functionName.includes('gift-card') || functionName.includes('provision') ? 'gift_card' : 'unknown',
      severity: 'warning',
      source: functionName,
      message,
      requestId,
      errorDetails: metadata,
    }),
    
    // Log info
    logInfo: (message: string, metadata?: Record<string, any>) => logError({
      category: functionName.includes('gift-card') || functionName.includes('provision') ? 'gift_card' : 'unknown',
      severity: 'info',
      source: functionName,
      message,
      requestId,
      errorDetails: metadata,
    }),
    
    // Log external service error
    logExternalError: (serviceName: string, error: Error | unknown, metadata?: Record<string, any>) => 
      logExternalServiceError(serviceName, error, { requestId, metadata }),
    
    // Log database error
    logDbError: (operation: string, error: Error | { message: string } | unknown, table?: string, metadata?: Record<string, any>) =>
      logDatabaseError(operation, error, { requestId, table, metadata }),
      
    // Get error code description
    getErrorCodeDescription: (code: ProvisioningErrorCode) => PROVISIONING_ERROR_CODES[code],
  };
}

export default {
  logError,
  logEdgeFunctionError,
  logExternalServiceError,
  logDatabaseError,
  logProvisioningError,
  logProvisioningCheckpoint,
  createErrorLogger,
  generateRequestId,
  PROVISIONING_ERROR_CODES,
};
