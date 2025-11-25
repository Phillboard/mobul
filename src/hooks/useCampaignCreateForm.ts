import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { CampaignFormData } from "@/types/campaigns";

interface UseCampaignCreateFormProps {
  clientId: string;
}

export function useCampaignCreateForm({ clientId }: UseCampaignCreateFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  
  const form = useForm<Partial<CampaignFormData>>({
    defaultValues: {
      name: "",
      size: "4x6",
      postage: "standard",
      mail_date_mode: "asap",
      lp_mode: "bridge",
      utm_source: "directmail",
      utm_medium: "postcard",
      recipient_source: "list",
      enableCallTracking: false,
      conditions: [],
    },
  });

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const subscription = form.watch((value) => {
      const timer = setTimeout(() => {
        if (value.name && value.name.length > 2) {
          saveDraft(value as Partial<CampaignFormData>);
        }
      }, 30000);

      return () => clearTimeout(timer);
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

  const saveDraft = async (data: Partial<CampaignFormData>) => {
    try {
      const { data: result } = await supabase.functions.invoke("save-campaign-draft", {
        body: {
          draftId: currentDraftId,
          clientId,
          draftName: data.name || "Untitled Draft",
          formData: data,
          currentStep: 1,
        },
      });

      if (result?.draft?.id && !currentDraftId) {
        setCurrentDraftId(result.draft.id);
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Partial<CampaignFormData>) => {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert([{
          client_id: clientId,
          name: data.name!,
          template_id: data.template_id || null,
          size: data.size!,
          postage: data.postage || "standard",
          mail_date: data.mail_date ? new Date(data.mail_date).toISOString() : null,
          contact_list_id: data.contact_list_id || null,
          landing_page_id: data.landing_page_id || null,
          lp_mode: data.lp_mode as any || "bridge",
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          status: "draft",
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create conditions if any
      if (data.conditions && data.conditions.length > 0) {
        const conditionsToInsert = data.conditions.map((condition, index) => ({
          campaign_id: campaign.id,
          condition_number: index + 1,
          condition_name: condition.condition_name,
          trigger_type: condition.trigger_type,
          time_delay_hours: condition.time_delay_hours,
          crm_event_name: condition.crm_event_name,
        }));

        const { error: conditionsError } = await supabase
          .from("campaign_conditions")
          .insert(conditionsToInsert);

        if (conditionsError) throw conditionsError;
      }

      // Delete draft if exists
      if (currentDraftId) {
        await supabase
          .from("campaign_drafts")
          .delete()
          .eq("id", currentDraftId);
      }

      return campaign;
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created successfully!");
      navigate(`/campaigns/${campaign.id}`);
    },
    onError: (error) => {
      console.error("Failed to create campaign:", error);
      toast.error("Failed to create campaign. Please try again.");
    },
  });

  const handleSaveDraft = () => {
    const data = form.getValues();
    saveDraft(data);
    toast.success("Draft saved!");
  };

  const handleSubmit = form.handleSubmit((data) => {
    createCampaignMutation.mutate(data);
  });

  return {
    form,
    handleSubmit,
    handleSaveDraft,
    isCreating: createCampaignMutation.isPending,
  };
}
