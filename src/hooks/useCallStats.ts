import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCallStats(clientId?: string) {
  return useQuery({
    queryKey: ['call-stats', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: calls, error } = await supabase
        .from('call_sessions')
        .select('call_duration_seconds, campaign_id')
        .gte('call_started_at', today.toISOString())
        .eq('call_status', 'completed');

      if (error) throw error;

      const activeCallsToday = calls?.length || 0;
      const totalDuration = calls?.reduce((sum, call) => sum + (call.call_duration_seconds || 0), 0) || 0;
      const avgCallDuration = activeCallsToday > 0 ? Math.round(totalDuration / activeCallsToday) : 0;

      return {
        activeCallsToday,
        avgCallDuration,
      };
    },
    enabled: !!clientId,
  });
}
