/**
 * Gift Card Provisioning Hooks
 * 
 * React Query hooks for gift card provisioning and inventory management
 * 
 * NOTE: These hooks are SPECIFIC to provisioning operations.
 * For client gift card management, use useClientAvailableGiftCards.ts
 * For denominations, use useGiftCardDenominations.ts
 * For campaign gift card config, use campaigns/hooks/useCampaignGiftCardConfig.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';

export interface GiftCardBrand {
  id: string;
  brand_name: string;
  brand_code: string;
  tillo_brand_code?: string;
  logo_url?: string;
  category?: string;
  is_enabled_by_admin: boolean;
  created_at: string;
}

export interface AvailableGiftCard {
  brand: GiftCardBrand;
  denomination: number;
  inventory_count: number;
}

/**
 * Fetch all enabled gift card brands
 */
export function useEnabledBrands() {
  return useQuery({
    queryKey: ['gift-card-brands', 'enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_brands')
        .select('*')
        .eq('is_enabled_by_admin', true)
        .order('brand_name');

      if (error) throw error;
      return data as GiftCardBrand[];
    },
  });
}

/**
 * Fetch all brands (admin only)
 */
export function useAllBrands() {
  return useQuery({
    queryKey: ['gift-card-brands', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_brands')
        .select('*')
        .order('brand_name');

      if (error) throw error;
      return data as GiftCardBrand[];
    },
  });
}

/**
 * Get inventory count for a specific brand-denomination
 */
export function useInventoryCount(brandId?: string, denomination?: number) {
  return useQuery({
    queryKey: ['inventory-count', brandId, denomination],
    queryFn: async () => {
      if (!brandId || !denomination) return 0;

      // Try RPC function first
      const { data, error } = await supabase
        .rpc('get_inventory_count', {
          p_brand_id: brandId,
          p_denomination: denomination,
        });

      if (error) {
        // If RPC doesn't exist, fall back to direct query
        console.warn('RPC get_inventory_count not available, using direct query');
        const { count, error: countError } = await supabase
          .from('gift_card_inventory')
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brandId)
          .eq('denomination', denomination)
          .eq('status', 'available');

        if (countError) {
          console.error('Error counting inventory:', countError);
          return 0;
        }
        return count || 0;
      }

      return data as number;
    },
    enabled: !!brandId && !!denomination,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Provision a gift card (calls unified provisioning edge function)
 */
export function useProvisionCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      recipientId,
      brandId,
      denomination,
      conditionNumber,
    }: {
      campaignId: string;
      recipientId: string;
      brandId: string;
      denomination: number;
      conditionNumber: number;
    }) => {
      const data = await callEdgeFunction<{ success: boolean; error?: string }>(
        Endpoints.giftCards.provisionUnified,
        {
          campaignId,
          recipientId,
          brandId,
          denomination,
          conditionNumber,
        }
      );

      if (!data.success) throw new Error(data.error || 'Provisioning failed');

      return data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['inventory-count'] });
      queryClient.invalidateQueries({ queryKey: ['gift-card-billing'] });
    },
  });
}

/**
 * Bulk enable/disable gift cards for a client
 */
export function useBulkSetClientGiftCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      giftCards,
    }: {
      clientId: string;
      giftCards: Array<{ brandId: string; denomination: number }>;
    }) => {
      // Delete all existing
      await supabase
        .from('client_available_gift_cards')
        .delete()
        .eq('client_id', clientId);

      // Insert new ones
      if (giftCards.length > 0) {
        const { data, error } = await supabase
          .from('client_available_gift_cards')
          .insert(
            giftCards.map((gc) => ({
              client_id: clientId,
              brand_id: gc.brandId,
              denomination: gc.denomination,
              is_enabled: true,
            }))
          );

        if (error) throw error;
        return data;
      }
      return null;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['client-available-gift-cards', variables.clientId],
      });
    },
  });
}
