import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type GiftCardPool = Tables<"gift_card_pools">;
type GiftCardPoolInsert = TablesInsert<"gift_card_pools">;

export function useGiftCardPools(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pools, isLoading } = useQuery({
    queryKey: ["gift-card-pools", clientId],
    queryFn: async () => {
      let query = supabase
        .from("gift_card_pools")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as GiftCardPool[];
    },
    enabled: !!clientId,
  });

  const createPool = useMutation({
    mutationFn: async (pool: GiftCardPoolInsert & { 
      purchase_method?: string;
      api_provider?: string;
      api_config?: any;
    }) => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .insert({
          ...pool,
          purchase_method: pool.purchase_method || 'csv_only',
          api_provider: pool.api_provider || null,
          api_config: pool.api_config || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all gift-card-pools queries including master pools
      queryClient.invalidateQueries({ 
        queryKey: ["gift-card-pools"],
        refetchType: 'all'
      });
      toast({
        title: "Success",
        description: "Gift card pool created successfully",
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

  const updatePool = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GiftCardPool> & { id: string }) => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
      toast({
        title: "Success",
        description: "Pool updated successfully",
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

  const deletePool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gift_card_pools")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
      toast({
        title: "Success",
        description: "Pool deleted successfully",
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

  return {
    pools,
    isLoading,
    createPool,
    updatePool,
    deletePool,
  };
}
