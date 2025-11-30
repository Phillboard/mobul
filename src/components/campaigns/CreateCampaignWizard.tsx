import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MailingMethodStep } from "./wizard/MailingMethodStep";
import { CampaignSetupStep } from "./wizard/CampaignSetupStep";
import { AudiencesStep } from "./wizard/AudiencesStep";
import { CodesUploadStep } from "./wizard/CodesUploadStep";
import { UploadDesignStep } from "./wizard/UploadDesignStep";
import { ConditionsStep } from "./wizard/ConditionsStep";
import { LandingPageFormStep } from "./wizard/LandingPageFormStep";
import { DeliveryFulfillmentStep } from "./wizard/DeliveryFulfillmentStep";
import { SummaryStep } from "./wizard/SummaryStep";
import { StepIndicator } from "./wizard/StepIndicator";
import { WizardSidebar } from "./wizard/WizardSidebar";
import { DraftManager } from "./DraftManager";
import type { CampaignFormData, MailingMethod } from "@/types/campaigns";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function CreateCampaignWizard({
  open,
  onOpenChange,
  clientId,
}: CreateCampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: "",
    mailing_method: undefined,
    utm_source: "directmail",
    utm_medium: "postcard",
  });

  // Dynamic steps based on mailing method
  const isSelfMailer = formData.mailing_method === 'self';
  
  const steps = useMemo(() => {
    if (isSelfMailer) {
      // SIMPLIFIED flow for self-mailers (most common case per Mike's requirements)
      // Method → Setup → Audiences → Codes & Conditions → Review
      return [
        { label: "Method", description: "How you're mailing" },
        { label: "Setup", description: "Campaign name" },
        { label: "Audiences", description: "Select recipients" },
        { label: "Codes & Setup", description: "Codes, conditions, page" },
        { label: "Review", description: "Confirm & create" },
      ];
    }
    // Full flow for ACE fulfillment (rare case)
    // Method → Setup → Audiences → Design → Codes → Conditions → Delivery → Review
    return [
      { label: "Method", description: "How you're mailing" },
      { label: "Setup", description: "Campaign details" },
      { label: "Audiences", description: "Select recipients" },
      { label: "Design", description: "Upload mail design" },
      { label: "Codes", description: "Upload unique codes" },
      { label: "Conditions", description: "Rewards & page" },
      { label: "Delivery", description: "Mail settings" },
      { label: "Review", description: "Confirm & create" },
    ];
  }, [isSelfMailer]);

  const totalSteps = steps.length;

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!open || currentStep === totalSteps) return;

    const interval = setInterval(() => {
      if (Object.keys(formData).length > 3) {
        saveDraftMutation.mutate();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [open, formData, currentStep]);

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.functions.invoke("save-campaign-draft", {
        body: {
          draftId: currentDraftId,
          clientId,
          draftName: formData.name || "Untitled Draft",
          formData,
          currentStep,
        },
      });
      return data;
    },
    onSuccess: (data) => {
      if (data?.draft?.id && !currentDraftId) {
        setCurrentDraftId(data.draft.id);
      }
    },
  });

  const handleNext = (data: Partial<CampaignFormData>) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleLoadDraft = (draft: any) => {
    setFormData(draft.formData);
    setCurrentStep(draft.step);
    setCurrentDraftId(draft.draftId);
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCurrentDraftId(null);
    setFormData({
      name: "",
      mailing_method: undefined,
      utm_source: "directmail",
      utm_medium: "postcard",
    });
    onOpenChange(false);
  };

  const handleMailingMethodSelect = (method: MailingMethod) => {
    setFormData({ ...formData, mailing_method: method });
  };

  const handleMailingMethodNext = () => {
    setCurrentStep(1);
  };

  const handleStepClick = (targetStep: number) => {
    // Only allow going back to completed steps
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
    }
  };

  // Calculate which logical step we're on based on mailing method
  const renderStep = () => {
    // Step 0: Always mailing method
    if (currentStep === 0) {
      return (
        <MailingMethodStep
          selectedMethod={formData.mailing_method || null}
          onSelect={handleMailingMethodSelect}
          onNext={handleMailingMethodNext}
          onCancel={handleClose}
        />
      );
    }

    if (isSelfMailer) {
      // Self-mailer flow: Method → Setup → Audiences → Codes & Conditions → Review
      switch (currentStep) {
        case 1:
          return (
            <CampaignSetupStep
              clientId={clientId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
              mailingMethod={formData.mailing_method}
            />
          );
        case 2:
          return (
            <AudiencesStep
              clientId={clientId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 3:
          return (
            <CodesUploadStep
              clientId={clientId}
              campaignId={campaignId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 4:
          return (
            <ConditionsStep
              clientId={clientId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 5:
          return (
            <SummaryStep
              formData={formData}
              clientId={clientId}
              recipientCount={formData.recipient_count || 0}
              onBack={handleBack}
              onConfirm={handleClose}
            />
          );
        default:
          return null;
      }
    } else {
      // ACE fulfillment flow: Method → Setup → Audiences → Design → Codes → Conditions → Delivery → Review
      switch (currentStep) {
        case 1:
          return (
            <CampaignSetupStep
              clientId={clientId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
              mailingMethod={formData.mailing_method}
            />
          );
        case 2:
          return (
            <AudiencesStep
              clientId={clientId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 3:
          return (
            <UploadDesignStep
              clientId={clientId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 4:
          return (
            <CodesUploadStep
              clientId={clientId}
              campaignId={campaignId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 5:
          return (
            <ConditionsStep
              clientId={clientId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 6:
          return (
            <LandingPageFormStep
              clientId={clientId}
              campaignId={campaignId}
              initialData={formData}
              onNext={handleNext}
              onBack={handleBack}
              designImageUrl={(formData as any).design_image_url}
            />
          );
        case 7:
          return (
            <DeliveryFulfillmentStep
              clientId={clientId}
              initialData={formData}
              recipientCount={formData.recipient_count || 0}
              onNext={handleNext}
              onBack={handleBack}
            />
          );
        case 8:
          return (
            <SummaryStep
              formData={formData}
              clientId={clientId}
              recipientCount={formData.recipient_count || 0}
              onBack={handleBack}
              onConfirm={handleClose}
            />
          );
        default:
          return null;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        <StepIndicator 
          currentStep={currentStep} 
          steps={steps}
          onStepClick={handleStepClick}
        />

        <div className="flex gap-6 flex-1 overflow-hidden">
          <div className="hidden lg:block w-56 flex-shrink-0">
            <WizardSidebar
              formData={formData}
              recipientCount={formData.recipient_count || 0}
              clientId={clientId}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {renderStep()}
          </div>
        </div>

        <div className="border-t pt-4">
          <DraftManager
            clientId={clientId}
            onLoadDraft={handleLoadDraft}
            currentFormData={formData}
            currentStep={currentStep}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
