import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandDenomination {
  brand_id: string;
  brand_name: string;
  brand_logo: string | null;
  brand_category: string;
  card_value: number;
  total_available: number;
}

export interface GroupedBrandDenomination {
  brand_id: string;
  brand_name: string;
  brand_logo: string | null;
  brand_category: string;
  denominations: {
    value: number;
    available_count: number;
  }[];
}

/**
 * useSimplifiedGiftCardSelection Hook
 * 
 * Fetches and formats gift card brands and denominations for simplified selection.
 * Hides pool complexity from clients - they only see brand + denomination options.
 * 
 * Used by: SimpleBrandDenominationSelector in campaign wizard
 */
export function useSimplifiedGiftCardSelection(clientId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["simplified-gift-card-selection", clientId],
    queryFn: async () => {
      // Call the database function we created
      const { data, error } = await supabase
        .rpc('get_available_brand_denominations', {
          p_client_id: clientId
        });

      if (error) throw error;
      
      return data as BrandDenomination[];
    },
    enabled: !!clientId,
  });

  // Group by brand for easier UI rendering
  const groupedByBrand: GroupedBrandDenomination[] = data ? 
    Object.values(
      data.reduce((acc, item) => {
        if (!acc[item.brand_id]) {
          acc[item.brand_id] = {
            brand_id: item.brand_id,
            brand_name: item.brand_name,
            brand_logo: item.brand_logo,
            brand_category: item.brand_category,
            denominations: [],
          };
        }
        acc[item.brand_id].denominations.push({
          value: item.card_value,
          available_count: item.total_available,
        });
        return acc;
      }, {} as Record<string, GroupedBrandDenomination>)
    ).sort((a, b) => a.brand_name.localeCompare(b.brand_name))
  : [];

  // Helper to get specific brand info
  const getBrandInfo = (brandId: string) => {
    return groupedByBrand.find(b => b.brand_id === brandId);
  };

  // Helper to check if brand+value combination is available
  const isAvailable = (brandId: string, value: number): boolean => {
    const brand = getBrandInfo(brandId);
    if (!brand) return false;
    const denom = brand.denominations.find(d => d.value === value);
    return denom ? denom.available_count > 0 : false;
  };

  // Get availability count for brand+value
  const getAvailability = (brandId: string, value: number): number => {
    const brand = getBrandInfo(brandId);
    if (!brand) return 0;
    const denom = brand.denominations.find(d => d.value === value);
    return denom?.available_count || 0;
  };

  return {
    // Raw data
    brandDenominations: data || [],
    
    // Grouped data for UI
    groupedByBrand,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    refresh: refetch,
    
    // Helpers
    getBrandInfo,
    isAvailable,
    getAvailability,
  };
}

