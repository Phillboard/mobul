import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

/**
 * @deprecated Call tracking is not actively used. Consider removing in future cleanup.
 */
export function useCallAnalytics(campaignId: string | null) {
  return useQuery({
    queryKey: ['call-analytics', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      // Get call sessions with recipient info
      const { data: sessions, error: sessionsError } = await supabase
        .from('call_sessions')
        .select('*, recipient:recipients(*), tracked_number:tracked_phone_numbers(*)')
        .eq('campaign_id', campaignId);

      if (sessionsError) throw sessionsError;

      // Calculate metrics
      const totalCalls = sessions?.length || 0;
      const answeredCalls = sessions?.filter(s => s.call_answered_at).length || 0;
      const matchedCalls = sessions?.filter(s => s.match_status === 'matched').length || 0;
      
      const avgDuration = sessions?.filter(s => s.call_duration_seconds)
        .reduce((sum, s) => sum + (s.call_duration_seconds || 0), 0) / (sessions?.filter(s => s.call_duration_seconds).length || 1);

      // Group by status
      const statusBreakdown = sessions?.reduce((acc, session) => {
        acc[session.call_status] = (acc[session.call_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Group by date for timeline
      const callsByDate = sessions?.reduce((acc, session) => {
        const date = new Date(session.call_started_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalCalls,
        answeredCalls,
        matchedCalls,
        avgDuration: Math.round(avgDuration || 0),
        answerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
        matchRate: totalCalls > 0 ? (matchedCalls / totalCalls) * 100 : 0,
        statusBreakdown,
        timeline: Object.entries(callsByDate).map(([date, count]) => ({ date, calls: count })),
        recentSessions: sessions?.slice(0, 10) || [],
      };
    },
    enabled: !!campaignId,
  });
}

export function useRewardStats(campaignId: string | null) {
  return useQuery({
    queryKey: ['reward-stats', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      // Get gift card billing data (replaces deliveries)
      const { data: billing, error: billingError } = await supabase
        .from('gift_card_billing_ledger')
        .select('*, gift_card_brands(brand_name), gift_card_inventory(status, card_code)')
        .eq('campaign_id', campaignId);

      if (billingError) {
        console.error('Billing ledger query error:', billingError);
        return null;
      }

      // Calculate total value directly from billing ledger
      const totalValue = billing?.reduce((sum, entry) => sum + (Number(entry.denomination) || 0), 0) || 0;
      const totalDelivered = billing?.length || 0;
      
      // Count by status
      const deliveredCount = billing?.filter(b => 
        b.gift_card_inventory?.status === 'delivered' || b.gift_card_inventory?.status === 'sent'
      ).length || 0;
      const pendingCount = billing?.filter(b => 
        b.gift_card_inventory?.status === 'assigned' || b.gift_card_inventory?.status === 'pending'
      ).length || 0;
      const failedCount = billing?.filter(b => 
        b.gift_card_inventory?.status === 'failed'
      ).length || 0;

      // Group by date for timeline
      const billingByDate = billing?.reduce((acc, entry) => {
        const date = new Date(entry.billed_at).toLocaleDateString();
        if (!acc[date]) acc[date] = { count: 0, value: 0 };
        acc[date].count++;
        acc[date].value += Number(entry.denomination) || 0;
        return acc;
      }, {} as Record<string, { count: number; value: number }>) || {};

      // Create a default condition entry for display
      const byCondition: Record<number, { count: number; totalValue: number; delivered: number; failed: number; pending: number }> = {};
      if (totalDelivered > 0) {
        byCondition[1] = {
          count: totalDelivered,
          totalValue,
          delivered: deliveredCount,
          failed: failedCount,
          pending: pendingCount,
        };
      }

      return {
        byCondition,
        totalValue,
        totalDelivered,
        totalFailed: failedCount,
        timeline: Object.entries(billingByDate).map(([date, data]) => ({
          date,
          count: data.count,
          value: data.value,
        })),
        recentDeliveries: billing?.slice(0, 10) || [],
      };
    },
    enabled: !!campaignId,
  });
}

/**
 * @deprecated Call tracking is not actively used. Consider removing in future cleanup.
 */
export function useCallStats(clientId: string | null, dateRange: number) {
  return useQuery({
    queryKey: ['call-stats', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      // Get campaigns for this client
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', clientId);

      if (!campaigns) return null;

      const campaignIds = campaigns.map(c => c.id);

      // Get call sessions
      const { data: sessions } = await supabase
        .from('call_sessions')
        .select('*')
        .in('campaign_id', campaignIds)
        .gte('call_started_at', startDate.toISOString());

      const totalCalls = sessions?.length || 0;
      const todayCalls = sessions?.filter(s => 
        new Date(s.call_started_at).toDateString() === new Date().toDateString()
      ).length || 0;

      const avgDuration = sessions?.filter(s => s.call_duration_seconds)
        .reduce((sum, s) => sum + (s.call_duration_seconds || 0), 0) / (sessions?.filter(s => s.call_duration_seconds).length || 1);

      return {
        totalCalls,
        todayCalls,
        avgDuration: Math.round(avgDuration || 0),
      };
    },
    enabled: !!clientId,
  });
}

export function useRewardSummary(clientId: string | null, dateRange: number) {
  return useQuery({
    queryKey: ['reward-summary', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get billing ledger entries for this client
      const { data: billing, error } = await supabase
        .from('gift_card_billing_ledger')
        .select('id, denomination, billed_at')
        .eq('billed_entity_type', 'client')
        .eq('billed_entity_id', clientId)
        .gte('billed_at', startDate.toISOString());

      if (error) {
        console.error('Reward summary query error:', error);
        return { totalDelivered: 0, todayCount: 0, todayTrend: 0, totalValue: 0, pendingCount: 0 };
      }

      const totalDelivered = billing?.length || 0;
      
      // Calculate total value
      const totalValue = billing?.reduce((sum, b) => sum + (Number(b.denomination) || 0), 0) || 0;
      
      // Count today's rewards
      const todayCount = billing?.filter(b => 
        new Date(b.billed_at) >= today
      ).length || 0;
      
      // Count yesterday's rewards for trend
      const yesterdayCount = billing?.filter(b => {
        const d = new Date(b.billed_at);
        return d >= yesterday && d < today;
      }).length || 0;
      
      // Calculate trend
      const todayTrend = yesterdayCount > 0 
        ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 
        : 0;

      // Get pending count (gift cards assigned but not yet delivered)
      const { count: pendingCount } = await supabase
        .from('gift_card_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'assigned');

      return {
        totalDelivered,
        todayCount,
        todayTrend,
        totalValue,
        pendingCount: pendingCount || 0,
      };
    },
    enabled: !!clientId,
  });
}

/**
 * @deprecated Call tracking is not actively used. Consider removing in future cleanup.
 */
export function useConditionCompletionRate(clientId: string | null, dateRange: number) {
  return useQuery({
    queryKey: ['condition-completion-rate', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      // Get campaigns for this client
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', clientId);

      if (!campaigns) return null;

      const campaignIds = campaigns.map(c => c.id);

      // Get call sessions
      const { data: sessions } = await supabase
        .from('call_sessions')
        .select('id')
        .in('campaign_id', campaignIds)
        .gte('call_started_at', startDate.toISOString());

      // Get conditions met
      const { data: conditionsMet } = await supabase
        .from('call_conditions_met')
        .select('call_session_id')
        .in('campaign_id', campaignIds)
        .gte('met_at', startDate.toISOString());

      const totalCalls = sessions?.length || 0;
      const callsWithConditions = new Set(conditionsMet?.map(c => c.call_session_id)).size;
      
      const completionRate = totalCalls > 0 ? (callsWithConditions / totalCalls) * 100 : 0;

      return {
        completionRate,
        totalCalls,
        callsWithConditions,
      };
    },
    enabled: !!clientId,
  });
}
