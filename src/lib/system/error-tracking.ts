/**
 * Centralized Error Tracking System
 * 
 * Provides structured error logging, monitoring, and alerting across the platform.
 * Integrates with Supabase for storage and can be extended to external services.
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

export interface ErrorContext {
  userId?: string;
  clientId?: string;
  campaignId?: string;
  recipientId?: string;
  formId?: string;
  component?: string;
  function?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface ErrorLogEntry {
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  error?: Error | unknown;
  context?: ErrorContext;
  timestamp: Date;
  stackTrace?: string;
}

class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private errorBuffer: ErrorLogEntry[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxBufferSize: number = 50;
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.startAutoFlush();
  }

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  /**
   * Log an error with context
   */
  async logError(entry: ErrorLogEntry): Promise<void> {
    // Add to buffer
    this.errorBuffer.push(entry);

    // Console log for immediate visibility
    this.consoleLog(entry);

    // Flush if buffer is full
    if (this.errorBuffer.length >= this.maxBufferSize) {
      await this.flush();
    }

    // Alert on critical errors
    if (entry.severity === 'critical') {
      await this.sendCriticalAlert(entry);
    }
  }

  /**
   * Convenience methods for different severity levels
   */
  async logLow(
    category: ErrorCategory,
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ): Promise<void> {
    return this.logError({ severity: 'low', category, message, error, context, timestamp: new Date() });
  }

  async logMedium(
    category: ErrorCategory,
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ): Promise<void> {
    return this.logError({ severity: 'medium', category, message, error, context, timestamp: new Date() });
  }

  async logHigh(
    category: ErrorCategory,
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ): Promise<void> {
    return this.logError({ severity: 'high', category, message, error, context, timestamp: new Date() });
  }

  async logCritical(
    category: ErrorCategory,
    message: string,
    error?: Error | unknown,
    context?: ErrorContext
  ): Promise<void> {
    return this.logError({ severity: 'critical', category, message, error, context, timestamp: new Date() });
  }

  /**
   * Flush buffered errors to database
   */
  private async flush(): Promise<void> {
    if (this.errorBuffer.length === 0) return;

    const errorsToFlush = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      const { error } = await supabase
        .from('error_logs')
        .insert(
          errorsToFlush.map(entry => ({
            severity: entry.severity,
            category: entry.category,
            message: entry.message,
            error_details: entry.error ? this.serializeError(entry.error) : null,
            context: entry.context || {},
            stack_trace: entry.stackTrace || (entry.error instanceof Error ? entry.error.stack : null),
            occurred_at: entry.timestamp.toISOString(),
            user_id: entry.context?.userId || null,
            client_id: entry.context?.clientId || null,
          }))
        );

      if (error) {
        console.error('[ErrorTracking] Failed to flush errors:', error);
        // Put errors back in buffer
        this.errorBuffer.unshift(...errorsToFlush);
      }
    } catch (err) {
      console.error('[ErrorTracking] Exception during flush:', err);
    }
  }

  /**
   * Start automatic flushing
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop automatic flushing
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  /**
   * Console logging with color coding
   */
  private consoleLog(entry: ErrorLogEntry): void {
    const severityColors = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    const icon = severityColors[entry.severity];
    const timestamp = entry.timestamp.toISOString();
    
    console.error(
      `${icon} [${entry.severity.toUpperCase()}] [${entry.category}] ${timestamp}`,
      '\n  Message:', entry.message,
      entry.context ? '\n  Context:' : '', entry.context || '',
      entry.error ? '\n  Error:' : '', entry.error || ''
    );
  }

  /**
   * Serialize error objects for JSON storage
   */
  private serializeError(error: unknown): Record<string, any> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...error
      };
    }
    return { value: String(error) };
  }

  /**
   * Send critical error alerts
   */
  private async sendCriticalAlert(entry: ErrorLogEntry): Promise<void> {
    try {
      // Log to system alerts table
      await supabase
        .from('system_alerts')
        .insert({
          alert_type: 'critical_error',
          title: `Critical Error: ${entry.category}`,
          message: entry.message,
          severity: 'critical',
          metadata: {
            category: entry.category,
            context: entry.context,
            error: this.serializeError(entry.error)
          }
        });

      // Could also integrate with external services here:
      // - Send to Sentry
      // - Send to Slack webhook
      // - Send SMS to on-call engineer
      // - Trigger PagerDuty alert
    } catch (err) {
      console.error('[ErrorTracking] Failed to send critical alert:', err);
    }
  }

  /**
   * Get recent errors for dashboard
   */
  async getRecentErrors(limit: number = 100, filters?: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    clientId?: string;
    since?: Date;
  }): Promise<any[]> {
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.since) {
      query = query.gte('occurred_at', filters.since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ErrorTracking] Failed to fetch errors:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<string, number>;
    topErrors: Array<{ message: string; count: number }>;
  }> {
    const now = new Date();
    const since = new Date(now);
    
    switch (timeRange) {
      case 'hour':
        since.setHours(since.getHours() - 1);
        break;
      case 'day':
        since.setDate(since.getDate() - 1);
        break;
      case 'week':
        since.setDate(since.getDate() - 7);
        break;
    }

    const { data, error } = await supabase
      .from('error_logs')
      .select('severity, category, message')
      .gte('occurred_at', since.toISOString());

    if (error || !data) {
      return {
        total: 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        byCategory: {},
        topErrors: []
      };
    }

    const stats = {
      total: data.length,
      bySeverity: data.reduce((acc, err) => {
        acc[err.severity] = (acc[err.severity] || 0) + 1;
        return acc;
      }, {} as Record<ErrorSeverity, number>),
      byCategory: data.reduce((acc, err) => {
        acc[err.category] = (acc[err.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topErrors: Object.entries(
        data.reduce((acc, err) => {
          acc[err.message] = (acc[err.message] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };

    return stats;
  }
}

// Export singleton instance
export const errorTracking = ErrorTrackingService.getInstance();

// Export convenience functions
export const logError = {
  low: (category: ErrorCategory, message: string, error?: Error | unknown, context?: ErrorContext) =>
    errorTracking.logLow(category, message, error, context),
  medium: (category: ErrorCategory, message: string, error?: Error | unknown, context?: ErrorContext) =>
    errorTracking.logMedium(category, message, error, context),
  high: (category: ErrorCategory, message: string, error?: Error | unknown, context?: ErrorContext) =>
    errorTracking.logHigh(category, message, error, context),
  critical: (category: ErrorCategory, message: string, error?: Error | unknown, context?: ErrorContext) =>
    errorTracking.logCritical(category, message, error, context),
};

