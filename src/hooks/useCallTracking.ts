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

export function useCallSessions(campaignId: string | null) {
  return useQuery({
    queryKey: ['call-sessions', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*, recipients(*), tracked_phone_numbers(*)')
        .eq('campaign_id', campaignId)
        .order('call_started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}

export function useCallSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['call-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          recipients(*),
          campaigns(*, campaign_conditions(*), call_conditions_met(*)),
          tracked_phone_numbers(*)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useAssignTrackedNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      campaignId, 
      clientId, 
      provisionNew = false 
    }: { 
      campaignId: string; 
      clientId: string; 
      provisionNew?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('assign-tracked-numbers', {
        body: { campaignId, clientId, provisionNew }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tracked-numbers'] });
      toast.success(`Phone number ${data.number.phone_number} assigned successfully`);
    },
    onError: (error: any) => {
      console.error('Assign number error:', error);
      toast.error(error.message || 'Failed to assign phone number');
    },
  });
}

export function useCompleteCondition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callSessionId,
      campaignId,
      recipientId,
      conditionNumber,
      notes,
    }: {
      callSessionId: string;
      campaignId: string;
      recipientId: string;
      conditionNumber: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('complete-condition', {
        body: { callSessionId, campaignId, recipientId, conditionNumber, notes }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['call-session', variables.callSessionId] });
      queryClient.invalidateQueries({ queryKey: ['call-conditions'] });
      
      if (data.giftCard) {
        toast.success(
          `Condition completed! $${data.giftCard.value} ${data.giftCard.provider} gift card ${
            data.giftCard.deliveryStatus === 'sent' ? 'sent' : 'claimed'
          }`
        );
      } else {
        toast.success('Condition recorded successfully');
      }
    },
    onError: (error: any) => {
      console.error('Complete condition error:', error);
      toast.error(error.message || 'Failed to complete condition');
    },
  });
}

export function useCallConditions(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-conditions', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_conditions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('condition_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}

export function useUpdateCallNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      notes,
    }: {
      sessionId: string;
      notes: string;
    }) => {
      const { error } = await supabase
        .from('call_sessions')
        .update({ notes })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['call-session', variables.sessionId] });
    },
    onError: (error: any) => {
      console.error('Update notes error:', error);
      toast.error('Failed to save notes');
    },
  });
}
