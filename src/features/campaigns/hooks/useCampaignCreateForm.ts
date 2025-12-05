import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { CampaignFormData } from "@/types/campaigns";
import { logger } from '@/lib/services/logger';

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
      logger.error("Failed to save draft:", error);
    }
  };

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Partial<CampaignFormData>) => {
      let audienceId = null;

      // If contact list selected, create audience and recipients
      if (data.contact_list_id) {
        // Get contact list details
        const { data: contactList, error: listError } = await supabase
          .from("contact_lists")
          .select("name, contact_count")
          .eq("id", data.contact_list_id)
          .single();

        if (listError) throw listError;

        // Create audience
        const { data: audience, error: audienceError } = await supabase
          .from("audiences")
          .insert([{
            client_id: clientId,
            name: `${data.name} - Recipients`,
            source: "import",
            status: "ready",
            total_count: contactList.contact_count || 0,
            valid_count: contactList.contact_count || 0,
          }])
          .select()
          .single();

        if (audienceError) throw audienceError;
        audienceId = audience.id;

        // Get contacts from list
        const { data: listMembers, error: membersError } = await supabase
          .from("contact_list_members")
          .select("contact:contacts(id, first_name, last_name, email, phone, address, address2, city, state, zip)")
          .eq("list_id", data.contact_list_id);

        if (membersError) throw membersError;

        // Create recipients for all contacts
        if (listMembers && listMembers.length > 0) {
          const recipients = listMembers.map((member: any) => ({
            audience_id: audienceId,
            contact_id: member.contact?.id,
            token: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
            first_name: member.contact?.first_name,
            last_name: member.contact?.last_name,
            email: member.contact?.email,
            phone: member.contact?.phone,
            address1: member.contact?.address,
            address2: member.contact?.address2,
            city: member.contact?.city,
            state: member.contact?.state,
            zip: member.contact?.zip,
          }));

          const { error: recipientsError } = await supabase
            .from("recipients")
            .insert(recipients);

          if (recipientsError) throw recipientsError;
        }
      }

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
          audience_id: audienceId,
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

      // Create conditions and reward configs if any
      if (data.conditions && data.conditions.length > 0) {
        const conditionsToInsert = data.conditions.map((condition: any, index: number) => ({
          campaign_id: campaign.id,
          condition_number: condition.condition_number || index + 1,
          condition_name: condition.condition_name,
          trigger_type: condition.trigger_type,
          time_delay_hours: condition.time_delay_hours,
          crm_event_name: condition.crm_event_name,
          is_active: condition.is_active !== false,
          brand_id: condition.brand_id || null,
          card_value: condition.card_value || null,
          sms_template: condition.sms_template || null,
        }));

        const { data: insertedConditions, error: conditionsError } = await supabase
          .from("campaign_conditions")
          .insert(conditionsToInsert)
          .select();

        if (conditionsError) throw conditionsError;

        // Create reward configs (link conditions to pools)
        const rewardConfigsToInsert = data.conditions
          .filter((c: any) => c.gift_card_pool_id)
          .map((condition: any, index: number) => {
            const insertedCondition = insertedConditions?.find(
              (ic) => ic.condition_number === (condition.condition_number || index + 1)
            );
            return {
              campaign_id: campaign.id,
              condition_id: insertedCondition?.id,
              condition_number: condition.condition_number || index + 1,
              gift_card_pool_id: condition.gift_card_pool_id,
              sms_template: condition.sms_template || null,
            };
          });

        if (rewardConfigsToInsert.length > 0) {
          const { error: rewardConfigError } = await supabase
            .from("campaign_reward_configs")
            .insert(rewardConfigsToInsert);

          if (rewardConfigError) throw rewardConfigError;
        }
      }

      // Link forms to campaign if any
      if ((data as any).selected_form_ids && (data as any).selected_form_ids.length > 0) {
        const { error: formsError } = await supabase
          .from("ace_forms")
          .update({ campaign_id: campaign.id })
          .in("id", (data as any).selected_form_ids);

        if (formsError) throw formsError;
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
      logger.error("Failed to create campaign:", error);
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
