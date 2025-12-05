/**
 * Hook for managing campaign gift card configuration
 * Links campaigns to specific brand-denomination combinations for each condition
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

interface CampaignGiftCardConfig {
  id: string;
  campaign_id: string;
  brand_id: string;
  denomination: number;
  condition_number: number;
  created_at: string;
  updated_at: string;
  brand?: {
    id: string;
    brand_name: string;
    brand_code: string;
    logo_url?: string;
  };
}

/**
 * Fetch gift card configuration for a campaign
 */
export function useCampaignGiftCardConfig(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-gift-card-config", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("campaign_gift_card_config")
        .select(`
          *,
          brand:gift_card_brands (
            id,
            brand_name,
            brand_code,
            logo_url
          )
        `)
        .eq("campaign_id", campaignId)
        .order("condition_number");

      if (error) throw error;
      return data as CampaignGiftCardConfig[];
    },
    enabled: !!campaignId,
  });
}

/**
 * Set gift card for a specific campaign condition
 */
export function useSetCampaignGiftCard(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      brandId,
      denomination,
      conditionNumber,
    }: {
      brandId: string;
      denomination: number;
      conditionNumber: number;
    }) => {
      if (!campaignId) throw new Error("Campaign ID is required");

      // Upsert - replace existing or create new
      const { data, error } = await supabase
        .from("campaign_gift_card_config")
        .upsert({
          campaign_id: campaignId,
          brand_id: brandId,
          denomination,
          condition_number: conditionNumber,
        }, {
          onConflict: "campaign_id,condition_number",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-gift-card-config", campaignId] });
      toast({
        title: "Gift card configured",
        description: "The gift card has been assigned to this condition",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error configuring gift card",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Remove gift card from a campaign condition
 */
export function useRemoveCampaignGiftCard(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (conditionNumber: number) => {
      if (!campaignId) throw new Error("Campaign ID is required");

      const { error } = await supabase
        .from("campaign_gift_card_config")
        .delete()
        .eq("campaign_id", campaignId)
        .eq("condition_number", conditionNumber);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-gift-card-config", campaignId] });
      toast({
        title: "Gift card removed",
        description: "The gift card has been removed from this condition",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing gift card",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Get inventory count for a specific brand-denomination combination
 */
export function useGiftCardInventoryCount(brandId: string | undefined, denomination: number | undefined) {
  return useQuery({
    queryKey: ["gift-card-inventory-count", brandId, denomination],
    queryFn: async () => {
      if (!brandId || !denomination) return 0;

      const { count, error } = await supabase
        .from("gift_card_inventory")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", brandId)
        .eq("denomination", denomination)
        .eq("status", "available");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!brandId && !!denomination,
  });
}

