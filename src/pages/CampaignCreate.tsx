/**
 * CampaignCreate Page - Full-page campaign creation wizard
 * 
 * NEW 4-STEP FLOW:
 * 1. Method - Select self-mailing or ACE fulfillment
 * 2. Setup - Campaign name, codes, conditions, delivery (combined)
 * 3. Design - Upload postcard + select landing page/form (combined)
 * 4. Review - Final review with prominent Save as Draft
 * 
 * Features:
 * - Main sidebar menu remains visible
 * - Save as Draft on every step
 * - 5% default redemption rate for gift card cost estimates
 */

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Wizard Components
import { MailingMethodStep } from "@/components/campaigns/wizard/MailingMethodStep";
import { CombinedSetupStep } from "@/components/campaigns/wizard/CombinedSetupStep";
import { DesignPageStep } from "@/components/campaigns/wizard/DesignPageStep";
import { SummaryStep } from "@/components/campaigns/wizard/SummaryStep";
import { StepIndicator } from "@/components/campaigns/wizard/StepIndicator";
import { WizardSidebar } from "@/components/campaigns/wizard/WizardSidebar";

import type { CampaignFormData, MailingMethod } from "@/types/campaigns";

// 4 Steps for both flows (ACE fulfillment just shows delivery section in Setup)
const STEPS = [
  { label: "Method", description: "How you're mailing" },
  { label: "Setup", description: "Name, codes, conditions" },
  { label: "Design", description: "Design & redemption page" },
  { label: "Review", description: "Confirm & create" },
];

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentClient } = useTenant();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: "",
    mailing_method: undefined,
    size: "4x6",
    postage: "standard",
    mail_date_mode: "asap",
    utm_source: "directmail",
    utm_medium: "postcard",
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

  const handleMailingMethodSelect = (method: MailingMethod) => {
    setFormData({ ...formData, mailing_method: method });
  };

  const handleMailingMethodNext = () => {
    setCurrentStep(1);
  };

  // Render the appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        // Step 1: Method Selection
        return (
          <MailingMethodStep
            selectedMethod={formData.mailing_method || null}
            onSelect={handleMailingMethodSelect}
            onNext={handleMailingMethodNext}
            onCancel={handleClose}
            onSaveDraft={handleSaveDraft}
          />
        );
      
      case 1:
        // Step 2: Combined Setup (Name, Codes, Conditions, Delivery)
        return (
          <CombinedSetupStep
            clientId={currentClient.id}
            campaignId={campaignId}
            initialData={formData}
            mailingMethod={formData.mailing_method || 'self'}
            onNext={handleNext}
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
          />
        );
      
      case 2:
        // Step 3: Design & Page Selection
        return (
          <DesignPageStep
            clientId={currentClient.id}
            campaignId={campaignId}
            initialData={formData}
            mailingMethod={formData.mailing_method || 'self'}
            onNext={handleNext}
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
          />
        );
      
      case 3:
        // Step 4: Review & Create
        return (
          <SummaryStep
            formData={formData}
            clientId={currentClient.id}
            recipientCount={formData.recipient_count || 0}
            onBack={handleBack}
            onConfirm={handleClose}
            onSaveDraft={handleSaveDraft}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
        <div className="bg-card border rounded-lg p-4">
          <StepIndicator currentStep={currentStep} steps={STEPS} />
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Sidebar - show from step 1 onwards */}
          {currentStep > 0 && (
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-4">
                <WizardSidebar
                  formData={formData}
                  recipientCount={formData.recipient_count || 0}
                  clientId={currentClient.id}
                  mailingMethod={formData.mailing_method}
                />
              </div>
            </div>
          )}

          {/* Step Content */}
          <div className={`flex-1 ${currentStep === 0 ? 'max-w-3xl mx-auto' : 'max-w-4xl'}`}>
            <div className="bg-card border rounded-lg p-6">
              {renderStep()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
