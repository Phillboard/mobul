/**
 * Gift Card Provisioning Hooks
 * 
 * React Query hooks for gift card provisioning and inventory management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export interface GiftCardDenomination {
  id: string;
  brand_id: string;
  denomination: number;
  is_enabled_by_admin: boolean;
  admin_cost_per_card?: number;
  tillo_cost_per_card?: number;
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
 * Fetch denominations for a specific brand
 */
export function useBrandDenominations(brandId?: string) {
  return useQuery({
    queryKey: ['gift-card-denominations', brandId],
    queryFn: async () => {
      if (!brandId) return [];

      const { data, error } = await supabase
        .from('gift_card_denominations')
        .select('*')
        .eq('brand_id', brandId)
        .eq('is_enabled_by_admin', true)
        .order('denomination');

      if (error) throw error;
      return data as GiftCardDenomination[];
    },
    enabled: !!brandId,
  });
}

/**
 * Fetch available gift cards for a specific client
 */
export function useClientAvailableGiftCards(clientId?: string) {
  return useQuery({
    queryKey: ['client-available-gift-cards', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('client_available_gift_cards')
        .select(`
          *,
          gift_card_brands (
            id,
            brand_name,
            brand_code,
            logo_url,
            category
          )
        `)
        .eq('client_id', clientId)
        .eq('is_enabled', true);

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
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

      const { data, error } = await supabase
        .rpc('get_inventory_count', {
          p_brand_id: brandId,
          p_denomination: denomination,
        });

      if (error) throw error;
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
      const { data, error } = await supabase.functions.invoke(
        'provision-gift-card-unified',
        {
          body: {
            campaignId,
            recipientId,
            brandId,
            denomination,
            conditionNumber,
          },
        }
      );

      if (error) throw error;
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
 * Toggle client gift card availability
 */
export function useToggleClientGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientId,
      brandId,
      denomination,
      enabled,
    }: {
      clientId: string;
      brandId: string;
      denomination: number;
      enabled: boolean;
    }) => {
      if (enabled) {
        // Enable: Insert or update
        const { data, error } = await supabase
          .from('client_available_gift_cards')
          .upsert({
            client_id: clientId,
            brand_id: brandId,
            denomination: denomination,
            is_enabled: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Disable: Delete or set is_enabled = false
        const { error } = await supabase
          .from('client_available_gift_cards')
          .delete()
          .eq('client_id', clientId)
          .eq('brand_id', brandId)
          .eq('denomination', denomination);

        if (error) throw error;
        return null;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['client-available-gift-cards', variables.clientId],
      });
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

/**
 * Get campaign gift card configuration
 */
export function useCampaignGiftCardConfig(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign-gift-card-config', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('campaign_gift_card_config')
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url
          )
        `)
        .eq('campaign_id', campaignId)
        .order('condition_number');

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}

/**
 * Set gift card for a campaign condition
 */
export function useSetCampaignGiftCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      brandId,
      denomination,
      conditionNumber,
    }: {
      campaignId: string;
      brandId: string;
      denomination: number;
      conditionNumber: number;
    }) => {
      const { data, error } = await supabase
        .from('campaign_gift_card_config')
        .upsert({
          campaign_id: campaignId,
          brand_id: brandId,
          denomination: denomination,
          condition_number: conditionNumber,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['campaign-gift-card-config', variables.campaignId],
      });
    },
  });
}

