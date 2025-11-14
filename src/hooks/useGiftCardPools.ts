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
    mutationFn: async (pool: GiftCardPoolInsert) => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .insert(pool)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
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
