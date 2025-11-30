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
import { useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { currentClient } = useTenant();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: "",
    mailing_method: undefined,
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
