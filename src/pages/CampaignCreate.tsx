/**
 * CampaignCreate Page - Modern 4-step campaign creation/edit wizard
 * 
 * SIMPLIFIED FLOW:
 * 1. Method & Name - Campaign name + mailing method selection
 * 2. Setup - Audiences + Rewards configuration
 * 3. Design - Landing page, forms, and mailer (conditional)
 * 4. Review & Publish - Final review with visual preview
 * 
 * Features:
 * - Modern card-based UI
 * - Contextual help with popovers
 * - Smart defaults and progressive disclosure
 * - Supports both CREATE and EDIT modes
 * - Edit mode pre-populates all fields from existing campaign
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/services/logger";

// Modern Wizard Components
import { MethodNameStep } from "@/components/campaigns/wizard/MethodNameStep";
import { AudiencesRewardsStep } from "@/components/campaigns/wizard/AudiencesRewardsStep";
import { DesignAssetsStep } from "@/components/campaigns/wizard/DesignAssetsStep";
import { SummaryStep } from "@/components/campaigns/wizard/SummaryStep";
import { StepIndicator } from "@/components/campaigns/wizard/StepIndicator";

import type { CampaignFormData } from "@/types/campaigns";

// 4 Steps - Same for both self-mailer and ACE fulfillment
const STEPS = [
  { label: "Method & Name", description: "Campaign basics" },
  { label: "Setup", description: "Audience & rewards" },
  { label: "Design", description: "Pages & assets" },
  { label: "Review & Publish", description: "Confirm & launch" },
];

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentClient } = useTenant();
  const { id: campaignId } = useParams<{ id: string }>();
  
  // Edit mode detection
  const isEditMode = !!campaignId;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(!isEditMode); // Skip loading for create mode
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: "",
    mailing_method: undefined,
    utm_source: "directmail",
    utm_medium: "postcard",
  });

  // Fetch existing campaign data when in edit mode
  const { data: existingCampaign, isLoading: isLoadingCampaign } = useQuery({
    queryKey: ["campaign-edit-data", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  // Fetch existing conditions when in edit mode
  const { data: existingConditions, isLoading: isLoadingConditions } = useQuery({
    queryKey: ["campaign-conditions-edit", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from("campaign_conditions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("condition_number");

      if (error) {
        logger.warn("Failed to fetch conditions:", error);
        return [];
      }
      return data || [];
    },
    enabled: isEditMode,
  });

  // Populate form data when campaign data is loaded
  useEffect(() => {
    if (isEditMode && existingCampaign && !isDataLoaded) {
      const loadedFormData: Partial<CampaignFormData> = {
        name: existingCampaign.name || "",
        mailing_method: existingCampaign.mailing_method as any,
        size: existingCampaign.size as any,
        template_id: existingCampaign.template_id || undefined,
        contact_list_id: existingCampaign.contact_list_id || undefined,
        audience_id: existingCampaign.audience_id || undefined,
        landing_page_id: existingCampaign.landing_page_id || undefined,
        lp_mode: existingCampaign.lp_mode as any,
        utm_source: existingCampaign.utm_source || "directmail",
        utm_medium: existingCampaign.utm_medium || "postcard",
        utm_campaign: existingCampaign.utm_campaign || undefined,
        postage: existingCampaign.postage as any,
        mail_date: existingCampaign.mail_date ? new Date(existingCampaign.mail_date) : undefined,
        sms_opt_in_message: existingCampaign.sms_opt_in_message || undefined,
        // Map conditions
        conditions: existingConditions?.map(c => ({
          id: c.id,
          condition_number: c.condition_number,
          condition_name: c.condition_name,
          trigger_type: c.trigger_type,
          brand_id: c.brand_id || undefined,
          card_value: c.card_value || undefined,
          sms_template: c.sms_template || undefined,
          time_delay_hours: c.time_delay_hours || undefined,
          crm_event_name: c.crm_event_name || undefined,
          is_active: c.is_active,
        })) || [],
      };
      
      setFormData(loadedFormData);
      setIsDataLoaded(true);
      logger.info("Campaign data loaded for editing:", campaignId);
    }
  }, [isEditMode, existingCampaign, existingConditions, isDataLoaded, campaignId]);

  // Create or Update campaign mutation
  const saveCampaignMutation = useMutation({
    mutationFn: async (data: Partial<CampaignFormData>) => {
      if (!currentClient) throw new Error("No client selected");

      // ========== EDIT MODE: Update existing campaign ==========
      if (isEditMode && campaignId) {
        // Build update object
        const updates: any = {
          name: data.name,
          template_id: data.template_id || null,
          size: data.size || "4x6",
          postage: data.postage || "standard",
          mail_date: data.mail_date ? new Date(data.mail_date).toISOString() : null,
          landing_page_id: data.landing_page_id || null,
          lp_mode: data.lp_mode as any || "bridge",
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          mailing_method: data.mailing_method || "self",
          sms_opt_in_message: data.sms_opt_in_message || null,
          updated_at: new Date().toISOString(),
        };

        // Update campaign
        const { data: campaign, error: updateError } = await supabase
          .from("campaigns")
          .update(updates)
          .eq("id", campaignId)
          .select()
          .single();

        if (updateError) throw updateError;

        logger.info(`Campaign updated: ${campaign.id}`);

        // Update conditions - delete existing and recreate
        if (data.conditions && data.conditions.length > 0) {
          // Delete existing conditions
          await supabase
            .from("campaign_conditions")
            .delete()
            .eq("campaign_id", campaignId);

          // Insert new conditions
          const conditionsToInsert = data.conditions.map((condition: any, index: number) => ({
            campaign_id: campaignId,
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

          const { error: conditionsError } = await supabase
            .from("campaign_conditions")
            .insert(conditionsToInsert);

          if (conditionsError) {
            logger.error("Failed to update conditions:", conditionsError);
            throw conditionsError;
          }

          // Update gift card configs
          await supabase
            .from("campaign_gift_card_config")
            .delete()
            .eq("campaign_id", campaignId);

          const giftCardConfigs = data.conditions
            .filter((condition: any) => condition.brand_id && condition.card_value)
            .map((condition: any, index: number) => ({
              campaign_id: campaignId,
              condition_number: condition.condition_number || index + 1,
              brand_id: condition.brand_id,
              denomination: condition.card_value,
            }));

          if (giftCardConfigs.length > 0) {
            await supabase
              .from("campaign_gift_card_config")
              .insert(giftCardConfigs);
          }
        }

        return campaign;
      }

      // ========== CREATE MODE: Create new campaign ==========
      let audienceId = null;

      // If contact list selected, create audience and recipients
      if (data.contact_list_id) {
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
            client_id: currentClient.id,
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

        // Get contacts from list - include unique_code from list membership AND customer_code as fallback
        const { data: listMembers, error: membersError } = await supabase
          .from("contact_list_members")
          .select("unique_code, contact:contacts(id, first_name, last_name, email, phone, address, address2, city, state, zip, customer_code)")
          .eq("list_id", data.contact_list_id);

        if (membersError) throw membersError;

        // Create recipients for contacts
        if (listMembers && listMembers.length > 0) {
          const recipients = listMembers.map((member: any) => {
            const code = member.unique_code || member.contact?.customer_code;
            const redemptionCode = code || crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();

            return {
              audience_id: audienceId,
              contact_id: member.contact?.id,
              token: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
              redemption_code: redemptionCode,
              first_name: member.contact?.first_name,
              last_name: member.contact?.last_name,
              email: member.contact?.email,
              phone: member.contact?.phone,
              address1: member.contact?.address,
              address2: member.contact?.address2,
              city: member.contact?.city,
              state: member.contact?.state,
              zip: member.contact?.zip,
            };
          });

          const { error: recipientsError } = await supabase
            .from("recipients")
            .insert(recipients);

          if (recipientsError) throw recipientsError;
          
          logger.info(`Created ${recipients.length} recipients with redemption codes for campaign`);
        }
      }

      // Determine initial status based on mailing status selection
      const isSelfMailer = data.mailing_method === "self";
      const hasBeenMailed = (data as any).campaign_status === "mailed";
      const initialStatus = (isSelfMailer && hasBeenMailed) ? "mailed" : "draft";

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert([{
          client_id: currentClient.id,
          name: data.name!,
          template_id: data.template_id || null,
          size: data.size || "4x6",
          postage: data.postage || "standard",
          mail_date: data.mail_date ? new Date(data.mail_date).toISOString() : null,
          contact_list_id: data.contact_list_id || null,
          audience_id: audienceId,
          landing_page_id: data.landing_page_id || null,
          lp_mode: data.lp_mode as any || "bridge",
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          status: initialStatus,
          mailing_method: data.mailing_method || "self",
          sms_opt_in_message: data.sms_opt_in_message || null,
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      logger.info(`Campaign created: ${campaign.id} with status: ${campaign.status}`);

      // Create conditions if any
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

        const { error: conditionsError } = await supabase
          .from("campaign_conditions")
          .insert(conditionsToInsert);

        if (conditionsError) {
          logger.error("Failed to create conditions:", conditionsError);
          throw conditionsError;
        }

        logger.info(`Created ${conditionsToInsert.length} campaign conditions`);

        const giftCardConfigs = data.conditions
          .filter((condition: any) => condition.brand_id && condition.card_value)
          .map((condition: any, index: number) => ({
            campaign_id: campaign.id,
            condition_number: condition.condition_number || index + 1,
            brand_id: condition.brand_id,
            denomination: condition.card_value,
          }));

        if (giftCardConfigs.length > 0) {
          const { error: configError } = await supabase
            .from("campaign_gift_card_config")
            .insert(giftCardConfigs);

          if (configError) {
            logger.warn("Failed to create gift card config:", configError);
          } else {
            logger.info(`Created ${giftCardConfigs.length} gift card configurations`);
          }
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
      queryClient.invalidateQueries({ queryKey: ["campaign-edit-data", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaign-conditions-edit", campaignId] });
      
      if (isEditMode) {
        toast({
          title: "Campaign Updated!",
          description: "Your changes have been saved successfully.",
        });
        navigate(`/campaigns/${campaignId}`);
      } else {
        const isReadyForCallCenter = campaign.status === "mailed";
        toast({
          title: isReadyForCallCenter ? "Campaign Ready!" : "Campaign Created!",
          description: isReadyForCallCenter 
            ? "Your campaign is ready. Call center agents can validate codes and provision gift cards."
            : "Your campaign has been created as a draft.",
        });
        navigate(`/campaigns/${campaign.id}`);
      }
    },
    onError: (error: any) => {
      logger.error(`Failed to ${isEditMode ? 'update' : 'create'} campaign:`, error);
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} campaign`;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({
        title: isEditMode ? "Update Failed" : "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!currentClient) throw new Error("No client selected");
      
      const { data, error } = await supabase.functions.invoke("save-campaign-draft", {
        body: {
          draftId: currentDraftId,
          clientId: currentClient.id,
          draftName: formData.name || "Untitled Draft",
          formData,
          currentStep,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.draft?.id && !currentDraftId) {
        setCurrentDraftId(data.draft.id);
      }
      toast({
        title: "Draft Saved",
        description: "Your campaign has been saved as a draft.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save draft",
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = useCallback(() => {
    saveDraftMutation.mutate();
  }, [saveDraftMutation]);

  // Loading state for edit mode
  const isLoading = isEditMode && (isLoadingCampaign || isLoadingConditions || !isDataLoaded);

  if (!currentClient) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a client to {isEditMode ? "edit" : "create"} a campaign.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Show loading state while fetching campaign data in edit mode
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading campaign data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleNext = (data: Partial<CampaignFormData>) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    if (isEditMode) {
      navigate(`/campaigns/${campaignId}`);
    } else {
      navigate("/campaigns");
    }
  };

  const handleSaveCampaign = () => {
    saveCampaignMutation.mutate(formData);
  };

  const handleStepClick = (targetStep: number) => {
    // Only allow going back to completed steps
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
    }
  };

  // Get campaign status for field-level edit restrictions
  const campaignStatus = existingCampaign?.status || "draft";

  // Render the appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        // Step 1: Method & Name
        return (
          <MethodNameStep
            initialData={formData}
            onNext={handleNext}
            onCancel={handleClose}
            isEditMode={isEditMode}
            campaignStatus={campaignStatus}
          />
        );
      
      case 1:
        // Step 2: Audiences & Rewards
        return (
          <AudiencesRewardsStep
            clientId={currentClient.id}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
            isEditMode={isEditMode}
            campaignStatus={campaignStatus}
          />
        );
      
      case 2:
        // Step 3: Design Assets (Landing Page, Forms, Mailer)
        return (
          <DesignAssetsStep
            clientId={currentClient.id}
            initialData={formData}
            onNext={handleNext}
            onBack={handleBack}
            isEditMode={isEditMode}
            campaignStatus={campaignStatus}
          />
        );
      
      case 3:
        // Step 4: Review & Publish
        return (
          <SummaryStep
            formData={formData}
            clientId={currentClient.id}
            recipientCount={formData.recipient_count || 0}
            onBack={handleBack}
            onConfirm={handleSaveCampaign}
            isCreating={saveCampaignMutation.isPending}
            onSaveDraft={isEditMode ? undefined : handleSaveDraft}
            isEditMode={isEditMode}
            campaignStatus={campaignStatus}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 py-6">
        {/* Header */}
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isEditMode ? "Back to Campaign" : "Back to Campaigns"}
            </Button>
            <h1 className="text-2xl font-bold">{isEditMode ? "Edit Campaign" : "Create Campaign"}</h1>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="container mx-auto">
          <div className="bg-card border rounded-lg p-6 shadow-sm">
            <StepIndicator 
              currentStep={currentStep} 
              steps={STEPS}
              onStepClick={handleStepClick}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="container mx-auto">
          <div className="bg-card border rounded-lg p-8 shadow-sm">
            {renderStep()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
