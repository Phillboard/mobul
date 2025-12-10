/**
 * Frontend Error Logger
 * 
 * Provides centralized error logging for the React application.
 * Logs errors to the Supabase error_logs table.
 */

import { supabase } from '@/integrations/supabase/client';

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
  url?: string;
  userAgent?: string;
}

interface ErrorLogResult {
  success: boolean;
  logId?: string;
  error?: string;
}

// Track logged errors to prevent duplicates within a short time window
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000; // 5 seconds

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
}

/**
 * Create a hash of an error for deduplication
 */
function getErrorHash(source: string, errorMessage: string): string {
  return `${source}:${errorMessage.substring(0, 100)}`;
}

/**
 * Check if an error was recently logged
 */
function isRecentlyLogged(hash: string): boolean {
  const lastLogged = recentErrors.get(hash);
  if (!lastLogged) return false;
  
  const elapsed = Date.now() - lastLogged;
  if (elapsed > DEDUP_WINDOW_MS) {
    recentErrors.delete(hash);
    return false;
  }
  return true;
}

/**
 * Log an error to the database
 */
export async function logError(params: LogErrorParams): Promise<ErrorLogResult> {
  try {
    // Check for duplicate
    const hash = getErrorHash(params.source, params.errorMessage);
    if (isRecentlyLogged(hash)) {
      console.log('[ERROR-LOGGER] Skipping duplicate error:', params.errorMessage.substring(0, 50));
      return { success: true };
    }
    
    // Mark as logged
    recentErrors.set(hash, Date.now());
    
    // Get current user if available
    let userId = params.userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }
    
    // Map severity to legacy values for compatibility
    const severityMap: Record<string, string> = {
      'info': 'low',
      'warning': 'medium',
      'error': 'high',
      'critical': 'critical',
    };
    const mappedSeverity = severityMap[params.severity] || params.severity;
    
    // Insert error log
    const { data, error } = await supabase
      .from('error_logs')
      .insert({
        error_type: params.errorType,
        source: params.source,
        error_message: params.errorMessage,
        error_stack: params.errorStack || null,
        timestamp: new Date().toISOString(),
        metadata: params.metadata || {},
        url: params.url || window.location.href,
        user_agent: params.userAgent || navigator.userAgent,
        request_id: generateRequestId(),
        recipient_id: params.recipientId || null,
        campaign_id: params.campaignId || null,
        organization_id: params.organizationId || null,
        severity: mappedSeverity,
        user_id: userId || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[ERROR-LOGGER] Failed to log error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[ERROR-LOGGER] Logged ${params.severity} from ${params.source}`);
    return { success: true, logId: data.id };
  } catch (err) {
    // Never throw from error logger
    console.error('[ERROR-LOGGER] Exception while logging:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Log a React component error
 */
export async function logComponentError(
  componentName: string,
  error: Error,
  errorInfo?: { componentStack?: string }
): Promise<ErrorLogResult> {
  return logError({
    errorType: 'frontend',
    severity: 'error',
    source: `component:${componentName}`,
    errorMessage: error.message,
    errorStack: error.stack,
    metadata: {
      componentStack: errorInfo?.componentStack,
    },
  });
}

/**
 * Log an API call error
 */
export async function logApiError(
  endpoint: string,
  error: Error | { message: string },
  context?: {
    method?: string;
    statusCode?: number;
    requestBody?: any;
    responseBody?: any;
  }
): Promise<ErrorLogResult> {
  const errorMessage = error instanceof Error ? error.message : error.message;
  
  return logError({
    errorType: 'api_call',
    severity: 'error',
    source: `api:${endpoint}`,
    errorMessage,
    errorStack: error instanceof Error ? error.stack : undefined,
    metadata: {
      method: context?.method,
      statusCode: context?.statusCode,
      requestBody: context?.requestBody,
      responseBody: context?.responseBody,
    },
  });
}

/**
 * Log a warning
 */
export async function logWarning(
  source: string,
  message: string,
  metadata?: Record<string, any>
): Promise<ErrorLogResult> {
  return logError({
    errorType: 'frontend',
    severity: 'warning',
    source,
    errorMessage: message,
    metadata,
  });
}

/**
 * Log info
 */
export async function logInfo(
  source: string,
  message: string,
  metadata?: Record<string, any>
): Promise<ErrorLogResult> {
  return logError({
    errorType: 'frontend',
    severity: 'info',
    source,
    errorMessage: message,
    metadata,
  });
}

/**
 * Create an error logger scoped to a specific component/feature
 */
export function createScopedLogger(scopeName: string) {
  return {
    error: (error: Error | string, metadata?: Record<string, any>) =>
      logError({
        errorType: 'frontend',
        severity: 'error',
        source: scopeName,
        errorMessage: error instanceof Error ? error.message : error,
        errorStack: error instanceof Error ? error.stack : undefined,
        metadata,
      }),
    
    warning: (message: string, metadata?: Record<string, any>) =>
      logWarning(scopeName, message, metadata),
    
    info: (message: string, metadata?: Record<string, any>) =>
      logInfo(scopeName, message, metadata),
    
    apiError: (endpoint: string, error: Error | { message: string }, context?: any) =>
      logApiError(`${scopeName}:${endpoint}`, error, context),
  };
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      errorType: 'frontend',
      severity: 'error',
      source: 'unhandledrejection',
      errorMessage: event.reason?.message || String(event.reason),
      errorStack: event.reason?.stack,
      metadata: {
        reason: String(event.reason),
      },
    });
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    logError({
      errorType: 'frontend',
      severity: 'error',
      source: 'global:error',
      errorMessage: event.message,
      errorStack: event.error?.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}

export default {
  logError,
  logComponentError,
  logApiError,
  logWarning,
  logInfo,
  createScopedLogger,
  setupGlobalErrorHandlers,
  generateRequestId,
};

