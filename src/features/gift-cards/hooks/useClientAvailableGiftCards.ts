/**
 * Hook for managing client-available gift cards
 * Replaces the old pool-based system with brand-denomination pairs
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

interface ClientAvailableGiftCard {
  id: string;
  client_id: string;
  brand_id: string;
  denomination: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  brand?: {
    id: string;
    brand_name: string;
    brand_code: string;
    logo_url?: string;
    is_enabled_by_admin: boolean;
  };
}

interface BrandWithDenominations {
  id: string;
  brand_name: string;
  brand_code: string;
  logo_url?: string;
  denominations: Array<{
    id: string;
    denomination: number;
    is_enabled_by_admin: boolean;
    inventory_count?: number;
  }>;
}

/**
 * Fetch all gift card options available to a client
 */
export function useClientAvailableGiftCards(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-available-gift-cards", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from("client_available_gift_cards")
        .select(`
          *,
          brand:gift_card_brands (
            id,
            brand_name,
            brand_code,
            logo_url,
            is_enabled_by_admin
          )
        `)
        .eq("client_id", clientId)
        .eq("is_enabled", true);

      if (error) throw error;
      return data as ClientAvailableGiftCard[];
    },
    enabled: !!clientId,
  });
}

/**
 * Fetch available brands with their denominations for a client
 * Groups by brand for better UI display
 */
export function useClientGiftCardBrands(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-gift-card-brands", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // Get all client's available gift cards with brand info
      const { data: clientCards, error: clientError } = await supabase
        .from("client_available_gift_cards")
        .select(`
          brand_id,
          denomination,
          brand:gift_card_brands (
            id,
            brand_name,
            brand_code,
            logo_url
          )
        `)
        .eq("client_id", clientId)
        .eq("is_enabled", true);

      if (clientError) throw clientError;

      // Get inventory counts per brand-denomination
      const { data: inventoryCounts, error: inventoryError } = await supabase
        .from("gift_card_inventory")
        .select("brand_id, denomination")
        .eq("status", "available");

      if (inventoryError) throw inventoryError;

      // Group by brand
      const brandsMap = new Map<string, BrandWithDenominations>();

      clientCards?.forEach((card: any) => {
        const brandId = card.brand_id;
        const brand = card.brand;

        if (!brandsMap.has(brandId)) {
          brandsMap.set(brandId, {
            id: brand.id,
            brand_name: brand.brand_name,
            brand_code: brand.brand_code,
            logo_url: brand.logo_url,
            denominations: [],
          });
        }

        const brandData = brandsMap.get(brandId)!;
        const inventoryCount = inventoryCounts?.filter(
          (inv) => inv.brand_id === brandId && inv.denomination === card.denomination
        ).length || 0;

        brandData.denominations.push({
          id: `${brandId}-${card.denomination}`,
          denomination: card.denomination,
          is_enabled_by_admin: true,
          inventory_count: inventoryCount,
        });
      });

      return Array.from(brandsMap.values());
    },
    enabled: !!clientId,
  });
}

/**
 * Add a gift card option to a client
 */
export function useAddClientGiftCard(clientId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      brandId,
      denomination,
    }: {
      brandId: string;
      denomination: number;
    }) => {
      if (!clientId) throw new Error("Client ID is required");

      const { data, error } = await supabase
        .from("client_available_gift_cards")
        .insert({
          client_id: clientId,
          brand_id: brandId,
          denomination,
          is_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-available-gift-cards", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-gift-card-brands", clientId] });
      toast({
        title: "Gift card added",
        description: "The gift card option has been added to this client",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding gift card",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Remove a gift card option from a client
 */
export function useRemoveClientGiftCard(clientId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (giftCardId: string) => {
      const { error } = await supabase
        .from("client_available_gift_cards")
        .delete()
        .eq("id", giftCardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-available-gift-cards", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-gift-card-brands", clientId] });
      toast({
        title: "Gift card removed",
        description: "The gift card option has been removed from this client",
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
 * Toggle gift card availability for a client
 */
export function useToggleClientGiftCard(clientId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      giftCardId,
      isEnabled,
    }: {
      giftCardId: string;
      isEnabled: boolean;
    }) => {
      const { error } = await supabase
        .from("client_available_gift_cards")
        .update({ is_enabled: isEnabled })
        .eq("id", giftCardId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-available-gift-cards", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client-gift-card-brands", clientId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating gift card",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

