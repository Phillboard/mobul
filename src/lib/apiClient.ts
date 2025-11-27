/**
 * Centralized API Client for Edge Functions
 * Standardizes all edge function calls with consistent error handling
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public functionName?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

interface EdgeFunctionOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Call a Supabase Edge Function with automatic auth token injection
 */
export async function callEdgeFunction<TResponse = any, TBody = any>(
  functionName: string,
  body?: TBody,
  options: EdgeFunctionOptions = {}
): Promise<TResponse> {
  const { timeout = 30000, headers = {} } = options;

  try {
    // Get current session for auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new EdgeFunctionError(
        'Failed to get authentication session',
        401,
        functionName,
        sessionError
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
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new EdgeFunctionError(
          errorMessage,
          response.status,
          functionName
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
          fetchError
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
        fetchError
      );
    }
  } catch (error: any) {
    // Log error for debugging
    logger.error(`[API Client] Error calling ${functionName}:`, error);
    
    // Re-throw EdgeFunctionError as-is
    if (error instanceof EdgeFunctionError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new EdgeFunctionError(
      `Unexpected error calling ${functionName}: ${error.message}`,
      undefined,
      functionName,
      error
    );
  }
}

/**
 * Call edge function without authentication (for public endpoints)
 */
export async function callPublicEdgeFunction<TResponse = any, TBody = any>(
  functionName: string,
  body?: TBody,
  options: EdgeFunctionOptions = {}
): Promise<TResponse> {
  const { timeout = 30000, headers = {} } = options;

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
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Public edge function ${functionName} failed`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new EdgeFunctionError(
          errorMessage,
          response.status,
          functionName
        );
      }

      const data = await response.json();
      return data as TResponse;

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        throw new EdgeFunctionError(
          `Public edge function ${functionName} timed out after ${timeout}ms`,
          408,
          functionName,
          fetchError
        );
      }

      if (fetchError instanceof EdgeFunctionError) {
        throw fetchError;
      }

      throw new EdgeFunctionError(
        `Network error calling public ${functionName}: ${fetchError.message}`,
        undefined,
        functionName,
        fetchError
      );
    }
  } catch (error: any) {
    logger.error(`[API Client] Error calling public ${functionName}:`, error);
    
    if (error instanceof EdgeFunctionError) {
      throw error;
    }

    throw new EdgeFunctionError(
      `Unexpected error calling public ${functionName}: ${error.message}`,
      undefined,
      functionName,
      error
    );
  }
}

/**
 * Helper to use with TanStack Query
 */
export function createEdgeFunctionMutation<TResponse = any, TBody = any>(
  functionName: string,
  options?: EdgeFunctionOptions
) {
  return {
    mutationFn: (body: TBody) => callEdgeFunction<TResponse, TBody>(functionName, body, options),
  };
}

/**
 * Helper for query functions
 */
export function createEdgeFunctionQuery<TResponse = any, TBody = any>(
  functionName: string,
  body: TBody,
  options?: EdgeFunctionOptions
) {
  return {
    queryFn: () => callEdgeFunction<TResponse, TBody>(functionName, body, options),
  };
}
