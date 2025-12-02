/**
 * Analytics Data Generators
 * Generates performance metrics, usage analytics, and error logs for comprehensive reporting
 */

import { createClient } from '@supabase/supabase-js';
import { 
  ERROR_PATTERNS, 
  PERFORMANCE_BASELINES,
  TEMPORAL_PATTERNS 
} from './config';
import { 
  generateActivityTimestamp,
  generatePerformanceTime,
  isBusinessHours 
} from './time-simulator';

export interface PerformanceMetricRecord {
  user_id?: string;
  client_id?: string;
  metric_type: 'page_load' | 'api_response' | 'edge_function' | 'database_query';
  metric_name: string;
  duration_ms: number;
  metadata?: any;
  recorded_at: string;
}

export interface UsageAnalyticRecord {
  user_id?: string;
  client_id?: string;
  event_type: 'feature_used' | 'page_view' | 'action_completed';
  feature_name: string;
  metadata?: any;
  occurred_at: string;
}

export interface ErrorLogRecord {
  user_id?: string;
  client_id?: string;
  error_type: string;
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  component_name?: string;
  function_name?: string;
  url?: string;
  user_agent?: string;
  request_data?: any;
  occurred_at: string;
  resolved?: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

const PAGE_NAMES = [
  'Dashboard',
  'Campaigns',
  'Campaign Analytics',
  'Contacts',
  'Contact Lists',
  'Gift Card Inventory',
  'Call Center',
  'Templates',
  'Landing Pages',
  'Settings',
  'Billing',
];

const FEATURE_NAMES = [
  'campaign.create',
  'campaign.edit',
  'campaign.launch',
  'contact.import',
  'contact.create',
  'contact.export',
  'list.create',
  'template.design',
  'landing_page.publish',
  'gift_card.provision',
  'call.log',
  'sms.send',
  'report.generate',
  'webhook.configure',
];

const API_ENDPOINTS = [
  '/api/campaigns',
  '/api/contacts',
  '/api/recipients',
  '/api/events',
  '/api/gift-cards',
  '/api/call-sessions',
  '/api/analytics',
  '/api/templates',
  '/api/landing-pages',
];

const ERROR_MESSAGES = {
  'api_error': [
    'Failed to fetch data from API',
    'API request timeout',
    'Invalid API response format',
    'API rate limit exceeded',
  ],
  'database_error': [
    'Database connection failed',
    'Query execution timeout',
    'Constraint violation',
    'Deadlock detected',
  ],
  'validation_error': [
    'Invalid email format',
    'Required field missing',
    'Date range invalid',
    'File size exceeds limit',
  ],
  'timeout_error': [
    'Request timeout',
    'Operation took too long',
    'Connection timeout',
  ],
  'auth_error': [
    'Authentication failed',
    'Token expired',
    'Insufficient permissions',
    'Invalid credentials',
  ],
  'unknown_error': [
    'An unexpected error occurred',
    'Internal server error',
    'Unknown error',
  ],
};

const COMPONENTS = [
  'CampaignWizard',
  'ContactImport',
  'DashboardStats',
  'CallCenterPanel',
  'GiftCardManager',
  'TemplateEditor',
  'LandingPageBuilder',
  'AnalyticsChart',
];

/**
 * Generate performance metrics for a time period
 */
export async function generatePerformanceMetrics(
  supabase: ReturnType<typeof createClient>,
  startDate: Date,
  endDate: Date,
  userIds: string[],
  clientIds: string[],
  count: number,
  batchSize: number = 1000,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const metrics: PerformanceMetricRecord[] = [];
  let inserted = 0;
  
  for (let i = 0; i < count; i++) {
    const timestamp = generateActivityTimestamp(startDate, endDate, false);
    const metricTypes: Array<'page_load' | 'api_response' | 'edge_function' | 'database_query'> = 
      ['page_load', 'api_response', 'edge_function', 'database_query'];
    const metricType = metricTypes[Math.floor(Math.random() * metricTypes.length)];
    
    let metricName: string;
    switch (metricType) {
      case 'page_load':
        metricName = PAGE_NAMES[Math.floor(Math.random() * PAGE_NAMES.length)];
        break;
      case 'api_response':
        metricName = API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
        break;
      case 'edge_function':
        metricName = `ef_${FEATURE_NAMES[Math.floor(Math.random() * FEATURE_NAMES.length)].split('.')[0]}`;
        break;
      case 'database_query':
        metricName = `query_${['campaigns', 'contacts', 'recipients', 'events'][Math.floor(Math.random() * 4)]}`;
        break;
    }
    
    metrics.push({
      user_id: Math.random() < 0.8 && userIds.length > 0 
        ? userIds[Math.floor(Math.random() * userIds.length)] 
        : undefined,
      client_id: Math.random() < 0.9 && clientIds.length > 0
        ? clientIds[Math.floor(Math.random() * clientIds.length)]
        : undefined,
      metric_type: metricType,
      metric_name: metricName,
      duration_ms: generatePerformanceTime(PERFORMANCE_BASELINES[metricType], timestamp),
      metadata: {
        browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
        platform: ['Windows', 'macOS', 'Linux'][Math.floor(Math.random() * 3)],
      },
      recorded_at: timestamp.toISOString(),
    });
    
    // Batch insert
    if (metrics.length >= batchSize) {
      const { error } = await supabase
        .from('performance_metrics')
        .insert(metrics);
      
      if (error) throw new Error(`Failed to insert performance metrics: ${error.message}`);
      
      inserted += metrics.length;
      if (onProgress) onProgress(inserted, count);
      metrics.length = 0;
    }
  }
  
  // Insert remaining
  if (metrics.length > 0) {
    const { error } = await supabase
      .from('performance_metrics')
      .insert(metrics);
    
    if (error) throw new Error(`Failed to insert performance metrics: ${error.message}`);
    inserted += metrics.length;
    if (onProgress) onProgress(inserted, count);
  }
  
  return inserted;
}

/**
 * Generate usage analytics for a time period
 */
export async function generateUsageAnalytics(
  supabase: ReturnType<typeof createClient>,
  startDate: Date,
  endDate: Date,
  userIds: string[],
  clientIds: string[],
  count: number,
  batchSize: number = 1000,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const analytics: UsageAnalyticRecord[] = [];
  let inserted = 0;
  
  for (let i = 0; i < count; i++) {
    const timestamp = generateActivityTimestamp(startDate, endDate, true);
    const eventTypes: Array<'feature_used' | 'page_view' | 'action_completed'> = 
      ['feature_used', 'page_view', 'action_completed'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    let featureName: string;
    let metadata: any = {};
    
    switch (eventType) {
      case 'page_view':
        featureName = PAGE_NAMES[Math.floor(Math.random() * PAGE_NAMES.length)];
        metadata = { duration_seconds: Math.floor(Math.random() * 300) + 10 };
        break;
      case 'feature_used':
        featureName = FEATURE_NAMES[Math.floor(Math.random() * FEATURE_NAMES.length)];
        metadata = { success: Math.random() < 0.95 };
        break;
      case 'action_completed':
        featureName = FEATURE_NAMES[Math.floor(Math.random() * FEATURE_NAMES.length)];
        metadata = { 
          success: Math.random() < 0.92,
          duration_ms: Math.floor(Math.random() * 5000) + 100
        };
        break;
    }
    
    analytics.push({
      user_id: userIds.length > 0 
        ? userIds[Math.floor(Math.random() * userIds.length)] 
        : undefined,
      client_id: Math.random() < 0.85 && clientIds.length > 0
        ? clientIds[Math.floor(Math.random() * clientIds.length)]
        : undefined,
      event_type: eventType,
      feature_name: featureName,
      metadata,
      occurred_at: timestamp.toISOString(),
    });
    
    // Batch insert
    if (analytics.length >= batchSize) {
      const { error } = await supabase
        .from('usage_analytics')
        .insert(analytics);
      
      if (error) throw new Error(`Failed to insert usage analytics: ${error.message}`);
      
      inserted += analytics.length;
      if (onProgress) onProgress(inserted, count);
      analytics.length = 0;
    }
  }
  
  // Insert remaining
  if (analytics.length > 0) {
    const { error } = await supabase
      .from('usage_analytics')
      .insert(analytics);
    
    if (error) throw new Error(`Failed to insert usage analytics: ${error.message}`);
    inserted += analytics.length;
    if (onProgress) onProgress(inserted, count);
  }
  
  return inserted;
}

/**
 * Generate error logs with realistic patterns
 */
export async function generateErrorLogs(
  supabase: ReturnType<typeof createClient>,
  startDate: Date,
  endDate: Date,
  userIds: string[],
  clientIds: string[],
  count: number,
  batchSize: number = 500,
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const errors: ErrorLogRecord[] = [];
  let inserted = 0;
  const timeSpan = endDate.getTime() - startDate.getTime();
  const daysSpan = timeSpan / (24 * 60 * 60 * 1000);
  
  for (let i = 0; i < count; i++) {
    let timestamp = new Date(startDate.getTime() + Math.random() * timeSpan);
    
    // Check for incident spikes
    const dayNumber = Math.floor((timestamp.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    for (const spike of ERROR_PATTERNS.incidentSpikes) {
      if (Math.abs(dayNumber - spike.day) < spike.duration / 24) {
        // During incident - increase error generation probability
        if (Math.random() < 0.3) {
          timestamp = new Date(startDate.getTime() + spike.day * 24 * 60 * 60 * 1000 + Math.random() * spike.duration * 60 * 60 * 1000);
          break;
        }
      }
    }
    
    // Determine error type
    const errorTypeRoll = Math.random();
    let errorType = 'unknown_error';
    let accumulated = 0;
    for (const [type, probability] of Object.entries(ERROR_PATTERNS.errorTypes)) {
      accumulated += probability;
      if (errorTypeRoll < accumulated) {
        errorType = type;
        break;
      }
    }
    
    const errorMessages = ERROR_MESSAGES[errorType as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.unknown_error;
    const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    
    const resolved = Math.random() < ERROR_PATTERNS.resolutionRate;
    const resolvedAt = resolved 
      ? new Date(timestamp.getTime() + Math.random() * 24 * 60 * 60 * 1000)
      : undefined;
    
    errors.push({
      user_id: Math.random() < 0.6 && userIds.length > 0
        ? userIds[Math.floor(Math.random() * userIds.length)]
        : undefined,
      client_id: Math.random() < 0.7 && clientIds.length > 0
        ? clientIds[Math.floor(Math.random() * clientIds.length)]
        : undefined,
      error_type: errorType,
      error_message: errorMessage,
      error_code: `E${Math.floor(Math.random() * 9000) + 1000}`,
      stack_trace: Math.random() < 0.5 
        ? `Error: ${errorMessage}\n  at ${COMPONENTS[Math.floor(Math.random() * COMPONENTS.length)]}.tsx:${Math.floor(Math.random() * 200) + 1}`
        : undefined,
      component_name: COMPONENTS[Math.floor(Math.random() * COMPONENTS.length)],
      function_name: FEATURE_NAMES[Math.floor(Math.random() * FEATURE_NAMES.length)].split('.').join('_'),
      url: API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)],
      user_agent: `Mozilla/5.0 (${['Windows', 'Macintosh', 'Linux'][Math.floor(Math.random() * 3)]})`,
      request_data: Math.random() < 0.3 ? { payload: 'sensitive data redacted' } : undefined,
      occurred_at: timestamp.toISOString(),
      resolved,
      resolved_at: resolvedAt?.toISOString(),
      resolved_by: resolved && userIds.length > 0 
        ? userIds[Math.floor(Math.random() * Math.min(3, userIds.length))]
        : undefined,
    });
    
    // Batch insert
    if (errors.length >= batchSize) {
      const { error } = await supabase
        .from('error_logs')
        .insert(errors);
      
      if (error) throw new Error(`Failed to insert error logs: ${error.message}`);
      
      inserted += errors.length;
      if (onProgress) onProgress(inserted, count);
      errors.length = 0;
    }
  }
  
  // Insert remaining
  if (errors.length > 0) {
    const { error } = await supabase
      .from('error_logs')
      .insert(errors);
    
    if (error) throw new Error(`Failed to insert error logs: ${error.message}`);
    inserted += errors.length;
    if (onProgress) onProgress(inserted, count);
  }
  
  return inserted;
}

/**
 * Generate all analytics data
 */
export async function generateAllAnalytics(
  supabase: ReturnType<typeof createClient>,
  startDate: Date,
  endDate: Date,
  userIds: string[],
  clientIds: string[],
  config: {
    performanceMetricsCount: number;
    usageAnalyticsCount: number;
    errorLogsCount: number;
  },
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<{ performance: number; usage: number; errors: number }> {
  
  console.log('📊 Generating analytics data...');
  
  const performanceCount = await generatePerformanceMetrics(
    supabase,
    startDate,
    endDate,
    userIds,
    clientIds,
    config.performanceMetricsCount,
    1000,
    (current, total) => onProgress?.('performance_metrics', current, total)
  );
  
  const usageCount = await generateUsageAnalytics(
    supabase,
    startDate,
    endDate,
    userIds,
    clientIds,
    config.usageAnalyticsCount,
    1000,
    (current, total) => onProgress?.('usage_analytics', current, total)
  );
  
  const errorCount = await generateErrorLogs(
    supabase,
    startDate,
    endDate,
    userIds,
    clientIds,
    config.errorLogsCount,
    500,
    (current, total) => onProgress?.('error_logs', current, total)
  );
  
  return {
    performance: performanceCount,
    usage: usageCount,
    errors: errorCount,
  };
}

