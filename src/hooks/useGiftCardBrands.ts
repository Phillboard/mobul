import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all gift card brands
 * @param onlyEnabled - If true, only returns admin-enabled brands
 */
export function useGiftCardBrands(onlyEnabled: boolean = false) {
  return useQuery({
    queryKey: ["gift-card-brands", onlyEnabled],
    queryFn: async () => {
      let query = supabase
        .from("gift_card_brands")
        .select("*")
        .order("brand_name");
      
      // Filter by enabled status if requested
      // Try both is_enabled_by_admin (new) and is_active (legacy fallback)
      if (onlyEnabled) {
        query = query.or("is_enabled_by_admin.eq.true,is_active.eq.true");
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Fetch brands with their available denominations
 * Used for admin gift card marketplace and configuration
 */
export function useGiftCardBrandsWithDenominations(onlyEnabled: boolean = true) {
  return useQuery({
    queryKey: ["gift-card-brands-with-denominations", onlyEnabled],
    queryFn: async () => {
      // First get enabled brands
      let brandsQuery = supabase
        .from("gift_card_brands")
        .select("*")
        .order("brand_name");
      
      if (onlyEnabled) {
        brandsQuery = brandsQuery.or("is_enabled_by_admin.eq.true,is_active.eq.true");
      }
      
      const { data: brands, error: brandsError } = await brandsQuery;
      if (brandsError) throw brandsError;

      // Get denominations for these brands
      const brandIds = brands?.map(b => b.id) || [];
      
      if (brandIds.length === 0) return [];

      const { data: denominations, error: denomError } = await supabase
        .from("gift_card_denominations")
        .select("*")
        .in("brand_id", brandIds);
      
      if (denomError) {
        // Denominations table might not exist yet, return brands without denominations
        console.warn("Could not fetch denominations:", denomError);
        return brands?.map(brand => ({ ...brand, denominations: [] }));
      }

      // Combine brands with their denominations
      return brands?.map(brand => ({
        ...brand,
        denominations: denominations?.filter(d => d.brand_id === brand.id) || [],
      })) || [];
    },
  });
}
