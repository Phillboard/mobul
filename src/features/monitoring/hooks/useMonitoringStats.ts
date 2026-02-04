/**
 * Monitoring Stats Hook
 * 
 * Fetches aggregated activity statistics for dashboards.
 * Uses pre-aggregated tables for performance.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import type { 
  ActivityStatsResponse, 
  ActivityCategory,
  DataScope,
  HourlyStats,
  DailyStats,
} from '../types/monitoring.types';

// ============================================================================
// Types
// ============================================================================

interface UseMonitoringStatsOptions {
  /** Time period: hourly, daily, monthly */
  period?: 'hourly' | 'daily' | 'monthly';
  /** Number of days to fetch */
  days?: number;
  /** Filter by category */
  category?: ActivityCategory;
  /** Specific client to fetch (for agency owners viewing a client) */
  clientId?: string;
  /** Enable/disable query */
  enabled?: boolean;
}

interface MonitoringOverviewStats {
  today: {
    total: number;
    success: number;
    failed: number;
    errors: number;
  };
  yesterday: {
    total: number;
  };
  thisWeek: {
    total: number;
  };
  thisMonth: {
    total: number;
  };
  byCategory: Record<ActivityCategory, number>;
  trend: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
  }>;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useMonitoringStats(options: UseMonitoringStatsOptions = {}) {
  const { 
    period = 'daily', 
    days = 30, 
    category,
    clientId,
    enabled = true 
  } = options;
  
  const { roles } = useAuth();
  const { currentOrg } = useTenant();
  
  // Determine data scope
  const isAdmin = roles.some(r => r.role === 'admin');
  const isAgencyOwner = roles.some(r => r.role === 'agency_owner');
  
  const organizationId = isAdmin ? null : currentOrg?.id;
  const effectiveClientId = clientId || (isAgencyOwner ? null : currentOrg?.id);

  return useQuery({
    queryKey: ['monitoring-stats', period, days, category, organizationId, effectiveClientId],
    queryFn: async (): Promise<ActivityStatsResponse[]> => {
      if (!organizationId && !isAdmin) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_org_activity_stats', {
        p_org_id: organizationId || '00000000-0000-0000-0000-000000000000',
        p_client_id: effectiveClientId || null,
        p_period: period,
        p_days: days,
      });

      if (error) {
        console.error('Error fetching monitoring stats:', error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && (!!organizationId || isAdmin),
    staleTime: 60_000, // 1 minute
    refetchInterval: 5 * 60_000, // 5 minutes
  });
}

// ============================================================================
// Overview Stats Hook
// ============================================================================

export function useMonitoringOverview(options: { clientId?: string; enabled?: boolean } = {}) {
  const { clientId, enabled = true } = options;
  const { roles } = useAuth();
  const { currentOrg } = useTenant();
  
  const isAdmin = roles.some(r => r.role === 'admin');
  const isAgencyOwner = roles.some(r => r.role === 'agency_owner');
  
  const organizationId = currentOrg?.id;
  const effectiveClientId = clientId || (isAgencyOwner ? null : currentOrg?.id);

  return useQuery({
    queryKey: ['monitoring-overview', organizationId, effectiveClientId],
    queryFn: async (): Promise<MonitoringOverviewStats> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Build base query
      let query = supabase
        .from('activity_log')
        .select('category, status, severity, created_at');

      // Apply scope filters
      if (!isAdmin) {
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }
        if (effectiveClientId) {
          query = query.eq('client_id', effectiveClientId);
        }
      }

      // Fetch last 30 days
      query = query.gte('created_at', monthStart.toISOString());

      const { data: logs, error } = await query;

      if (error) {
        console.error('Error fetching overview stats:', error);
        throw error;
      }

      // Calculate stats
      const today = { total: 0, success: 0, failed: 0, errors: 0 };
      const yesterday = { total: 0 };
      const thisWeek = { total: 0 };
      const thisMonth = { total: 0 };
      const byCategory: Record<string, number> = {};
      const trendMap = new Map<string, { total: number; success: number; failed: number }>();

      logs?.forEach(log => {
        const logDate = new Date(log.created_at);
        const dateKey = logDate.toISOString().split('T')[0];
        
        // Update trend
        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, { total: 0, success: 0, failed: 0 });
        }
        const trendEntry = trendMap.get(dateKey)!;
        trendEntry.total++;
        if (log.status === 'success') trendEntry.success++;
        if (log.status === 'failed') trendEntry.failed++;
        
        // Update category counts
        byCategory[log.category] = (byCategory[log.category] || 0) + 1;
        
        // Update time-based counts
        thisMonth.total++;
        
        if (logDate >= weekStart) {
          thisWeek.total++;
        }
        
        if (logDate >= yesterdayStart && logDate < todayStart) {
          yesterday.total++;
        }
        
        if (logDate >= todayStart) {
          today.total++;
          if (log.status === 'success') today.success++;
          if (log.status === 'failed') today.failed++;
          if (log.severity === 'error' || log.severity === 'critical') today.errors++;
        }
      });

      // Convert trend map to sorted array
      const trend = Array.from(trendMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        today,
        yesterday,
        thisWeek,
        thisMonth,
        byCategory: byCategory as Record<ActivityCategory, number>,
        trend,
      };
    },
    enabled: enabled && (!!organizationId || isAdmin),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  });
}

// ============================================================================
// Hourly Stats Hook (for detailed charts)
// ============================================================================

export function useHourlyStats(options: {
  hours?: number;
  category?: ActivityCategory;
  clientId?: string;
  enabled?: boolean;
} = {}) {
  const { hours = 24, category, clientId, enabled = true } = options;
  const { currentOrg } = useTenant();
  const { roles } = useAuth();
  
  const isAdmin = roles.some(r => r.role === 'admin');
  const organizationId = currentOrg?.id;

  return useQuery({
    queryKey: ['hourly-stats', hours, category, organizationId, clientId],
    queryFn: async (): Promise<HourlyStats[]> => {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      let query = supabase
        .from('monitoring_stats_hourly')
        .select('*')
        .gte('hour_start', cutoff.toISOString())
        .order('hour_start', { ascending: true });

      if (!isAdmin && organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching hourly stats:', error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && (!!organizationId || isAdmin),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

// ============================================================================
// Error Stats Hook
// ============================================================================

export function useErrorStats(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { roles } = useAuth();
  
  const isAdmin = roles.some(r => r.role === 'admin' || r.role === 'tech_support');

  return useQuery({
    queryKey: ['error-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('category, severity, resolved, created_at')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const unresolved = data?.length || 0;
      const critical = data?.filter(e => e.severity === 'critical').length || 0;
      const byCategory = data?.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        unresolved,
        critical,
        byCategory,
        recent: data || [],
      };
    },
    enabled: enabled && isAdmin,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
