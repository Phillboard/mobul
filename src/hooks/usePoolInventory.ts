import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PoolInventory {
  id: string;
  pool_name: string;
  available_cards: number;
  total_cards: number;
  low_stock_threshold: number;
  provider: string;
}

export function usePoolInventory(poolId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['pool-inventory', poolId],
    queryFn: async () => {
      if (!poolId) return null;
      
      const { data, error } = await supabase
        .from('gift_card_pools')
        .select('id, pool_name, available_cards, total_cards, low_stock_threshold, provider')
        .eq('id', poolId)
        .single();
      
      if (error) throw error;
      return data as PoolInventory;
    },
    enabled: enabled && !!poolId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useCampaignPools(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-pools', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_reward_configs')
        .select(`
          gift_card_pool_id,
          gift_card_pools(
            id,
            pool_name,
            available_cards,
            total_cards,
            low_stock_threshold,
            provider
          )
        `)
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
      
      return data
        .map(item => item.gift_card_pools)
        .filter(Boolean) as PoolInventory[];
    },
    enabled: !!campaignId,
    refetchInterval: 30000,
  });
}
