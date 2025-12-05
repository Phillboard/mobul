import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

// Using new gift_card_inventory table
export function useGiftCards(brandId?: string, denomination?: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ["gift-card-inventory", brandId, denomination],
    queryFn: async () => {
      let query = supabase
        .from("gift_card_inventory")
        .select("*, gift_card_brands(brand_name, logo_url)")
        .order("created_at", { ascending: false });

      if (brandId) {
        query = query.eq("brand_id", brandId);
      }
      
      if (denomination) {
        query = query.eq("denomination", denomination);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Gift card inventory query error:", error);
        return [];
      }
      return data;
    },
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
        .from("gift_card_inventory")
        .update({ status, delivered_at })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-billing"] });
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

// Updated to use billing ledger instead of deliveries table
export function useGiftCardDeliveries(campaignId?: string) {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["gift-card-billing-ledger", campaignId],
    queryFn: async () => {
      let query = supabase
        .from("gift_card_billing_ledger")
        .select(`
          *,
          gift_card_brands(brand_name, logo_url),
          campaigns(name),
          gift_card_inventory(card_code, status)
        `)
        .order("billed_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Billing ledger query error:", error);
        return [];
      }
      return data;
    },
  });

  return {
    deliveries,
    isLoading,
  };
}
