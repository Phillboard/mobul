/**
 * CampaignCreate Page - Modern 4-step campaign creation wizard
 * 
 * NEW SIMPLIFIED FLOW:
 * 1. Method & Name - Campaign name + mailing method selection
 * 2. Setup - Audiences + Rewards configuration
 * 3. Design - Landing page, forms, and mailer (conditional)
 * 4. Review & Publish - Final review with visual preview
 * 
 * Features:
 * - Modern card-based UI
 * - Contextual help with popovers
 * - Smart defaults and progressive disclosure
 * - 50% fewer steps than previous version
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: "",
    mailing_method: undefined,
    utm_source: "directmail",
    utm_medium: "postcard",
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: Partial<CampaignFormData>) => {
      if (!currentClient) throw new Error("No client selected");

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

      // Determine initial status based on mailing method
      // Self-mailers can be activated immediately, ACE fulfillment starts as draft
      const isSelfMailer = data.mailing_method === "self";
      const initialStatus = isSelfMailer ? "active" : "draft";

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
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // For self-mailers, create campaign_recipients to link contacts to the campaign
      // This enables code validation in the call center
      if (isSelfMailer && data.contact_list_id) {
        // Get contacts from the list
        const { data: listMembers, error: listMembersError } = await supabase
          .from("contact_list_members")
          .select("contact_id")
          .eq("list_id", data.contact_list_id);

        if (listMembersError) {
          logger.warn("Failed to get list members for campaign_recipients:", listMembersError);
        } else if (listMembers && listMembers.length > 0) {
          // Create campaign_recipients entries
          const campaignRecipients = listMembers.map((member: any) => ({
            campaign_id: campaign.id,
            contact_id: member.contact_id,
            status: "pending",
          }));

          const { error: crError } = await supabase
            .from("campaign_recipients")
            .insert(campaignRecipients);

          if (crError) {
            logger.warn("Failed to create campaign_recipients:", crError);
            // Don't throw - campaign is already created
          }
        }
      }

      // Create conditions and reward configs if any
      if (data.conditions && data.conditions.length > 0) {
        const conditionsToInsert = data.conditions.map((condition: any, index: number) => ({
          campaign_id: campaign.id,
          condition_number: condition.condition_number || index + 1,
          condition_name: condition.condition_name,
          trigger_type: condition.trigger_type,
          time_delay_hours: condition.time_delay_hours,
          crm_event_name: condition.crm_event_name,
          brand_id: condition.brand_id,
          card_value: condition.card_value,
          sms_template: condition.sms_template,
          is_active: condition.is_active !== false,
        }));

        const { error: conditionsError } = await supabase
          .from("campaign_conditions")
          .insert(conditionsToInsert);

        if (conditionsError) throw conditionsError;
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
      const isActive = campaign.status === "active";
      toast({
        title: isActive ? "Campaign Activated!" : "Campaign Created!",
        description: isActive 
          ? "Your campaign is now active. Call center agents can validate codes."
          : "Your campaign has been created as a draft.",
      });
      navigate(`/campaigns/${campaign.id}`);
    },
    onError: (error) => {
      logger.error("Failed to create campaign:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create campaign",
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

  if (!currentClient) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a client to create a campaign.
            </AlertDescription>
          </Alert>
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
    navigate("/campaigns");
  };

  const handleCreateCampaign = () => {
    createCampaignMutation.mutate(formData);
  };

  const handleStepClick = (targetStep: number) => {
    // Only allow going back to completed steps
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
    }
  };

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
            onConfirm={handleCreateCampaign}
            isCreating={createCampaignMutation.isPending}
            onSaveDraft={handleSaveDraft}
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
              Back to Campaigns
            </Button>
            <h1 className="text-2xl font-bold">Create Campaign</h1>
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
