import { useQuery } from '@tanstack/react-query';

export function useRewardSummary(clientId?: string) {
  return useQuery({
    queryKey: ['reward-summary', clientId],
    queryFn: async () => {
      if (!clientId) return { totalDelivered: 0 };

      // TODO: Fix type instantiation issue with gift_cards table
      // For now returning 0, needs SQL function or type fix
      return {
        totalDelivered: 0,
      };
    },
    enabled: !!clientId,
  });
}
