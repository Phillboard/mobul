/**
 * Centralized logging utility for the ACE Engage platform
 * 
 * Provides structured logging with different levels and automatic
 * integration with error tracking services.
 */

import { logError } from '../error-logging';

export interface LogContext {
  component?: string;
  function?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Logger utility with different log levels
 */
export const logger = {
  /**
   * Development-only logs (removed in production builds)
   * Use for debugging during development
   */
  dev: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log('[DEV]', ...args);
    }
  },

  /**
   * Informational logs for tracking flow
   * Use for non-error significant events
   */
  info: (message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
      console.info('[INFO]', message, context || '');
    }
  },

  /**
   * Warning logs for potential issues
   * Use for recoverable errors or deprecated usage
   */
  warn: (message: string, context?: LogContext) => {
    console.warn('[WARN]', message, context || '');
  },

  /**
   * Error logs for actual errors
   * Automatically sent to error tracking service
   */
  error: (message: string, error?: Error, context?: LogContext) => {
    console.error('[ERROR]', message, error || '', context || '');
    
    // Send to error tracking
    if (error) {
      logError(error, {
        message,
        ...context,
      });
    }
  },

  /**
   * Debug logs with detailed context
   * Only in development, more verbose than dev()
   */
  debug: (component: string, action: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${component}.${action}`, data || '');
    }
  },

  /**
   * Performance logging
   * Use for tracking timing of operations
   */
  perf: (operation: string, startTime: number) => {
    if (import.meta.env.DEV) {
      const duration = performance.now() - startTime;
      console.log(`[PERF] ${operation}: ${duration.toFixed(2)}ms`);
    }
  },

  /**
   * Trace logging for detailed execution flow
   * Use sparingly, only for complex debugging
   */
  trace: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.trace('[TRACE]', message, data || '');
    }
  },
};

/**
 * Create a scoped logger for a specific component
 * Automatically adds component context to all logs
 */
export function createLogger(componentName: string) {
  return {
    dev: (...args: any[]) => logger.dev(`[${componentName}]`, ...args),
    info: (message: string, context?: LogContext) => 
      logger.info(message, { component: componentName, ...context }),
    warn: (message: string, context?: LogContext) => 
      logger.warn(message, { component: componentName, ...context }),
    error: (message: string, error?: Error, context?: LogContext) => 
      logger.error(message, error, { component: componentName, ...context }),
    debug: (action: string, data?: any) => 
      logger.debug(componentName, action, data),
    perf: (operation: string, startTime: number) => 
      logger.perf(`${componentName}.${operation}`, startTime),
  };
}

export default logger;
