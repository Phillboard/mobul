/**
 * useActivityLogs Hook
 * 
 * Main data fetching hook for activity logs with support for:
 * - Filtering by category, status, date range
 * - Full-text search
 * - Pagination
 * - Sorting
 * 
 * Fetches data from the unified activity_log table.
 * Falls back to legacy tables (gift_card_billing_ledger, login_history, error_logs)
 * for backward compatibility while the new logging system is rolled out.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { 
  ActivityLog, 
  ActivityFilters, 
  ActivityCategory,
  ActivityQueryResult,
} from '../types/activity.types';

interface UseActivityLogsOptions {
  category?: ActivityCategory;
  filters?: ActivityFilters;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enabled?: boolean;
}

/**
 * Fetch activity logs from the unified activity_log table
 */
async function fetchActivityLogs(
  clientId: string | undefined,
  category: ActivityCategory | undefined,
  filters: ActivityFilters | undefined,
  page: number,
  pageSize: number
): Promise<{ data: ActivityLog[]; count: number }> {
  try {
    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Filter by client if provided
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by status
    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    // Filter by event types
    if (filters?.event_types?.length) {
      query = query.in('event_type', filters.event_types);
    }

    // Filter by date range
    if (filters?.date_range?.start) {
      query = query.gte('created_at', filters.date_range.start);
    }
    if (filters?.date_range?.end) {
      query = query.lte('created_at', filters.date_range.end);
    }

    // Filter by severity
    if (filters?.severity?.length) {
      query = query.in('severity', filters.severity);
    }

    // Filter by campaign
    if (filters?.campaign_id) {
      query = query.eq('campaign_id', filters.campaign_id);
    }

    // Filter by user
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    // Full-text search on description
    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching activity logs:', error);
      return { data: [], count: 0 };
    }

    // Transform to ActivityLog format
    const logs: ActivityLog[] = (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      category: row.category,
      event_type: row.event_type,
      status: row.status,
      severity: row.severity || 'info',
      user_id: row.user_id,
      user_email: row.metadata?.target_user_email || row.metadata?.user_email,
      client_id: row.client_id,
      organization_id: row.organization_id,
      campaign_id: row.campaign_id,
      recipient_id: row.recipient_id,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      metadata: row.metadata,
      // Gift card specific
      recipient_name: row.metadata?.recipient_name,
      brand_name: row.metadata?.brand_name,
      amount: row.metadata?.amount,
      campaign_name: row.metadata?.campaign_name,
      // System specific
      message: row.description,
      // API specific
      endpoint: row.metadata?.endpoint,
      method: row.metadata?.method,
      status_code: row.metadata?.status_code,
    }));

    return { data: logs, count: count || 0 };
  } catch (err) {
    console.error('Activity log fetch error:', err);
    return { data: [], count: 0 };
  }
}

/**
 * Main hook for fetching activity logs
 */
export function useActivityLogs({
  category,
  filters,
  page = 1,
  pageSize = 25,
  sortBy = 'timestamp',
  sortOrder = 'desc',
  enabled = true,
}: UseActivityLogsOptions = {}): {
  data: ActivityQueryResult | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: ['activity-logs', category, filters, page, pageSize, sortBy, sortOrder, currentClient?.id],
    queryFn: async (): Promise<ActivityQueryResult> => {
      const result = await fetchActivityLogs(currentClient?.id, category, filters, page, pageSize);
      
      return {
        data: result.data,
        pagination: {
          page,
          page_size: pageSize,
          total_count: result.count,
          total_pages: Math.ceil(result.count / pageSize),
        },
        filters_applied: filters || {},
      };
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Activity stats with real comparison percentages
 */
export interface ActivityStatsResult {
  today: number;
  yesterday: number;
  this_week: number;
  this_month: number;
  percent_change: number;
  percent_change_direction: 'up' | 'down' | 'neutral';
  by_category: {
    gift_card: number;
    campaign: number;
    communication: number;
    api: number;
    user: number;
    system: number;
  };
  by_status: {
    success: number;
    failed: number;
    pending: number;
  };
}

/**
 * Hook for fetching overview stats with real comparison data
 */
export function useActivityStats() {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: ['activity-stats', currentClient?.id],
    queryFn: async (): Promise<ActivityStatsResult> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Build base query with client filter
      const clientFilter = currentClient?.id ? `client_id.eq.${currentClient.id}` : null;

      // Fetch all counts in parallel
      const [todayResult, yesterdayResult, weekResult, monthResult] = await Promise.all([
        // Today's count
        supabase
          .from('activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart)
          .then(r => r),
        // Yesterday's count  
        supabase
          .from('activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', yesterdayStart.toISOString())
          .lt('created_at', yesterdayEnd)
          .then(r => r),
        // This week's count
        supabase
          .from('activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', weekStart)
          .then(r => r),
        // This month's count
        supabase
          .from('activity_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart)
          .then(r => r),
      ]);

      // Fetch category breakdown
      const categoryResults = await Promise.all([
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('category', 'gift_card').gte('created_at', todayStart),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('category', 'campaign').gte('created_at', todayStart),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('category', 'communication').gte('created_at', todayStart),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('category', 'api').gte('created_at', todayStart),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('category', 'user').gte('created_at', todayStart),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('category', 'system').gte('created_at', todayStart),
      ]);

      // Fetch status breakdown
      const statusResults = await Promise.all([
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', monthStart),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', monthStart),
        supabase.from('activity_log').select('id', { count: 'exact', head: true }).eq('status', 'pending').gte('created_at', monthStart),
      ]);

      const today = todayResult.count || 0;
      const yesterday = yesterdayResult.count || 0;

      // Calculate percentage change
      let percentChange = 0;
      let percentChangeDirection: 'up' | 'down' | 'neutral' = 'neutral';
      
      if (yesterday > 0) {
        percentChange = Math.round(((today - yesterday) / yesterday) * 100);
        percentChangeDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
      } else if (today > 0) {
        percentChange = 100;
        percentChangeDirection = 'up';
      }

      return {
        today,
        yesterday,
        this_week: weekResult.count || 0,
        this_month: monthResult.count || 0,
        percent_change: Math.abs(percentChange),
        percent_change_direction: percentChangeDirection,
        by_category: {
          gift_card: categoryResults[0].count || 0,
          campaign: categoryResults[1].count || 0,
          communication: categoryResults[2].count || 0,
          api: categoryResults[3].count || 0,
          user: categoryResults[4].count || 0,
          system: categoryResults[5].count || 0,
        },
        by_status: {
          success: statusResults[0].count || 0,
          failed: statusResults[1].count || 0,
          pending: statusResults[2].count || 0,
        },
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export default useActivityLogs;
