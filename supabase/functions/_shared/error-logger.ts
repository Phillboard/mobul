/**
 * Shared Error Logger for Edge Functions
 * 
 * Provides centralized error logging to the error_logs table.
 * Non-blocking - errors in logging won't break main flow.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export type ErrorType = 'edge_function' | 'frontend' | 'api_call' | 'database' | 'external_service';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface LogErrorParams {
  errorType: ErrorType;
  severity: ErrorSeverity;
  source: string;
  errorMessage: string;
  errorStack?: string;
  userId?: string;
  recipientId?: string;
  campaignId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  requestId?: string;
}

export interface ErrorLogResult {
  success: boolean;
  logId?: string;
  error?: string;
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
 * Log an error to the error_logs table
 * 
 * This function is non-blocking and won't throw errors.
 * If logging fails, it will console.error but not disrupt the main flow.
 */
export async function logError(params: LogErrorParams): Promise<ErrorLogResult> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('error_logs')
      .insert({
        error_type: params.errorType,
        severity: params.severity,
        source: params.source,
        error_message: params.errorMessage,
        error_stack: params.errorStack || null,
        user_id: params.userId || null,
        recipient_id: params.recipientId || null,
        campaign_id: params.campaignId || null,
        organization_id: params.organizationId || null,
        metadata: params.metadata || {},
        request_id: params.requestId || generateRequestId(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[ERROR-LOGGER] Failed to log error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[ERROR-LOGGER] Logged ${params.severity} from ${params.source}: ${params.errorMessage.substring(0, 100)}...`);
    return { success: true, logId: data.id };
  } catch (err) {
    // Never throw from error logger - just log to console
    console.error('[ERROR-LOGGER] Exception while logging:', err);
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
    recipientId?: string;
    campaignId?: string;
    organizationId?: string;
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

  return logError({
    errorType: 'edge_function',
    severity,
    source: functionName,
    errorMessage,
    errorStack,
    userId: context?.userId,
    recipientId: context?.recipientId,
    campaignId: context?.campaignId,
    organizationId: context?.organizationId,
    requestId: context?.requestId,
    metadata: context?.metadata,
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
    recipientId?: string;
    campaignId?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }
): Promise<ErrorLogResult> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  return logError({
    errorType: 'external_service',
    severity: 'error',
    source: serviceName,
    errorMessage,
    errorStack,
    userId: context?.userId,
    recipientId: context?.recipientId,
    campaignId: context?.campaignId,
    requestId: context?.requestId,
    metadata: context?.metadata,
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
    errorType: 'database',
    severity: 'error',
    source: `db:${operation}`,
    errorMessage,
    userId: context?.userId,
    recipientId: context?.recipientId,
    campaignId: context?.campaignId,
    requestId: context?.requestId,
    metadata: {
      ...context?.metadata,
      table: context?.table,
    },
  });
}

/**
 * Create an error logging wrapper for edge functions
 * 
 * Usage:
 * ```typescript
 * const { logError, requestId } = createErrorLogger('my-function');
 * 
 * try {
 *   // ... your code
 * } catch (error) {
 *   await logError(error, { userId: 'xxx' });
 *   throw error; // or handle appropriately
 * }
 * ```
 */
export function createErrorLogger(functionName: string) {
  const requestId = generateRequestId();
  
  return {
    requestId,
    logError: (error: Error | unknown, context?: {
      userId?: string;
      recipientId?: string;
      campaignId?: string;
      organizationId?: string;
      metadata?: Record<string, any>;
    }) => logEdgeFunctionError(functionName, error, { ...context, requestId }),
    
    logWarning: (message: string, metadata?: Record<string, any>) => logError({
      errorType: 'edge_function',
      severity: 'warning',
      source: functionName,
      errorMessage: message,
      requestId,
      metadata,
    }),
    
    logInfo: (message: string, metadata?: Record<string, any>) => logError({
      errorType: 'edge_function',
      severity: 'info',
      source: functionName,
      errorMessage: message,
      requestId,
      metadata,
    }),
    
    logExternalError: (serviceName: string, error: Error | unknown, metadata?: Record<string, any>) => 
      logExternalServiceError(serviceName, error, { requestId, metadata }),
    
    logDbError: (operation: string, error: Error | { message: string } | unknown, table?: string, metadata?: Record<string, any>) =>
      logDatabaseError(operation, error, { requestId, table, metadata }),
  };
}

export default {
  logError,
  logEdgeFunctionError,
  logExternalServiceError,
  logDatabaseError,
  createErrorLogger,
  generateRequestId,
};

