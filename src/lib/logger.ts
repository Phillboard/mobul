/**
 * Centralized logging utility
 * 
 * Replaces console.log statements with environment-aware logging
 * In production, only errors are logged to console
 * In development, all log levels are available
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log informational messages (development only)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log warning messages (development only)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (always logged, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug messages (development only)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log table data (development only)
   */
  table: (data: any) => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },
};
