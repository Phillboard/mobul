/**
 * Client Gift Cards Hook
 * Provides simplified client-facing interface for managing available gift cards
 * No pools, no Tillo, no technical details - just enable/disable brands
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

export type GiftCardCategory = 
  | "food_beverage" 
  | "retail" 
  | "entertainment" 
  | "travel" 
  | "gas_automotive"
  | "home_garden"
  | "health_beauty"
  | "other";

interface Brand {
  id: string;
  brand_name: string;
  brand_code: string;
  logo_url?: string;
  category?: GiftCardCategory;
}

interface Denomination {
  denomination: number;
  is_enabled: boolean;
  client_gift_card_id?: string;
}

export interface BrandWithDenominations extends Brand {
  denominations: Denomination[];
}

interface CategoryGroup {
  category: GiftCardCategory;
  categoryLabel: string;
  brands: BrandWithDenominations[];
  count: number;
}

const CATEGORY_LABELS: Record<GiftCardCategory, string> = {
  food_beverage: "Food & Beverage",
  retail: "Retail",
  entertainment: "Entertainment",
  travel: "Travel",
  gas_automotive: "Gas & Automotive",
  home_garden: "Home & Garden",
  health_beauty: "Health & Beauty",
  other: "Other",
};

/**
 * Fetch available gift cards for client with category grouping
 */
export function useClientGiftCards(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-gift-cards", clientId],
    queryFn: async () => {
      if (!clientId) return { brands: [], byCategory: [] };

      // Get admin-enabled brands with their denominations
      const { data: brands, error: brandsError } = await supabase
        .from("gift_card_brands")
        .select("id, brand_name, brand_code, logo_url, category")
        .or("is_enabled_by_admin.eq.true,is_active.eq.true")
        .order("brand_name");

      if (brandsError) throw brandsError;

      // Get admin-enabled denominations
      const brandIds = brands?.map(b => b.id) || [];
      const { data: adminDenoms, error: denomsError } = await supabase
        .from("gift_card_denominations")
        .select("brand_id, denomination, is_enabled_by_admin")
        .in("brand_id", brandIds)
        .eq("is_enabled_by_admin", true);

      if (denomsError) {
        console.warn("Could not fetch denominations, using default values:", denomsError);
      }

      // Get client's enabled gift cards
      const { data: clientCards, error: clientError } = await supabase
        .from("client_available_gift_cards")
        .select("id, brand_id, denomination, is_enabled")
        .eq("client_id", clientId);

      if (clientError) throw clientError;

      // Build brand-denomination structure
      const brandsWithDenoms: BrandWithDenominations[] = (brands || []).map(brand => {
        // Get denominations for this brand (from admin config or defaults)
        const brandDenoms = adminDenoms?.filter(d => d.brand_id === brand.id) || [];
        const denominations = brandDenoms.length > 0
          ? brandDenoms.map(d => d.denomination)
          : [5, 10, 25, 50]; // Default if no admin config

        // Check which are enabled by client
        const clientBrandCards = clientCards?.filter(c => c.brand_id === brand.id) || [];

        return {
          ...brand,
          denominations: denominations.map(denom => {
            const clientCard = clientBrandCards.find(c => c.denomination === denom);
            return {
              denomination: denom,
              is_enabled: clientCard?.is_enabled || false,
              client_gift_card_id: clientCard?.id,
            };
          }),
        };
      });

      // Group by category
      const categoryMap = new Map<GiftCardCategory, BrandWithDenominations[]>();
      brandsWithDenoms.forEach(brand => {
        const category = (brand.category as GiftCardCategory) || "other";
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(brand);
      });

      const byCategory: CategoryGroup[] = Array.from(categoryMap.entries()).map(([category, brands]) => ({
        category,
        categoryLabel: CATEGORY_LABELS[category],
        brands,
        count: brands.length,
      })).sort((a, b) => a.categoryLabel.localeCompare(b.categoryLabel));

      return {
        brands: brandsWithDenoms,
        byCategory,
      };
    },
    enabled: !!clientId,
  });
}

/**
 * Toggle a specific denomination for a brand
 */
export function useToggleDenomination(clientId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      brandId,
      denomination,
      currentlyEnabled,
      clientGiftCardId,
    }: {
      brandId: string;
      denomination: number;
      currentlyEnabled: boolean;
      clientGiftCardId?: string;
    }) => {
      if (!clientId) throw new Error("Client ID required");

      if (currentlyEnabled && clientGiftCardId) {
        // Disable: set is_enabled to false
        const { error } = await supabase
          .from("client_available_gift_cards")
          .update({ is_enabled: false })
          .eq("id", clientGiftCardId);

        if (error) throw error;
        return { action: "disabled" };
      } else if (currentlyEnabled && !clientGiftCardId) {
        // Should not happen, but handle gracefully
        throw new Error("Cannot disable - no existing record");
      } else if (!currentlyEnabled && clientGiftCardId) {
        // Re-enable existing record
        const { error } = await supabase
          .from("client_available_gift_cards")
          .update({ is_enabled: true })
          .eq("id", clientGiftCardId);

        if (error) throw error;
        return { action: "enabled" };
      } else {
        // Create new record
        const { error } = await supabase
          .from("client_available_gift_cards")
          .insert({
            client_id: clientId,
            brand_id: brandId,
            denomination,
            is_enabled: true,
          });

        if (error) throw error;
        return { action: "enabled" };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["client-gift-cards", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-available-gift-cards", clientId] });
      
      toast({
        title: result.action === "enabled" ? "Gift card activated" : "Gift card deactivated",
        description: result.action === "enabled" 
          ? "This gift card is now available for use in your campaigns"
          : "This gift card has been deactivated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Get count of enabled gift cards
 */
export function useEnabledGiftCardsCount(clientId: string | undefined) {
  return useQuery({
    queryKey: ["enabled-gift-cards-count", clientId],
    queryFn: async () => {
      if (!clientId) return 0;

      const { count, error } = await supabase
        .from("client_available_gift_cards")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("is_enabled", true);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!clientId,
  });
}

