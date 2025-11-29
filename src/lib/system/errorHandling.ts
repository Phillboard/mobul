/**
 * Centralized Error Handling Utilities
 * 
 * Provides consistent error handling patterns across the application
 */

import { toast } from "@/hooks/use-toast";
import { logger } from "./logger";
import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Handle API errors with consistent user feedback and logging
 * 
 * @param error - Error object from API call
 * @param context - Context string for logging (e.g., "CreateCampaign")
 * @param customMessage - Optional custom user-facing message
 */
export async function handleApiError(
  error: unknown,
  context: string,
  customMessage?: string
): Promise<void> {
  let userMessage = customMessage || 'An unexpected error occurred';
  let errorDetails: any = error;
  let errorCode: string | undefined;

  // Handle Supabase PostgrestError
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const pgError = error as PostgrestError;
    userMessage = customMessage || pgError.message;
    errorCode = pgError.code;
    errorDetails = {
      code: pgError.code,
      message: pgError.message,
      details: pgError.details,
      hint: pgError.hint,
    };
    logger.error(`[${context}] Supabase error:`, errorDetails);
  }
  // Handle standard Error objects
  else if (error instanceof Error) {
    userMessage = customMessage || error.message;
    errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    logger.error(`[${context}] Error:`, errorDetails);
  }
  // Handle unknown errors
  else {
    logger.error(`[${context}] Unknown error:`, error);
  }

  // Log to database for monitoring
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('error_logs').insert({
      user_id: user?.id,
      error_type: context,
      error_message: userMessage,
      error_code: errorCode,
      stack_trace: errorDetails.stack || JSON.stringify(errorDetails),
      component_name: context,
      url: window.location.href,
      user_agent: navigator.userAgent,
    });
  } catch (logError) {
    // Don't fail if logging fails
    logger.error('Failed to log error to database:', logError);
  }

  // Show toast notification to user
  toast({
    variant: "destructive",
    title: "Error",
    description: userMessage,
  });
}

/**
 * Handle success with consistent user feedback
 * 
 * @param message - Success message to display
 * @param context - Context string for logging
 */
export function handleSuccess(message: string, context?: string): void {
  toast({
    title: "Success",
    description: message,
  });
  
  if (context) {
    logger.info(`[${context}] Success:`, message);
  }
}

/**
 * Create a standardized error object
 * 
 * @param message - Error message
 * @param code - Optional error code
 * @param details - Optional additional details
 */
export function createError(
  message: string,
  code?: string,
  details?: any
): ApiError {
  return {
    message,
    code,
    details,
  };
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    error.message.includes('fetch')
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as any).code;
    return code === 'PGRST301' || code === '401' || code === 'UNAUTHORIZED';
  }
  return false;
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as any).code;
    return code === 'PGRST116' || code === '403' || code === 'FORBIDDEN';
  }
  return false;
}

/**
 * Format error for display
 */
export function formatErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (isAuthError(error)) {
    return 'Authentication required. Please log in.';
  }
  
  if (isPermissionError(error)) {
    return 'You do not have permission to perform this action.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}
