import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Condition {
  id?: string;
  campaign_id?: string;
  condition_number: number;
  condition_type: string;
  trigger_action: string;
  sequence_order: number;
  is_required: boolean;
  gift_card_pool_id?: string;
  sms_template?: string;
  webhook_url?: string;
  config_json?: Record<string, any>;
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
        .order("sequence_order");

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
          condition_type: c.condition_type,
          trigger_action: c.trigger_action,
          sequence_order: c.sequence_order,
          is_required: c.is_required,
          gift_card_pool_id: c.gift_card_pool_id,
          sms_template: c.sms_template,
          webhook_url: c.webhook_url,
          config_json: c.config_json || {},
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
      const { data, error } = await supabase.functions.invoke("evaluate-conditions", {
        body: {
          recipientId,
          campaignId,
          eventType,
          metadata,
        },
      });

      if (error) throw error;
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