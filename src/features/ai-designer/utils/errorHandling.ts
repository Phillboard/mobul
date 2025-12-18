/**
 * Error Handling Utilities for AI Designer
 * 
 * Provides comprehensive error handling for:
 * - AI generation failures
 * - Broken HTML
 * - Network issues
 * - Validation errors
 */

// ============================================================================
// Error Types
// ============================================================================

export type AIDesignerErrorType =
  | 'AI_GENERATION_FAILED'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'HTML_PARSE_ERROR'
  | 'HTML_VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'SAVE_FAILED'
  | 'EXPORT_FAILED'
  | 'UNKNOWN_ERROR';

export interface AIDesignerError {
  type: AIDesignerErrorType;
  message: string;
  originalError?: Error;
  details?: Record<string, any>;
  recoverable: boolean;
  suggestedAction?: string;
}

// ============================================================================
// Error Messages
// ============================================================================

const ERROR_MESSAGES: Record<AIDesignerErrorType, { message: string; suggestedAction: string }> = {
  AI_GENERATION_FAILED: {
    message: 'Failed to generate landing page. The AI service encountered an issue.',
    suggestedAction: 'Try rephrasing your request or using a simpler description.',
  },
  AI_RATE_LIMITED: {
    message: 'Too many requests. Please wait a moment before trying again.',
    suggestedAction: 'Wait 30 seconds and try again.',
  },
  AI_TIMEOUT: {
    message: 'The AI is taking too long to respond. Please try again.',
    suggestedAction: 'Try with a shorter, simpler request.',
  },
  HTML_PARSE_ERROR: {
    message: 'The generated HTML could not be parsed correctly.',
    suggestedAction: 'Try regenerating the page or editing the code manually.',
  },
  HTML_VALIDATION_ERROR: {
    message: 'The generated HTML contains invalid elements or structure.',
    suggestedAction: 'Try regenerating or check the code for issues.',
  },
  NETWORK_ERROR: {
    message: 'Unable to connect to the server. Check your internet connection.',
    suggestedAction: 'Check your connection and try again.',
  },
  AUTHENTICATION_ERROR: {
    message: 'Your session has expired. Please log in again.',
    suggestedAction: 'Refresh the page to log in again.',
  },
  PERMISSION_DENIED: {
    message: 'You do not have permission to perform this action.',
    suggestedAction: 'Contact your administrator for access.',
  },
  SAVE_FAILED: {
    message: 'Failed to save your landing page.',
    suggestedAction: 'Try again or export your work to avoid losing changes.',
  },
  EXPORT_FAILED: {
    message: 'Failed to export your landing page.',
    suggestedAction: 'Check that your landing page is valid and try again.',
  },
  UNKNOWN_ERROR: {
    message: 'An unexpected error occurred.',
    suggestedAction: 'Please try again or contact support if the issue persists.',
  },
};

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify an error into an AIDesignerError type
 */
export function classifyError(error: Error | string): AIDesignerError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const originalError = typeof error === 'string' ? undefined : error;

  // Rate limiting
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('429') ||
    errorMessage.includes('too many requests')
  ) {
    return {
      type: 'AI_RATE_LIMITED',
      ...ERROR_MESSAGES.AI_RATE_LIMITED,
      originalError,
      recoverable: true,
    };
  }

  // Timeout
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('ETIMEDOUT')
  ) {
    return {
      type: 'AI_TIMEOUT',
      ...ERROR_MESSAGES.AI_TIMEOUT,
      originalError,
      recoverable: true,
    };
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('Failed to fetch')
  ) {
    return {
      type: 'NETWORK_ERROR',
      ...ERROR_MESSAGES.NETWORK_ERROR,
      originalError,
      recoverable: true,
    };
  }

  // Authentication
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('401') ||
    errorMessage.includes('session expired')
  ) {
    return {
      type: 'AUTHENTICATION_ERROR',
      ...ERROR_MESSAGES.AUTHENTICATION_ERROR,
      originalError,
      recoverable: false,
    };
  }

  // Permission
  if (
    errorMessage.includes('forbidden') ||
    errorMessage.includes('403') ||
    errorMessage.includes('permission')
  ) {
    return {
      type: 'PERMISSION_DENIED',
      ...ERROR_MESSAGES.PERMISSION_DENIED,
      originalError,
      recoverable: false,
    };
  }

  // AI generation failures
  if (
    errorMessage.includes('generate') ||
    errorMessage.includes('AI') ||
    errorMessage.includes('OpenAI') ||
    errorMessage.includes('Anthropic')
  ) {
    return {
      type: 'AI_GENERATION_FAILED',
      ...ERROR_MESSAGES.AI_GENERATION_FAILED,
      originalError,
      recoverable: true,
    };
  }

  // Default unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: errorMessage || ERROR_MESSAGES.UNKNOWN_ERROR.message,
    suggestedAction: ERROR_MESSAGES.UNKNOWN_ERROR.suggestedAction,
    originalError,
    recoverable: true,
  };
}

// ============================================================================
// HTML Validation
// ============================================================================

export interface HTMLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate HTML structure
 */
export function validateHTML(html: string): HTMLValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!html || html.trim().length === 0) {
    return {
      isValid: false,
      errors: ['HTML content is empty'],
      warnings: [],
    };
  }

  // Check for basic HTML structure
  if (!html.includes('<html') && !html.includes('<body') && !html.includes('<div')) {
    warnings.push('HTML does not contain standard document structure');
  }

  // Check for unclosed tags (basic check)
  const openTags = (html.match(/<[a-z][a-z0-9]*(?:\s[^>]*)?>/gi) || []).length;
  const closeTags = (html.match(/<\/[a-z][a-z0-9]*>/gi) || []).length;
  const selfClosingTags = (html.match(/<[a-z][a-z0-9]*(?:\s[^>]*)?\s*\/>/gi) || []).length;
  const voidElements = (html.match(/<(img|input|br|hr|meta|link)(?:\s[^>]*)?>/gi) || []).length;

  if (openTags - selfClosingTags - voidElements > closeTags + 5) {
    warnings.push('HTML may contain unclosed tags');
  }

  // Check for potential script injection
  if (/<script[^>]*>[\s\S]*?<\/script>/gi.test(html)) {
    warnings.push('HTML contains script tags which may be stripped for security');
  }

  // Check for inline event handlers
  if (/\son\w+\s*=/gi.test(html)) {
    warnings.push('HTML contains inline event handlers which may be stripped');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Attempt to fix common HTML issues
 */
export function sanitizeHTML(html: string): string {
  let cleaned = html;

  // Remove script tags
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove inline event handlers
  cleaned = cleaned.replace(/\s(on\w+)\s*=\s*["'][^"']*["']/gi, '');

  // Ensure Tailwind CSS CDN is present
  if (!cleaned.includes('tailwindcss')) {
    if (cleaned.includes('</head>')) {
      cleaned = cleaned.replace(
        '</head>',
        '  <script src="https://cdn.tailwindcss.com"></script>\n</head>'
      );
    }
  }

  return cleaned;
}

// ============================================================================
// Retry Logic
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with automatic retry on failure
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;
  let delay = baseDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on non-recoverable errors
      const classifiedError = classifyError(error);
      if (!classifiedError.recoverable) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

/**
 * Convert an error to a user-friendly message object
 */
export function getUserFriendlyError(error: Error | string | AIDesignerError): {
  title: string;
  description: string;
  action?: string;
  canRetry: boolean;
} {
  // If already an AIDesignerError
  if (typeof error === 'object' && 'type' in error && error.type) {
    const aiError = error as AIDesignerError;
    return {
      title: getErrorTitle(aiError.type),
      description: aiError.message,
      action: aiError.suggestedAction,
      canRetry: aiError.recoverable,
    };
  }

  // Classify the error
  const classified = classifyError(error as Error | string);
  return {
    title: getErrorTitle(classified.type),
    description: classified.message,
    action: classified.suggestedAction,
    canRetry: classified.recoverable,
  };
}

function getErrorTitle(type: AIDesignerErrorType): string {
  const titles: Record<AIDesignerErrorType, string> = {
    AI_GENERATION_FAILED: 'Generation Failed',
    AI_RATE_LIMITED: 'Rate Limited',
    AI_TIMEOUT: 'Request Timeout',
    HTML_PARSE_ERROR: 'Parse Error',
    HTML_VALIDATION_ERROR: 'Validation Error',
    NETWORK_ERROR: 'Connection Error',
    AUTHENTICATION_ERROR: 'Session Expired',
    PERMISSION_DENIED: 'Access Denied',
    SAVE_FAILED: 'Save Failed',
    EXPORT_FAILED: 'Export Failed',
    UNKNOWN_ERROR: 'Error',
  };
  return titles[type];
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log error for debugging (in production, send to error tracking service)
 */
export function logError(error: AIDesignerError, context?: Record<string, any>): void {
  console.error('[AI Designer Error]', {
    type: error.type,
    message: error.message,
    details: error.details,
    context,
    stack: error.originalError?.stack,
    timestamp: new Date().toISOString(),
  });

  // In production, you would send this to an error tracking service
  // like Sentry, LogRocket, or similar
}
