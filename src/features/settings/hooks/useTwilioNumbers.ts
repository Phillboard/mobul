import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
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

export function useProvisionNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      areaCode,
      campaignId,
      friendlyName,
      forwardToNumber,
    }: { 
      areaCode?: string;
      campaignId?: string;
      friendlyName?: string;
      forwardToNumber?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('provision-twilio-number', {
        body: { areaCode, campaignId, friendlyName, forwardToNumber },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracked-numbers'] });
      toast.success('Phone number provisioned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to provision phone number: ${error.message}`);
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
    queryKey: ['gift-card-billing-deliveries', campaignId],
    queryFn: async () => {
      let query = supabase
        .from('gift_card_billing_ledger')
        .select(`
          *,
          gift_card_brands(brand_name, logo_url),
          gift_card_inventory(card_code, status)
        `)
        .order('billed_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Gift card billing query error:', error);
        return [];
      }
      return data;
    },
  });
}

export function useRetryFailedSMS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inventoryId?: string) => {
      if (inventoryId) {
        // Retry single delivery using new gift card inventory system
        const { data: inventory } = await supabase
          .from('gift_card_inventory')
          .select(`
            *,
            gift_card_brands!inner(brand_name),
            recipients!inner(phone, first_name)
          `)
          .eq('id', inventoryId)
          .single();

        if (!inventory) throw new Error('Gift card inventory not found');

        const { data, error } = await supabase.functions.invoke('send-gift-card-sms', {
          body: {
            inventoryId: inventory.id,
            giftCardCode: inventory.card_code,
            giftCardValue: inventory.denomination,
            recipientPhone: inventory.recipients?.phone,
            recipientName: inventory.recipients?.first_name,
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
      queryClient.invalidateQueries({ queryKey: ['gift-card-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['gift-card-billing'] });
      toast.success('SMS retry initiated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry SMS: ${error.message}`);
    },
  });
}
