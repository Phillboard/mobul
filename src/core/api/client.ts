/**
 * Centralized API Client for Edge Functions
 * Version 2.0 - Enhanced with retry, tracing, and interceptors
 */
import { supabase } from '@core/services/supabase';
import { logger } from '@core/services/logger';

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public functionName?: string,
    public originalError?: any,
    public code?: string
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

interface RequestContext {
  requestId: string;
  startTime: number;
  functionName: string;
  attempt: number;
}

// Interceptor types
type RequestInterceptor = (config: RequestConfig, context: RequestContext) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = (response: any, context: RequestContext) => any | Promise<any>;
type ErrorInterceptor = (error: EdgeFunctionError, context: RequestContext) => EdgeFunctionError | Promise<EdgeFunctionError>;

// Global interceptors
const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
}

export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
}

export function addErrorInterceptor(interceptor: ErrorInterceptor) {
  errorInterceptors.push(interceptor);
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: EdgeFunctionError): boolean {
  // Don't retry timeouts
  if (error.statusCode === 408 || error.name === 'AbortError') return false;
  
  // Retry on rate limiting
  if (error.statusCode === 429) return true;
  
  // Retry on server errors
  if (error.statusCode && error.statusCode >= 500) return true;
  
  // Retry on network errors
  if (error.message?.toLowerCase().includes('network')) return true;
  if (error.message?.toLowerCase().includes('fetch')) return true;
  
  return false;
}

async function executeRequest<TResponse, TBody>(
  functionName: string,
  body: TBody | undefined,
  config: RequestConfig,
  context: RequestContext
): Promise<TResponse> {
  const { timeout = 30000, headers = {} } = config;

  // Get current session for auth token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    throw new EdgeFunctionError(
      'Failed to get authentication session',
      401,
      functionName,
      sessionError,
      'AUTH_SESSION_ERROR'
    );
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        'X-Request-ID': context.requestId,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Edge function ${functionName} failed`;
      let errorCode = 'EDGE_FUNCTION_ERROR';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
        errorCode = errorJson.code || errorCode;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new EdgeFunctionError(
        errorMessage,
        response.status,
        functionName,
        undefined,
        errorCode
      );
    }

    // Parse response
    const data = await response.json();
    return data as TResponse;

  } catch (fetchError: any) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (fetchError.name === 'AbortError') {
      throw new EdgeFunctionError(
        `Edge function ${functionName} timed out after ${timeout}ms`,
        408,
        functionName,
        fetchError,
        'TIMEOUT'
      );
    }

    // Re-throw EdgeFunctionError as-is
    if (fetchError instanceof EdgeFunctionError) {
      throw fetchError;
    }

    // Wrap other errors
    throw new EdgeFunctionError(
      `Network error calling ${functionName}: ${fetchError.message}`,
      undefined,
      functionName,
      fetchError,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Call a Supabase Edge Function with automatic auth, retry, and interceptors
 */
export async function callEdgeFunction<TResponse = any, TBody = any>(
  functionName: string,
  body?: TBody,
  config: RequestConfig = {}
): Promise<TResponse> {
  const { retries = 2, retryDelay = 1000 } = config;
  
  const requestId = generateRequestId();
  const context: RequestContext = {
    requestId,
    startTime: Date.now(),
    functionName,
    attempt: 0,
  };
  
  // Run through request interceptors
  let finalConfig = { ...config };
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig, context);
  }
  
  let lastError: EdgeFunctionError | undefined;
  
  // Attempt with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    context.attempt = attempt + 1;
    
    try {
      const response = await executeRequest<TResponse, TBody>(
        functionName,
        body,
        finalConfig,
        context
      );
      
      // Run through response interceptors
      let finalResponse = response;
      for (const interceptor of responseInterceptors) {
        finalResponse = await interceptor(finalResponse, context);
      }
      
      // Log successful request
      const duration = Date.now() - context.startTime;
      logger.info(`[API] ${functionName} completed in ${duration}ms`, {
        requestId,
        attempt: context.attempt,
        duration,
      });
      
      return finalResponse;
      
    } catch (error: any) {
      lastError = error instanceof EdgeFunctionError 
        ? error 
        : new EdgeFunctionError(
            `Unexpected error: ${error.message}`,
            undefined,
            functionName,
            error,
            'UNEXPECTED_ERROR'
          );
      
      // Run through error interceptors
      for (const interceptor of errorInterceptors) {
        lastError = await interceptor(lastError, context);
      }
      
      // Check if we should retry
      if (attempt < retries && isRetryableError(lastError)) {
        const delayMs = retryDelay * Math.pow(2, attempt); // Exponential backoff
        logger.warn(`[API] ${functionName} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delayMs}ms`, {
          requestId,
          error: lastError.message,
          statusCode: lastError.statusCode,
        });
        await delay(delayMs);
        continue;
      }
      
      // No more retries or non-retryable error
      break;
    }
  }
  
  // Log final error
  const duration = Date.now() - context.startTime;
  logger.error(`[API] ${functionName} failed after ${context.attempt} attempts (${duration}ms)`, {
    requestId,
    error: lastError?.message,
    statusCode: lastError?.statusCode,
    code: lastError?.code,
  });
  
  throw lastError;
}

/**
 * Call edge function without authentication (for public endpoints)
 */
export async function callPublicEdgeFunction<TResponse = any, TBody = any>(
  functionName: string,
  body?: TBody,
  config: RequestConfig = {}
): Promise<TResponse> {
  const { timeout = 30000, headers = {}, retries = 2, retryDelay = 1000 } = config;
  
  const requestId = generateRequestId();
  const context: RequestContext = {
    requestId,
    startTime: Date.now(),
    functionName,
    attempt: 0,
  };

  let lastError: EdgeFunctionError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    context.attempt = attempt + 1;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/${functionName}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Public edge function ${functionName} failed`;
          let errorCode = 'PUBLIC_EDGE_FUNCTION_ERROR';
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
            errorCode = errorJson.code || errorCode;
          } catch {
            errorMessage = errorText || errorMessage;
          }

          throw new EdgeFunctionError(
            errorMessage,
            response.status,
            functionName,
            undefined,
            errorCode
          );
        }

        const data = await response.json();
        
        const duration = Date.now() - context.startTime;
        logger.info(`[API] Public ${functionName} completed in ${duration}ms`, {
          requestId,
          duration,
        });
        
        return data as TResponse;

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          throw new EdgeFunctionError(
            `Public edge function ${functionName} timed out after ${timeout}ms`,
            408,
            functionName,
            fetchError,
            'TIMEOUT'
          );
        }

        if (fetchError instanceof EdgeFunctionError) {
          throw fetchError;
        }

        throw new EdgeFunctionError(
          `Network error calling public ${functionName}: ${fetchError.message}`,
          undefined,
          functionName,
          fetchError,
          'NETWORK_ERROR'
        );
      }
    } catch (error: any) {
      lastError = error instanceof EdgeFunctionError 
        ? error 
        : new EdgeFunctionError(
            `Unexpected error: ${error.message}`,
            undefined,
            functionName,
            error,
            'UNEXPECTED_ERROR'
          );

      if (attempt < retries && isRetryableError(lastError)) {
        const delayMs = retryDelay * Math.pow(2, attempt);
        logger.warn(`[API] Public ${functionName} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delayMs}ms`);
        await delay(delayMs);
        continue;
      }

      break;
    }
  }

  const duration = Date.now() - context.startTime;
  logger.error(`[API] Public ${functionName} failed after ${context.attempt} attempts (${duration}ms)`, {
    requestId,
    error: lastError?.message,
    statusCode: lastError?.statusCode,
  });

  throw lastError;
}

/**
 * Helper to use with TanStack Query mutations
 */
export function createEdgeFunctionMutation<TResponse = any, TBody = any>(
  functionName: string,
  config?: RequestConfig
) {
  return {
    mutationFn: (body: TBody) => callEdgeFunction<TResponse, TBody>(functionName, body, config),
  };
}

/**
 * Helper for query functions
 */
export function createEdgeFunctionQuery<TResponse = any, TBody = any>(
  functionName: string,
  body: TBody,
  config?: RequestConfig
) {
  return {
    queryKey: [functionName, body],
    queryFn: () => callEdgeFunction<TResponse, TBody>(functionName, body, config),
  };
}
