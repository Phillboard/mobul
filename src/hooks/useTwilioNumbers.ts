import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTrackedNumbers(clientId: string | null) {
  return useQuery({
    queryKey: ['tracked-numbers', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('tracked_phone_numbers')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useUpdateTrackedNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: {
        forward_to_number?: string;
        recording_enabled?: boolean;
        friendly_name?: string;
        status?: string;
      } 
    }) => {
      const { data, error } = await supabase
        .from('tracked_phone_numbers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-numbers'] });
      toast.success('Phone number updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update phone number: ${error.message}`);
    },
  });
}

export function useAssignNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      phoneNumberId, 
      provisionNew 
    }: { 
      campaignId: string; 
      phoneNumberId?: string; 
      provisionNew?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('assign-tracked-numbers', {
        body: { campaignId, phoneNumberId, provisionNew },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Phone number assigned to campaign');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign phone number: ${error.message}`);
    },
  });
}

export function useGiftCardDeliveries(campaignId?: string) {
  return useQuery({
    queryKey: ['gift-card-deliveries', campaignId],
    queryFn: async () => {
      let query = supabase
        .from('gift_card_deliveries')
        .select(`
          *,
          gift_cards(card_code, gift_card_pools(card_value, pool_name)),
          recipients(first_name, last_name, phone)
        `)
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useRetryFailedSMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryId?: string) => {
      if (deliveryId) {
        // Retry single delivery
        const { data: delivery } = await supabase
          .from('gift_card_deliveries')
          .select(`
            *,
            gift_cards!inner(card_code, gift_card_pools!inner(card_value)),
            recipients!inner(phone, first_name)
          `)
          .eq('id', deliveryId)
          .single();

        if (!delivery) throw new Error('Delivery not found');

        const { data, error } = await supabase.functions.invoke('send-gift-card-sms', {
          body: {
            deliveryId: delivery.id,
            giftCardCode: delivery.gift_cards.card_code,
            giftCardValue: delivery.gift_cards.gift_card_pools.card_value,
            recipientPhone: delivery.recipients.phone,
            recipientName: delivery.recipients.first_name,
            customMessage: delivery.sms_message,
          },
        });

        if (error) throw error;
        return data;
      } else {
        // Retry all failed deliveries
        const { data, error } = await supabase.functions.invoke('retry-failed-sms');
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-deliveries'] });
      toast.success('SMS retry initiated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry SMS: ${error.message}`);
    },
  });
}
