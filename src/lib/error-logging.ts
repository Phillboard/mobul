/**
 * Error Logging Utility
 * 
 * Centralized error logging to database for monitoring and alerting
 */

import { supabase } from '@/integrations/supabase/client';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 
  | 'gift_card' 
  | 'campaign' 
  | 'contact' 
  | 'form' 
  | 'auth' 
  | 'call_center' 
  | 'api' 
  | 'database' 
  | 'external_service' 
  | 'unknown';

interface LogErrorOptions {
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  errorDetails?: any;
  context?: Record<string, any>;
  stackTrace?: string;
  userId?: string;
  clientId?: string;
}

/**
 * Log error to database for centralized monitoring
 */
export async function logErrorToDatabase(options: LogErrorOptions) {
  try {
    // Get current user if not provided
    let userId = options.userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    // Prepare error log entry
    const errorLog = {
      severity: options.severity,
      category: options.category,
      message: options.message,
      error_details: options.errorDetails || {},
      context: {
        ...options.context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
      },
      stack_trace: options.stackTrace,
      user_id: userId,
      client_id: options.clientId,
    };

    // Insert into error_logs table
    const { error } = await supabase
      .from('error_logs')
      .insert(errorLog);

    if (error) {
      // If logging fails, at least log to console
      console.error('[ErrorLogger] Failed to log to database:', error);
      console.error('[ErrorLogger] Original error:', errorLog);
    }
  } catch (err) {
    // Fail silently - don't want error logging to break the app
    console.error('[ErrorLogger] Exception while logging:', err);
  }
}

/**
 * Log React error boundary errors
 */
export async function logReactError(error: Error, errorInfo: React.ErrorInfo) {
  await logErrorToDatabase({
    severity: 'high',
    category: 'unknown',
    message: error.message,
    errorDetails: {
      type: 'react_error',
      name: error.name,
    },
    context: {
      componentStack: errorInfo.componentStack,
    },
    stackTrace: error.stack,
  });
}

/**
 * Log API errors
 */
export async function logApiError(
  endpoint: string,
  method: string,
  statusCode: number,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: statusCode >= 500 ? 'high' : 'medium',
    category: 'api',
    message: `API Error: ${method} ${endpoint} - Status ${statusCode}`,
    errorDetails: {
      endpoint,
      method,
      statusCode,
      error: typeof error === 'string' ? error : error?.message || 'Unknown error',
    },
    context,
  });
}

/**
 * Log gift card errors
 */
export async function logGiftCardError(
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'high',
    category: 'gift_card',
    message: `Gift Card Error: ${operation}`,
    errorDetails: {
      operation,
      error: error?.message || error,
    },
    context,
  });
}

/**
 * Log campaign errors
 */
export async function logCampaignError(
  campaignId: string,
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'medium',
    category: 'campaign',
    message: `Campaign Error: ${operation}`,
    errorDetails: {
      campaignId,
      operation,
      error: error?.message || error,
    },
    context,
  });
}

/**
 * Log call center errors
 */
export async function logCallCenterError(
  recipientId: string,
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'high',
    category: 'call_center',
    message: `Call Center Error: ${operation}`,
    errorDetails: {
      recipientId,
      operation,
      error: error?.message || error,
    },
    context,
  });
}

/**
 * Log authentication errors
 */
export async function logAuthError(
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'high',
    category: 'auth',
    message: `Authentication Error: ${operation}`,
    errorDetails: {
      operation,
      error: error?.message || error,
    },
    context,
  });
}

/**
 * Log database errors
 */
export async function logDatabaseError(
  table: string,
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'critical',
    category: 'database',
    message: `Database Error: ${operation} on ${table}`,
    errorDetails: {
      table,
      operation,
      error: error?.message || error,
      code: error?.code,
    },
    context,
  });
}

/**
 * Log external service errors (Twilio, Resend, etc.)
 */
export async function logExternalServiceError(
  service: string,
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'high',
    category: 'external_service',
    message: `External Service Error: ${service} - ${operation}`,
    errorDetails: {
      service,
      operation,
      error: error?.message || error,
    },
    context,
  });
}

/**
 * Log form submission errors
 */
export async function logFormError(
  formId: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'medium',
    category: 'form',
    message: `Form Submission Error`,
    errorDetails: {
      formId,
      error: error?.message || error,
    },
    context,
  });
}

/**
 * Log contact management errors
 */
export async function logContactError(
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  await logErrorToDatabase({
    severity: 'medium',
    category: 'contact',
    message: `Contact Management Error: ${operation}`,
    errorDetails: {
      operation,
      error: error?.message || error,
    },
    context,
  });
}

