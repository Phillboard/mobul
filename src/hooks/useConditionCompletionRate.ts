import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useConditionCompletionRate(clientId?: string) {
  return useQuery({
    queryKey: ['condition-completion-rate', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      // Get all campaign conditions
      const { data: conditions, error: conditionsError } = await supabase
        .from('campaign_conditions')
        .select('id, campaign_id')
        .eq('is_active', true);

      if (conditionsError) throw conditionsError;

      // Get conditions that were met
      const { data: metConditions, error: metError } = await supabase
        .from('call_conditions_met')
        .select('id');

      if (metError) throw metError;

      const totalConditions = conditions?.length || 0;
      const completedConditions = metConditions?.length || 0;
      const completionRate = totalConditions > 0 ? Math.round((completedConditions / totalConditions) * 100) : 0;

      return {
        completionRate,
        totalConditions,
        completedConditions,
      };
    },
    enabled: !!clientId,
  });
}
