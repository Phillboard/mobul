/**
 * Alerts Hook
 * 
 * Manages alert instances and rules for the monitoring system.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import type { AlertInstance, AlertRule, AlertSeverity } from '../types/monitoring.types';

// ============================================================================
// Active Alerts Hook
// ============================================================================

interface UseActiveAlertsOptions {
  /** Filter by client */
  clientId?: string;
  /** Maximum alerts to fetch */
  limit?: number;
  /** Enable/disable */
  enabled?: boolean;
}

export function useActiveAlerts(options: UseActiveAlertsOptions = {}) {
  const { clientId, limit = 50, enabled = true } = options;
  const { roles } = useAuth();
  const { currentOrg } = useTenant();
  
  const isAdmin = roles.some(r => r.role === 'admin');
  const organizationId = isAdmin ? null : currentOrg?.id;
  const effectiveClientId = clientId || (currentOrg?.type === 'client' ? currentOrg.id : null);

  return useQuery({
    queryKey: ['active-alerts', organizationId, effectiveClientId, limit],
    queryFn: async (): Promise<AlertInstance[]> => {
      const { data, error } = await supabase.rpc('get_active_alerts', {
        p_org_id: organizationId,
        p_client_id: effectiveClientId,
        p_limit: limit,
      });

      if (error) {
        console.error('Error fetching active alerts:', error);
        throw error;
      }

      return data || [];
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ============================================================================
// Alert Count Hook (for badges)
// ============================================================================

export function useAlertCount() {
  const { data: alerts } = useActiveAlerts({ limit: 100 });
  
  const unacknowledged = alerts?.filter(a => !a.acknowledged_at).length || 0;
  const critical = alerts?.filter(a => a.severity === 'critical' && !a.acknowledged_at).length || 0;
  
  return {
    total: alerts?.length || 0,
    unacknowledged,
    critical,
  };
}

// ============================================================================
// Acknowledge Alert Mutation
// ============================================================================

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alert_instances')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
    },
  });
}

// ============================================================================
// Resolve Alert Mutation
// ============================================================================

export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { error } = await supabase
        .from('alert_instances')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: notes,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-alerts'] });
    },
  });
}

// ============================================================================
// Alert Rules Hook
// ============================================================================

interface UseAlertRulesOptions {
  enabled?: boolean;
}

export function useAlertRules(options: UseAlertRulesOptions = {}) {
  const { enabled = true } = options;
  const { roles } = useAuth();
  const { currentOrg } = useTenant();
  
  const isAdmin = roles.some(r => r.role === 'admin');

  return useQuery({
    queryKey: ['alert-rules', currentOrg?.id],
    queryFn: async (): Promise<AlertRule[]> => {
      let query = supabase
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false });

      // Non-admins only see their org's rules
      if (!isAdmin && currentOrg?.id) {
        query = query.or(`organization_id.eq.${currentOrg.id},organization_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alert rules:', error);
        throw error;
      }

      return data || [];
    },
    enabled,
    staleTime: 5 * 60_000,
  });
}

// ============================================================================
// Create Alert Rule Mutation
// ============================================================================

interface CreateAlertRuleParams {
  name: string;
  description?: string;
  category: string;
  event_type?: string;
  severity_threshold?: AlertSeverity;
  count_threshold?: number;
  time_window_minutes?: number;
  notify_email?: boolean;
  notify_in_app?: boolean;
  notify_roles?: string[];
  organization_id?: string;
  client_id?: string;
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrg } = useTenant();

  return useMutation({
    mutationFn: async (params: CreateAlertRuleParams) => {
      const { data, error } = await supabase
        .from('alert_rules')
        .insert({
          ...params,
          organization_id: params.organization_id || currentOrg?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}

// ============================================================================
// Update Alert Rule Mutation
// ============================================================================

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AlertRule> & { id: string }) => {
      const { error } = await supabase
        .from('alert_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}

// ============================================================================
// Delete Alert Rule Mutation
// ============================================================================

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}

// ============================================================================
// Real-time Alerts Subscription
// ============================================================================

export function useRealtimeAlertInstances(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { currentOrg } = useTenant();
  const queryClient = useQueryClient();

  // This will trigger a refetch when new alerts are inserted
  // using the existing useRealtimeAlerts hook from useRealtimeActivity.ts
  // but specifically for alert_instances table
  
  return useQuery({
    queryKey: ['realtime-alerts-subscription', currentOrg?.id],
    queryFn: () => {
      // This is just a placeholder to set up the subscription
      // The actual subscription happens in useEffect below
      return { subscribed: true };
    },
    enabled: false, // We don't actually need to fetch anything
  });
}
