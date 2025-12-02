/**
 * Denomination Pricing Hook
 * Manages custom pricing configuration and profit calculations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DenominationPricing {
  id: string;
  brand_id: string;
  brand_name: string;
  denomination: number;
  use_custom_pricing: boolean;
  client_price?: number;
  agency_price?: number;
  cost_basis?: number;
  profit_margin_percentage?: number;
  is_enabled_by_admin: boolean;
}

/**
 * Get all pricing configurations
 */
export function useAllDenominationPricing() {
  return useQuery({
    queryKey: ["denomination-pricing-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_denominations")
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url
          )
        `)
        .order("brand_id")
        .order("denomination");

      if (error) throw error;

      return data?.map(d => ({
        ...d,
        brand_name: d.gift_card_brands?.brand_name || 'Unknown',
        logo_url: d.gift_card_brands?.logo_url,
      }));
    },
  });
}

/**
 * Get pricing for specific denomination
 */
export function useDenominationPricing(brandId: string | undefined, denomination: number | undefined) {
  return useQuery({
    queryKey: ["denomination-pricing", brandId, denomination],
    queryFn: async () => {
      if (!brandId || !denomination) return null;

      const { data, error } = await supabase
        .from("gift_card_denominations")
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url
          )
        `)
        .eq("brand_id", brandId)
        .eq("denomination", denomination)
        .single();

      if (error) {
        // If no pricing config exists, return defaults
        if (error.code === 'PGRST116') {
          return {
            brand_id: brandId,
            denomination,
            use_custom_pricing: false,
            client_price: denomination,
            cost_basis: null,
          };
        }
        throw error;
      }

      return data;
    },
    enabled: !!brandId && !!denomination,
  });
}

/**
 * Calculate effective price based on custom pricing settings
 */
export function calculateEffectivePrice(
  denomination: number,
  useCustomPricing: boolean,
  clientPrice?: number,
  agencyPrice?: number,
  forAgency: boolean = false
): number {
  if (!useCustomPricing) {
    return denomination; // Use face value
  }

  if (forAgency && agencyPrice) {
    return agencyPrice;
  }

  return clientPrice || denomination;
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(price: number, cost: number): number {
  if (cost <= 0) return 0;
  return ((price - cost) / cost) * 100;
}

/**
 * Bulk update pricing
 */
export function useBulkUpdatePricing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      updates,
    }: {
      updates: Array<{
        denominationId: string;
        clientPrice?: number;
        agencyPrice?: number;
        costBasis?: number;
        useCustomPricing?: boolean;
      }>;
    }) => {
      const results = [];

      for (const update of updates) {
        const { error } = await supabase
          .from("gift_card_denominations")
          .update({
            use_custom_pricing: update.useCustomPricing,
            client_price: update.clientPrice,
            agency_price: update.agencyPrice,
            cost_basis: update.costBasis,
          })
          .eq("id", update.denominationId);

        if (error) {
          results.push({ id: update.denominationId, error: error.message });
        } else {
          results.push({ id: update.denominationId, success: true });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denomination-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-denominations"] });
      toast({
        title: "Bulk pricing update complete",
        description: "Pricing configurations have been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Set pricing to face value for all denominations
 */
export function useResetPricingToFaceValue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("gift_card_denominations")
        .update({
          use_custom_pricing: false,
          client_price: null,
          agency_price: null,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denomination-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-denominations"] });
      toast({
        title: "Pricing reset",
        description: "All denominations now use face value pricing",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Apply markup percentage to all denominations
 */
export function useApplyMarkupPercentage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ markupPercentage }: { markupPercentage: number }) => {
      // First, get all denominations
      const { data: denoms, error: fetchError } = await supabase
        .from("gift_card_denominations")
        .select("id, denomination");

      if (fetchError) throw fetchError;

      // Update each with calculated price
      for (const denom of denoms || []) {
        const newPrice = denom.denomination * (1 + markupPercentage / 100);

        await supabase
          .from("gift_card_denominations")
          .update({
            use_custom_pricing: true,
            client_price: Math.round(newPrice * 100) / 100, // Round to 2 decimals
          })
          .eq("id", denom.id);
      }

      return denoms?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["denomination-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-denominations"] });
      toast({
        title: "Markup applied",
        description: `Updated pricing for ${count} denominations`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Markup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

