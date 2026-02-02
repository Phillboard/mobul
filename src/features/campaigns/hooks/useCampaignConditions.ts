import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useToast } from '@shared/hooks';

interface Condition {
  id?: string;
  campaign_id?: string;
  condition_number: number;
  condition_name: string;
  trigger_type: string;
  crm_event_name?: string;
  time_delay_hours?: number;
  is_active: boolean;
  is_simulated?: boolean;
  simulation_batch_id?: string;
  created_at?: string;
  // Gift card configuration
  brand_id?: string;
  card_value?: number;
  sms_template?: string;
}

export function useCampaignConditions(campaignId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conditions, isLoading } = useQuery({
    queryKey: ["campaign-conditions", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_conditions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("condition_number");

      if (error) throw error;
      return data as unknown as Condition[];
    },
    enabled: !!campaignId,
  });

  const saveConditions = useMutation({
    mutationFn: async (newConditions: Condition[]) => {
      // Delete existing conditions
      await supabase
        .from("campaign_conditions")
        .delete()
        .eq("campaign_id", campaignId);

      // Insert new conditions
      if (newConditions.length > 0) {
        const conditionsToInsert = newConditions.map(c => ({
          campaign_id: campaignId,
          condition_number: c.condition_number,
          condition_name: c.condition_name,
          trigger_type: c.trigger_type,
          crm_event_name: c.crm_event_name || null,
          time_delay_hours: c.time_delay_hours || null,
          is_active: c.is_active,
          brand_id: c.brand_id || null,
          card_value: c.card_value || null,
          sms_template: c.sms_template || null,
        }));

        const { data, error } = await supabase
          .from("campaign_conditions")
          .insert(conditionsToInsert as any)
          .select();

        if (error) throw error;
        return data;
      }
      return [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-conditions", campaignId] });
      toast({
        title: "Conditions saved",
        description: "Campaign conditions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving conditions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    conditions: conditions || [],
    isLoading,
    saveConditions,
  };
}

export function useEvaluateConditions() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      recipientId,
      campaignId,
      eventType,
      metadata,
    }: {
      recipientId: string;
      campaignId: string;
      eventType?: string;
      metadata?: Record<string, any>;
    }) => {
      const data = await callEdgeFunction(
        Endpoints.campaigns.evaluateConditions,
        {
          recipientId,
          campaignId,
          eventType,
          metadata,
        }
      );

      return data;
    },
    onError: (error: any) => {
      toast({
        title: "Error evaluating conditions",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}