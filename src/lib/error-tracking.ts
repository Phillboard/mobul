/**
 * Error Tracking Service
 * 
 * Centralized error tracking and reporting
 * Integrates with Sentry or similar services
 */

import { logger } from './logger';

export interface ErrorContext {
  user_id?: string;
  client_id?: string;
  campaign_id?: string;
  url?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: ErrorContext,
    public isRecoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Initialize error tracking service
 */
export function initErrorTracking() {
  // Check if Sentry is configured
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;
  
  if (sentryDSN && typeof window !== 'undefined') {
    // Sentry will be initialized here when installed
    // For now, use custom error tracking
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    logger.info('Error tracking initialized');
  }
}

/**
 * Track an error
 */
export function trackError(
  error: Error | AppError,
  context?: ErrorContext
): void {
  // Log to console in development
  logger.error('Error tracked:', {
    message: error.message,
    stack: error.stack,
    context,
  });

  // In production, send to error tracking service
  if (import.meta.env.PROD) {
    // Send to Sentry or custom backend
    sendToErrorService(error, context);
  }
}

/**
 * Track a warning (non-fatal issue)
 */
export function trackWarning(
  message: string,
  context?: ErrorContext
): void {
  logger.warn('Warning tracked:', { message, context });
  
  if (import.meta.env.PROD) {
    sendToErrorService(new Error(message), { ...context, severity: 'warning' });
  }
}

/**
 * Handle global JavaScript errors
 */
function handleGlobalError(event: ErrorEvent): void {
  trackError(event.error || new Error(event.message), {
    url: window.location.href,
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  });
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason));
    
  trackError(error, {
    url: window.location.href,
    metadata: {
      type: 'unhandled_rejection',
    },
  });
}

/**
 * Send error to tracking service
 */
async function sendToErrorService(
  error: Error,
  context?: ErrorContext & { severity?: string }
): Promise<void> {
  try {
    // When Sentry is configured, use it
    // For now, send to custom endpoint
    const sentryDSN = import.meta.env.VITE_SENTRY_DSN;
    
    if (!sentryDSN) {
      // No error service configured, just log
      return;
    }

    // Simplified error reporting
    await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        url: window.location.href,
      }),
    }).catch(() => {
      // Silently fail - don't break app due to tracking issues
    });
  } catch {
    // Silently fail - tracking errors shouldn't break the app
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error | AppError): string {
  if (error instanceof AppError && error.code) {
    return ERROR_MESSAGES[error.code] || error.message;
  }
  
  // Map common errors to friendly messages
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return 'You don\'t have permission to perform this action. Contact your administrator if you need access.';
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource could not be found. It may have been deleted or moved.';
  }
  
  if (message.includes('timeout')) {
    return 'The operation took too long to complete. Please try again.';
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Some of the information provided is invalid. Please check your input and try again.';
  }
  
  // Default friendly message
  return 'Something went wrong. Please try again or contact support if the problem persists.';
}

// Error message dictionary
const ERROR_MESSAGES: Record<string, string> = {
  'INSUFFICIENT_CARDS': 'Not enough gift cards available in the pool. Please add more cards or contact your administrator.',
  'INVALID_REDEMPTION_CODE': 'The redemption code you entered is invalid or has already been used.',
  'RECIPIENT_NOT_FOUND': 'No recipient found with that code. Please check the code and try again.',
  'DUPLICATE_EMAIL': 'A contact with this email address already exists.',
  'CAMPAIGN_NOT_FOUND': 'Campaign not found. It may have been deleted.',
  'AUDIENCE_EMPTY': 'This campaign has no recipients. Please add recipients before launching.',
  'PERMISSION_DENIED': 'You don\'t have permission to perform this action.',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
  'INVALID_FILE_FORMAT': 'The file format is not supported. Please use CSV format.',
  'FILE_TOO_LARGE': 'The file is too large. Maximum size is 10MB.',
  'TWILIO_ERROR': 'Failed to send SMS. Please verify the phone number and try again.',
  'EMAIL_DELIVERY_FAILED': 'Failed to send email. Please verify the email address.',
  'POOL_NOT_FOUND': 'Gift card pool not found.',
  'BRAND_NOT_FOUND': 'Gift card brand not found.',
  'CLIENT_NOT_SELECTED': 'Please select a client first.',
};

/**
 * Create an AppError with user-friendly message
 */
export function createError(
  code: string,
  technicalMessage?: string,
  context?: ErrorContext,
  isRecoverable: boolean = true
): AppError {
  const userMessage = ERROR_MESSAGES[code] || technicalMessage || 'An error occurred';
  const error = new AppError(userMessage, code, context, isRecoverable);
  
  // Log technical details
  if (technicalMessage && technicalMessage !== userMessage) {
    logger.error(`[${code}] ${technicalMessage}`, context);
  }
  
  return error;
}

