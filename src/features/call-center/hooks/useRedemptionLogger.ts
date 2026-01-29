/**
 * Redemption Workflow Logger Hook
 * 
 * Provides logging functionality for tracking every step of the
 * call center redemption workflow with detailed payloads.
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@core/services/supabase';
import { useAuth } from '@core/auth/AuthProvider';
import { logger } from '@/core/services/logger';

// Step names that can be logged
export type RedemptionStepName = 
  | 'code_lookup'
  | 'campaign_select'
  | 'sms_opt_in'
  | 'sms_response'
  | 'condition_select'
  | 'provision'
  | 'verification_skip'
  | 'email_verification';

// Status of a step
export type RedemptionStepStatus = 'started' | 'success' | 'failed' | 'skipped';

// Parameters for logging a step
export interface LogStepParams {
  stepName: RedemptionStepName;
  stepNumber: number;
  status: RedemptionStepStatus;
  recipientId?: string;
  campaignId?: string;
  callSessionId?: string;
  redemptionCode?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  durationMs?: number;
}

// Sensitive fields to mask in payloads
const SENSITIVE_FIELDS = [
  'card_code',
  'card_number',
  'pin',
  'cvv',
  'password',
  'secret',
  'token',
  'api_key',
  'apiKey',
];

// Fields to partially mask (show last 4 characters)
const PARTIAL_MASK_FIELDS = [
  'phone',
  'phone_number',
  'cellPhone',
  'cell_phone',
];

/**
 * Sanitize a payload by masking sensitive fields
 */
function sanitizePayload(payload: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!payload) return undefined;
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive field that should be fully masked
    if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
    // Check if this should be partially masked
    else if (PARTIAL_MASK_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
      if (typeof value === 'string' && value.length > 4) {
        sanitized[key] = '***' + value.slice(-4);
      } else {
        sanitized[key] = value;
      }
    }
    // Recursively sanitize nested objects
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>);
    }
    // Recursively sanitize arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        item && typeof item === 'object' 
          ? sanitizePayload(item as Record<string, unknown>)
          : item
      );
    }
    // Pass through other values
    else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Generate a unique session ID for grouping log entries
 */
function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Hook for logging redemption workflow steps
 */
export function useRedemptionLogger() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>(generateSessionId());
  
  /**
   * Get the current session ID
   */
  const getSessionId = useCallback(() => {
    return sessionIdRef.current;
  }, []);
  
  /**
   * Start a new logging session (call when starting a new redemption)
   */
  const startNewSession = useCallback(() => {
    sessionIdRef.current = generateSessionId();
    logger.debug('[RedemptionLogger] Started new session:', sessionIdRef.current);
    return sessionIdRef.current;
  }, []);
  
  /**
   * Log a workflow step
   */
  const logStep = useCallback(async (params: LogStepParams) => {
    const sessionId = sessionIdRef.current;
    
    try {
      const logEntry = {
        session_id: sessionId,
        call_session_id: params.callSessionId || null,
        recipient_id: params.recipientId || null,
        campaign_id: params.campaignId || null,
        agent_user_id: user?.id || null,
        redemption_code: params.redemptionCode || null,
        step_name: params.stepName,
        step_number: params.stepNumber,
        status: params.status,
        request_payload: sanitizePayload(params.requestPayload) || {},
        response_payload: sanitizePayload(params.responsePayload) || {},
        error_code: params.errorCode || null,
        error_message: params.errorMessage || null,
        error_stack: params.errorStack || null,
        duration_ms: params.durationMs || null,
      };
      
      logger.debug('[RedemptionLogger] Logging step:', {
        sessionId,
        step: params.stepName,
        status: params.status,
      });
      
      const { error } = await supabase
        .from('redemption_workflow_log')
        .insert(logEntry);
      
      if (error) {
        logger.error('[RedemptionLogger] Failed to insert log:', error);
      }
    } catch (err) {
      // Don't let logging failures break the main workflow
      logger.error('[RedemptionLogger] Error logging step:', err);
    }
  }, [user?.id]);
  
  /**
   * Helper to log a step with timing
   */
  const withTiming = useCallback(<T>(
    stepName: RedemptionStepName,
    stepNumber: number,
    params: Omit<LogStepParams, 'stepName' | 'stepNumber' | 'status' | 'durationMs'>
  ) => {
    const startTime = Date.now();
    
    // Log started
    logStep({
      ...params,
      stepName,
      stepNumber,
      status: 'started',
    });
    
    return {
      success: (responsePayload?: Record<string, unknown>) => {
        logStep({
          ...params,
          stepName,
          stepNumber,
          status: 'success',
          responsePayload,
          durationMs: Date.now() - startTime,
        });
      },
      fail: (error: Error | { code?: string; message?: string }, responsePayload?: Record<string, unknown>) => {
        logStep({
          ...params,
          stepName,
          stepNumber,
          status: 'failed',
          responsePayload,
          errorCode: (error as { code?: string }).code,
          errorMessage: error.message,
          errorStack: error instanceof Error ? error.stack : undefined,
          durationMs: Date.now() - startTime,
        });
      },
      skip: (reason?: string) => {
        logStep({
          ...params,
          stepName,
          stepNumber,
          status: 'skipped',
          errorMessage: reason,
          durationMs: Date.now() - startTime,
        });
      },
    };
  }, [logStep]);
  
  return {
    sessionId: sessionIdRef.current,
    getSessionId,
    startNewSession,
    logStep,
    withTiming,
  };
}

export type { LogStepParams };
