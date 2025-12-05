/**
 * Gift Card Denominations Hook
 * Manages denominations for brands with pricing configuration
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

export interface GiftCardDenomination {
  id: string;
  brand_id: string;
  denomination: number;
  is_enabled_by_admin: boolean;
  use_custom_pricing: boolean;
  client_price?: number;
  agency_price?: number;
  cost_basis?: number;
  profit_margin_percentage?: number;
  admin_cost_per_card?: number;
  tillo_cost_per_card?: number;
  last_tillo_price_check?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all denominations for a specific brand
 */
export function useBrandDenominations(brandId: string | undefined) {
  return useQuery({
    queryKey: ["gift-card-denominations", brandId],
    queryFn: async () => {
      if (!brandId) return [];

      const { data, error } = await supabase
        .from("gift_card_denominations")
        .select("*")
        .eq("brand_id", brandId)
        .order("denomination");

      if (error) throw error;
      return data as GiftCardDenomination[];
    },
    enabled: !!brandId,
  });
}

/**
 * Fetch all enabled denominations across all brands
 */
export function useEnabledDenominations() {
  return useQuery({
    queryKey: ["gift-card-denominations-enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_denominations")
        .select(`
          *,
          gift_card_brands (
            id,
            brand_name,
            brand_code,
            logo_url
          )
        `)
        .eq("is_enabled_by_admin", true)
        .order("denomination");

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get inventory count for a specific brand-denomination
 */
export function useDenominationInventory(brandId: string | undefined, denomination: number | undefined) {
  return useQuery({
    queryKey: ["denomination-inventory", brandId, denomination],
    queryFn: async () => {
      if (!brandId || !denomination) return { available: 0, assigned: 0, delivered: 0 };

      const { data, error } = await supabase
        .from("gift_card_inventory")
        .select("status")
        .eq("brand_id", brandId)
        .eq("denomination", denomination);

      if (error) throw error;

      const counts = {
        available: data?.filter(c => c.status === 'available').length || 0,
        assigned: data?.filter(c => c.status === 'assigned').length || 0,
        delivered: data?.filter(c => c.status === 'delivered').length || 0,
      };

      return counts;
    },
    enabled: !!brandId && !!denomination,
  });
}

/**
 * Create a new denomination for a brand
 */
export function useCreateDenomination() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      brandId,
      denomination,
      isEnabled = false,
      clientPrice,
      costBasis,
    }: {
      brandId: string;
      denomination: number;
      isEnabled?: boolean;
      clientPrice?: number;
      costBasis?: number;
    }) => {
      const { data, error } = await supabase
        .from("gift_card_denominations")
        .insert({
          brand_id: brandId,
          denomination,
          is_enabled_by_admin: isEnabled,
          use_custom_pricing: !!clientPrice,
          client_price: clientPrice,
          cost_basis: costBasis,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-denominations"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-brands"] });
      toast({
        title: "Denomination added",
        description: `$${data.denomination} denomination has been added`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding denomination",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Update denomination pricing
 */
export function useUpdateDenominationPricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      denominationId,
      useCustomPricing,
      clientPrice,
      agencyPrice,
      costBasis,
    }: {
      denominationId: string;
      useCustomPricing: boolean;
      clientPrice?: number;
      agencyPrice?: number;
      costBasis?: number;
    }) => {
      const { data, error } = await supabase
        .from("gift_card_denominations")
        .update({
          use_custom_pricing: useCustomPricing,
          client_price: clientPrice,
          agency_price: agencyPrice,
          cost_basis: costBasis,
        })
        .eq("id", denominationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-denominations"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-brands"] });
      toast({
        title: "Pricing updated",
        description: "Custom pricing has been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating pricing",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Toggle denomination enabled status
 */
export function useToggleDenominationEnabled() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      denominationId,
      isEnabled,
    }: {
      denominationId: string;
      isEnabled: boolean;
    }) => {
      const { error } = await supabase
        .from("gift_card_denominations")
        .update({ is_enabled_by_admin: isEnabled })
        .eq("id", denominationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-denominations"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-brands"] });
      toast({
        title: variables.isEnabled ? "Denomination enabled" : "Denomination disabled",
        description: variables.isEnabled 
          ? "This denomination is now available to clients"
          : "This denomination has been disabled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error toggling denomination",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete a denomination
 */
export function useDeleteDenomination() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (denominationId: string) => {
      const { error } = await supabase
        .from("gift_card_denominations")
        .delete()
        .eq("id", denominationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-denominations"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-brands"] });
      toast({
        title: "Denomination deleted",
        description: "The denomination has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting denomination",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

