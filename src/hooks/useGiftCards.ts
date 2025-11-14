import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type GiftCard = Tables<"gift_cards">;

export function useGiftCards(poolId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ["gift-cards", poolId],
    queryFn: async () => {
      let query = supabase
        .from("gift_cards")
        .select("*, gift_card_pools(pool_name, card_value, provider)")
        .order("created_at", { ascending: false });

      if (poolId) {
        query = query.eq("pool_id", poolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!poolId || poolId === undefined,
  });

  const updateCardStatus = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      delivered_at 
    }: { 
      id: string; 
      status: string; 
      delivered_at?: string;
    }) => {
      const { data, error } = await supabase
        .from("gift_cards")
        .update({ status, delivered_at })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-cards"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
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
    cards,
    isLoading,
    updateCardStatus,
  };
}

export function useGiftCardDeliveries(campaignId?: string) {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["gift-card-deliveries", campaignId],
    queryFn: async () => {
      let query = supabase
        .from("gift_card_deliveries")
        .select(`
          *,
          gift_cards(card_code, gift_card_pools(card_value, provider)),
          recipients(first_name, last_name, phone, email),
          campaigns(name)
        `)
        .order("delivered_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return {
    deliveries,
    isLoading,
  };
}
