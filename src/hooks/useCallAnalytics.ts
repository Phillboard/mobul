import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

      // Get gift card deliveries
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('gift_card_deliveries')
        .select('*, gift_card:gift_cards(*, pool:gift_card_pools(*)), recipient:recipients(*)')
        .eq('campaign_id', campaignId);

      if (deliveriesError) throw deliveriesError;

      // Get conditions met
      const { data: conditionsMet, error: conditionsError } = await supabase
        .from('call_conditions_met')
        .select('*, gift_card:gift_cards(*, pool:gift_card_pools(*))')
        .eq('campaign_id', campaignId);

      if (conditionsError) throw conditionsError;

      // Group by condition number
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
        
        const cardValue = cond.gift_card?.pool?.card_value || 0;
        acc[condNum].totalValue += Number(cardValue);
        
        // Check delivery status
        const delivery = deliveries?.find(d => d.gift_card_id === cond.gift_card_id);
        if (delivery?.delivery_status === 'sent') acc[condNum].delivered++;
        else if (delivery?.delivery_status === 'failed') acc[condNum].failed++;
        else acc[condNum].pending++;
        
        return acc;
      }, {} as Record<number, { count: number; totalValue: number; delivered: number; failed: number; pending: number }>) || {};

      // Group by date for timeline
      const deliveriesByDate = deliveries?.reduce((acc, delivery) => {
        const date = new Date(delivery.delivered_at || delivery.created_at).toLocaleDateString();
        const condNum = delivery.condition_number;
        if (!acc[date]) acc[date] = {};
        acc[date][condNum] = (acc[date][condNum] || 0) + 1;
        return acc;
      }, {} as Record<string, Record<number, number>>) || {};

      const totalValue = Object.values(byCondition).reduce((sum, cond) => sum + cond.totalValue, 0);
      const totalDelivered = deliveries?.filter(d => d.delivery_status === 'sent').length || 0;
      const totalFailed = deliveries?.filter(d => d.delivery_status === 'failed').length || 0;

      return {
        byCondition,
        totalValue,
        totalDelivered,
        totalFailed,
        timeline: Object.entries(deliveriesByDate).map(([date, conditions]) => ({
          date,
          ...conditions,
        })),
        recentDeliveries: deliveries?.slice(0, 10) || [],
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

      // Get campaigns for this client
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', clientId);

      if (!campaigns) return null;

      const campaignIds = campaigns.map(c => c.id);

      // Get deliveries
      const { data: deliveries } = await supabase
        .from('gift_card_deliveries')
        .select('*, gift_card:gift_cards(*, pool:gift_card_pools(*))')
        .in('campaign_id', campaignIds)
        .gte('created_at', startDate.toISOString());

      const totalDelivered = deliveries?.filter(d => d.delivery_status === 'sent').length || 0;

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
