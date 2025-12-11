/**
 * Performance Monitoring Utilities
 * 
 * Tracks performance metrics and usage analytics
 */

import { supabase } from "@core/services/supabase";
import { logger } from "./logger";

type MetricType = 'page_load' | 'api_response' | 'edge_function' | 'database_query';

/**
 * Record a performance metric
 */
export async function recordPerformanceMetric(
  metricType: MetricType,
  metricName: string,
  durationMs: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('performance_metrics').insert({
      user_id: user?.id,
      metric_type: metricType,
      metric_name: metricName,
      duration_ms: durationMs,
      metadata: metadata || null,
    });

    logger.debug(`[METRICS] ${metricName}: ${durationMs}ms`);
  } catch (error) {
    logger.error('Failed to record performance metric:', error);
  }
}

/**
 * Measure and record execution time of a function
 */
export async function measurePerformance<T>(
  metricName: string,
  metricType: MetricType,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const duration = Math.round(performance.now() - startTime);
    await recordPerformanceMetric(metricType, metricName, duration, metadata);
    return result;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    await recordPerformanceMetric(metricType, metricName, duration, {
      ...metadata,
      error: true,
    });
    throw error;
  }
}

type EventType = 'feature_used' | 'page_view' | 'action_completed';

/**
 * Record a usage analytics event
 */
export async function recordUsageEvent(
  eventType: EventType,
  featureName: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('usage_analytics').insert({
      user_id: user?.id,
      event_type: eventType,
      feature_name: featureName,
      metadata: metadata || null,
    });

    logger.debug(`[ANALYTICS] ${eventType}: ${featureName}`);
  } catch (error) {
    logger.error('Failed to record usage event:', error);
  }
}

/**
 * Track page view
 */
export async function trackPageView(pageName: string): Promise<void> {
  await recordUsageEvent('page_view', pageName, {
    url: window.location.href,
    referrer: document.referrer,
  });
}

/**
 * Track feature usage
 */
export async function trackFeatureUsage(
  featureName: string,
  action: string,
  metadata?: Record<string, any>
): Promise<void> {
  await recordUsageEvent('feature_used', featureName, {
    action,
    ...metadata,
  });
}

/**
 * Track action completion
 */
export async function trackActionCompleted(
  actionName: string,
  metadata?: Record<string, any>
): Promise<void> {
  await recordUsageEvent('action_completed', actionName, metadata);
}

/**
 * Get average performance for a metric
 */
export async function getAveragePerformance(
  metricType: MetricType,
  metricName: string,
  hours: number = 24
): Promise<number | null> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('duration_ms')
      .eq('metric_type', metricType)
      .eq('metric_name', metricName)
      .gte('recorded_at', since);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const avg = data.reduce((sum, m) => sum + m.duration_ms, 0) / data.length;
    return Math.round(avg);
  } catch (error) {
    logger.error('Failed to get average performance:', error);
    return null;
  }
}

/**
 * Get error rate for a specific error type
 */
export async function getErrorRate(
  errorType: string,
  hours: number = 24
): Promise<number> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('error_type', errorType)
      .gte('occurred_at', since);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error('Failed to get error rate:', error);
    return 0;
  }
}
