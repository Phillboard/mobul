/**
 * Retry Logic Utilities
 * 
 * Implements exponential backoff and retry strategies
 * for critical operations
 */

import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (opts.shouldRetry && !opts.shouldRetry(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );
      
      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${opts.maxAttempts})`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(attempt, error);
      }
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Network errors are retryable
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return true;
  }
  
  // Timeout errors are retryable
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }
  
  // 5xx server errors are retryable
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // 429 rate limit is retryable (with backoff)
  if (error.status === 429) {
    return true;
  }
  
  // 408 request timeout is retryable
  if (error.status === 408) {
    return true;
  }
  
  // Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return true;
  }
  
  // Supabase specific errors
  if (error.code === 'PGRST301') { // connection error
    return true;
  }
  
  return false;
}

/**
 * Retry wrapper for gift card provisioning
 */
export async function retryGiftCardProvisioning<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retryOperation(operation, {
    maxAttempts: 3,
    initialDelay: 2000,
    shouldRetry: isRetryableError,
    onRetry: (attempt, error) => {
      logger.info(`Retrying gift card provisioning (attempt ${attempt})`, {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

/**
 * Retry wrapper for SMS delivery
 */
export async function retrySMSDelivery<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retryOperation(operation, {
    maxAttempts: 5, // More attempts for SMS
    initialDelay: 1000,
    maxDelay: 30000,
    shouldRetry: (error) => {
      // Retry on network errors and Twilio 5xx errors
      return isRetryableError(error) || 
        (error.code >= 20500 && error.code < 20600); // Twilio server errors
    },
    onRetry: (attempt, error) => {
      logger.info(`Retrying SMS delivery (attempt ${attempt})`, {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

/**
 * Retry wrapper for API calls
 */
export async function retryAPICall<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retryOperation(operation, {
    maxAttempts: 3,
    initialDelay: 500,
    shouldRetry: isRetryableError,
  });
}

/**
 * Retry wrapper for database operations
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retryOperation(operation, {
    maxAttempts: 2, // Fewer retries for DB
    initialDelay: 500,
    shouldRetry: (error) => {
      // Only retry on connection issues, not data issues
      return error.code === 'PGRST301' || // connection error
             error.message?.includes('connection') ||
             error.message?.includes('timeout');
    },
  });
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch retry for multiple operations
 */
export async function retryBatch<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: boolean; result?: T; error?: any }>> {
  const results = await Promise.allSettled(
    operations.map(op => retryOperation(op, options))
  );
  
  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, result: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

