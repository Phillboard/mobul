import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

export interface PoolInventory {
  id: string;
  brand_id: string;
  denomination: number;
  total_cards: number;
  available_cards: number;
  reserved_cards: number;
  low_stock_threshold: number | null;
  brand_name?: string;
}

/**
 * Hook to get gift card inventory stats for marketplace model
 * Adapts the pool-based interface to work with gift_card_inventory table
 */
export function usePoolInventory(poolIdOrConfig: string | null) {
  return useQuery({
    queryKey: ['pool-inventory', poolIdOrConfig],
    queryFn: async () => {
      if (!poolIdOrConfig) return null;

      // Parse brand-denomination format (e.g., "uuid-25.00")
      const [brandId, denomination] = poolIdOrConfig.split('-');
      
      if (!brandId || !denomination) return null;

      // Get brand info
      const { data: brandData, error: brandError } = await supabase
        .from('gift_card_brands')
        .select('id, name')
        .eq('id', brandId)
        .single();

      if (brandError) throw brandError;

      // Count available cards in inventory
      const { count: availableCount, error: availableError } = await supabase
        .from('gift_card_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('denomination', parseFloat(denomination))
        .eq('status', 'available');

      if (availableError) throw availableError;

      // Count total cards (all statuses)
      const { count: totalCount, error: totalError } = await supabase
        .from('gift_card_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('denomination', parseFloat(denomination));

      if (totalError) throw totalError;

      // Count assigned cards (reserved)
      const { count: reservedCount, error: reservedError } = await supabase
        .from('gift_card_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('denomination', parseFloat(denomination))
        .eq('status', 'assigned');

      if (reservedError) throw reservedError;

      return {
        id: poolIdOrConfig,
        brand_id: brandId,
        denomination: parseFloat(denomination),
        total_cards: totalCount || 0,
        available_cards: availableCount || 0,
        reserved_cards: reservedCount || 0,
        low_stock_threshold: 20, // Default threshold
        brand_name: brandData.name,
      } as PoolInventory;
    },
    enabled: !!poolIdOrConfig,
  });
}

