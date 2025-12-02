/**
 * useGiftCardPools - Hook for managing gift card pools
 * 
 * Provides pool listing, creation, and management for gift card inventory
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GiftCardPool {
  id: string;
  pool_name: string;
  brand_id: string;
  denomination: number;
  client_id: string;
  total_cards: number;
  available_cards: number;
  reserved_cards: number;
  delivered_cards: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brand_name?: string;
  logo_url?: string;
}

export interface CreatePoolData {
  pool_name: string;
  brand_id: string;
  denomination: number;
  client_id: string;
}

export function useGiftCardPools(clientId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all pools for the client
  const {
    data: pools,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["gift-card-pools", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // Query pools with brand info
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching gift card pools:", error);
        throw error;
      }

      // Transform data to include brand info at top level
      return (data || []).map((pool: any) => ({
        ...pool,
        brand_name: pool.gift_card_brands?.brand_name,
        logo_url: pool.gift_card_brands?.logo_url,
      })) as GiftCardPool[];
    },
    enabled: !!clientId,
  });

  // Create a new pool
  const createPool = useMutation({
    mutationFn: async (data: CreatePoolData) => {
      const { data: newPool, error } = await supabase
        .from("gift_card_pools")
        .insert([{
          pool_name: data.pool_name,
          brand_id: data.brand_id,
          denomination: data.denomination,
          client_id: data.client_id,
          total_cards: 0,
          available_cards: 0,
          reserved_cards: 0,
          delivered_cards: 0,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return newPool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools", clientId] });
      toast({
        title: "Pool Created",
        description: "Gift card pool has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Pool",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update pool
  const updatePool = useMutation({
    mutationFn: async ({ poolId, updates }: { poolId: string; updates: Partial<GiftCardPool> }) => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .update(updates)
        .eq("id", poolId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools", clientId] });
      toast({
        title: "Pool Updated",
        description: "Gift card pool has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Updating Pool",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete pool (soft delete by setting is_active = false)
  const deletePool = useMutation({
    mutationFn: async (poolId: string) => {
      const { error } = await supabase
        .from("gift_card_pools")
        .update({ is_active: false })
        .eq("id", poolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools", clientId] });
      toast({
        title: "Pool Deactivated",
        description: "Gift card pool has been deactivated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Deactivating Pool",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get pool statistics
  const getPoolStats = (poolId: string) => {
    const pool = pools?.find(p => p.id === poolId);
    if (!pool) return null;

    return {
      total: pool.total_cards,
      available: pool.available_cards,
      reserved: pool.reserved_cards,
      delivered: pool.delivered_cards,
      utilizationRate: pool.total_cards > 0 
        ? ((pool.delivered_cards / pool.total_cards) * 100).toFixed(1) 
        : "0",
    };
  };

  // Get active pools only
  const activePools = pools?.filter(p => p.is_active) || [];

  return {
    pools: pools || [],
    activePools,
    isLoading,
    error,
    refetch,
    createPool,
    updatePool,
    deletePool,
    getPoolStats,
  };
}

