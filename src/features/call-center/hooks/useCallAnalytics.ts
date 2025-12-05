import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

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

      // Get conditions met
      const { data: conditionsMet, error: conditionsError } = await supabase
        .from('call_conditions_met')
        .select('*')
        .eq('campaign_id', campaignId);

      if (conditionsError) {
        console.error('Conditions query error:', conditionsError);
        return null;
      }

      // Group by condition number (if condition data exists)
      const byCondition = conditionsMet?.reduce((acc, cond) => {
        const condNum = cond.condition_number;
        if (!acc[condNum]) {
          acc[condNum] = {
            count: 0,
            totalValue: 0,
            delivered: 0,
            failed: 0,
            pending: 0,
          };
        }
        acc[condNum].count++;
        
        // Find matching billing entry
        const billingEntry = billing?.find(b => b.recipient_id === cond.recipient_id);
        if (billingEntry) {
          acc[condNum].totalValue += Number(billingEntry.denomination);
          
          // Check delivery status from inventory
          if (billingEntry.gift_card_inventory?.status === 'delivered') acc[condNum].delivered++;
          else if (billingEntry.gift_card_inventory?.status === 'assigned') acc[condNum].pending++;
        }
        
        return acc;
      }, {} as Record<number, { count: number; totalValue: number; delivered: number; failed: number; pending: number }>) || {};

      // Group by date for timeline using billing data
      const billingByDate = billing?.reduce((acc, entry) => {
        const date = new Date(entry.billed_at).toLocaleDateString();
        if (!acc[date]) acc[date] = { count: 0, value: 0 };
        acc[date].count++;
        acc[date].value += Number(entry.denomination) || 0;
        return acc;
      }, {} as Record<string, { count: number; value: number }>) || {};

      const totalValue = Object.values(byCondition).reduce((sum, cond) => sum + cond.totalValue, 0);
      const totalDelivered = billing?.length || 0;
      const totalFailed = 0; // Failures would be tracked differently in new system

      return {
        byCondition,
        totalValue,
        totalDelivered,
        totalFailed,
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

      // Get billing ledger entries for this client
      const { data: billing, error } = await supabase
        .from('gift_card_billing_ledger')
        .select('id, denomination, billed_at')
        .eq('billed_entity_type', 'client')
        .eq('billed_entity_id', clientId)
        .gte('billed_at', startDate.toISOString());

      if (error) {
        console.error('Reward summary query error:', error);
        return { totalDelivered: 0 };
      }

      const totalDelivered = billing?.length || 0;

      return {
        totalDelivered,
      };
    },
    enabled: !!clientId,
  });
}

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
