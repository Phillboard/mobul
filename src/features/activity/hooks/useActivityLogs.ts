/**
 * useActivityLogs Hook
 * 
 * Main data fetching hook for activity logs with support for:
 * - Filtering by category, status, date range
 * - Full-text search
 * - Pagination
 * - Sorting
 * 
 * Fetches real data from Supabase tables:
 * - Gift Card: gift_card_billing_ledger
 * - User: login_history
 * - System: error_logs
 * - Campaign, Communication, API: Returns empty (tables not yet created)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { 
  ActivityLog, 
  ActivityFilters, 
  ActivityCategory,
  ActivityQueryResult,
  GiftCardActivityLog,
  UserActivityLog,
  SystemActivityLog,
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
 * Fetch gift card activity from billing ledger
 */
async function fetchGiftCardActivity(
  clientId: string | undefined,
  filters: ActivityFilters | undefined,
  page: number,
  pageSize: number
): Promise<{ data: GiftCardActivityLog[]; count: number }> {
  try {
    let query = supabase
      .from('gift_card_billing_ledger')
      .select(`
        *,
        gift_card_brands(brand_name, logo_url),
        campaigns(name),
        recipients(first_name, last_name, phone)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (filters?.date_range?.start) {
      query = query.gte('created_at', filters.date_range.start);
    }
    if (filters?.date_range?.end) {
      query = query.lte('created_at', filters.date_range.end);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching gift card activity:', error);
      return { data: [], count: 0 };
    }

    // Transform to ActivityLog format
    const logs: GiftCardActivityLog[] = (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      category: 'gift_card' as const,
      event_type: row.sms_status === 'delivered' ? 'sms_delivered' : 
                  row.sms_status === 'sent' ? 'sms_sent' :
                  row.sms_status === 'failed' ? 'sms_failed' :
                  row.redeemed_at ? 'card_redeemed' : 'card_assigned',
      status: row.sms_status === 'delivered' || row.sms_status === 'sent' ? 'success' : 
              row.sms_status === 'failed' ? 'failed' : 'pending',
      user_id: row.user_id,
      recipient_name: row.recipients ? `${row.recipients.first_name || ''} ${row.recipients.last_name || ''}`.trim() : undefined,
      recipient_phone: row.recipients?.phone,
      campaign_name: row.campaigns?.name,
      brand_name: row.gift_card_brands?.brand_name,
      amount: row.card_value,
    }));

    return { data: logs, count: count || 0 };
  } catch (err) {
    console.error('Gift card activity fetch error:', err);
    return { data: [], count: 0 };
  }
}

/**
 * Fetch user activity from login_history
 */
async function fetchUserActivity(
  filters: ActivityFilters | undefined,
  page: number,
  pageSize: number
): Promise<{ data: UserActivityLog[]; count: number }> {
  try {
    let query = supabase
      .from('login_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filters?.date_range?.start) {
      query = query.gte('created_at', filters.date_range.start);
    }
    if (filters?.date_range?.end) {
      query = query.lte('created_at', filters.date_range.end);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching user activity:', error);
      return { data: [], count: 0 };
    }

    const logs: UserActivityLog[] = (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      category: 'user' as const,
      event_type: row.success ? 'login_success' : 'login_failed',
      status: row.success ? 'success' : 'failed',
      user_id: row.user_id,
      user_email: row.email,
      ip_address: row.ip_address,
      location: row.location,
    }));

    return { data: logs, count: count || 0 };
  } catch (err) {
    console.error('User activity fetch error:', err);
    return { data: [], count: 0 };
  }
}

/**
 * Fetch system activity from error_logs
 */
async function fetchSystemActivity(
  filters: ActivityFilters | undefined,
  page: number,
  pageSize: number
): Promise<{ data: SystemActivityLog[]; count: number }> {
  try {
    let query = supabase
      .from('error_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filters?.severity?.length) {
      query = query.in('severity', filters.severity);
    }

    if (filters?.date_range?.start) {
      query = query.gte('timestamp', filters.date_range.start);
    }
    if (filters?.date_range?.end) {
      query = query.lte('timestamp', filters.date_range.end);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching system activity:', error);
      return { data: [], count: 0 };
    }

    const logs: SystemActivityLog[] = (data || []).map((row: any) => {
      // Get error message - try multiple possible column names
      const errorMessage = row.error_message || row.message || 'No message available';
      const errorSource = row.source || row.error_type || row.category || 'Unknown';
      
      return {
        id: row.id,
        timestamp: row.timestamp || row.occurred_at || row.created_at,
        category: 'system' as const,
        event_type: row.error_type || 'error',
        status: row.resolved ? 'success' : 'failed',
        severity: row.severity || 'error',
        message: errorMessage,
        stack_trace: row.error_stack || row.stack_trace,
        source: errorSource,
        // Store the full error message for display
        user_email: errorSource, // Show source in User column
        metadata: row.metadata || row.context,
      };
    });

    return { data: logs, count: count || 0 };
  } catch (err) {
    console.error('System activity fetch error:', err);
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
      let allLogs: ActivityLog[] = [];
      let totalCount = 0;

      // Fetch data based on category
      if (category === 'gift_card') {
        const result = await fetchGiftCardActivity(currentClient?.id, filters, page, pageSize);
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
      }

      if (category === 'user') {
        const result = await fetchUserActivity(filters, page, pageSize);
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
      }

      if (category === 'system') {
        const result = await fetchSystemActivity(filters, page, pageSize);
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
      }

      // For categories without real data yet (campaign, communication, api)
      if (category === 'campaign' || category === 'communication' || category === 'api') {
        return {
          data: [],
          pagination: {
            page,
            page_size: pageSize,
            total_count: 0,
            total_pages: 0,
          },
          filters_applied: filters || {},
        };
      }

      // Overview: fetch from all available sources
      const [giftCardResult, userResult, systemResult] = await Promise.all([
        fetchGiftCardActivity(currentClient?.id, filters, 1, 20),
        fetchUserActivity(filters, 1, 20),
        fetchSystemActivity(filters, 1, 10),
      ]);

      allLogs = [
        ...giftCardResult.data,
        ...userResult.data,
        ...systemResult.data,
      ];
      totalCount = giftCardResult.count + userResult.count + systemResult.count;

      // Sort combined logs by timestamp
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply client-side pagination for overview
      const paginatedLogs = allLogs.slice(0, pageSize);

      return {
        data: paginatedLogs,
        pagination: {
          page: 1,
          page_size: pageSize,
          total_count: totalCount,
          total_pages: Math.ceil(totalCount / pageSize),
        },
        filters_applied: filters || {},
      };
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching overview stats
 */
export function useActivityStats() {
  const { currentClient } = useTenant();

  return useQuery({
    queryKey: ['activity-stats', currentClient?.id],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch counts from gift_card_billing_ledger
      const [todayResult, weekResult, monthResult] = await Promise.all([
        supabase
          .from('gift_card_billing_ledger')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', todayStart),
        supabase
          .from('gift_card_billing_ledger')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', weekStart),
        supabase
          .from('gift_card_billing_ledger')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthStart),
      ]);

      // Fetch login history count
      const loginResult = await supabase
        .from('login_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart);

      // Fetch error logs count
      const errorResult = await supabase
        .from('error_logs')
        .select('id', { count: 'exact', head: true })
        .gte('timestamp', monthStart);

      return {
        today: todayResult.count || 0,
        this_week: weekResult.count || 0,
        this_month: monthResult.count || 0,
        by_category: {
          gift_card: monthResult.count || 0,
          campaign: 0, // No campaign activity table yet
          communication: 0, // No communication activity table yet
          api: 0, // No API activity table yet
          user: loginResult.count || 0,
          system: errorResult.count || 0,
        },
        by_status: {
          success: Math.max(0, (monthResult.count || 0) - (errorResult.count || 0)),
          failed: errorResult.count || 0,
          pending: 0,
        },
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export default useActivityLogs;
