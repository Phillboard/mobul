import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CampaignSetupStep } from "./wizard/CampaignSetupStep";
import { CodesUploadStep } from "./wizard/CodesUploadStep";
import { ConditionsStep } from "./wizard/ConditionsStep";
import { LandingPageSelectionStep } from "./wizard/LandingPageSelectionStep";
import { FormsSelectionStep } from "./wizard/FormsSelectionStep";
import { TrackingRewardsStep } from "./wizard/TrackingRewardsStep";
import { DeliveryFulfillmentStep } from "./wizard/DeliveryFulfillmentStep";
import { SummaryStep } from "./wizard/SummaryStep";
import { StepIndicator } from "./wizard/StepIndicator";
import { WizardSidebar } from "./wizard/WizardSidebar";
import { DraftManager } from "./DraftManager";
import type { CampaignFormData } from "@/types/campaigns";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: "",
    size: "4x6",
    postage: "standard",
    mail_date_mode: "asap",
    utm_source: "directmail",
    utm_medium: "postcard",
  });

  const steps = [
    { label: "Setup", description: "Campaign basics" },
    { label: "Codes", description: "Upload codes & contacts" },
    { label: "Conditions", description: "Set reward triggers" },
    { label: "Landing Page", description: "Select or create page" },
    { label: "Forms", description: "Link forms" },
    { label: "Delivery", description: "Mail settings" },
    { label: "Review", description: "Confirm & create" },
  ];

  const totalSteps = steps.length;

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!open || currentStep === totalSteps) return;

    const interval = setInterval(() => {
      if (Object.keys(formData).length > 5) {
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
    setCurrentStep(1);
    setCurrentDraftId(null);
    setFormData({
      name: "",
      size: "4x6",
      recipient_source: "list",
      postage: "standard",
      mail_date_mode: "asap",
      lp_mode: "bridge",
      utm_source: "directmail",
      utm_medium: "postcard",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} steps={steps} />

        <div className="flex gap-6 flex-1 overflow-hidden">
          <div className="hidden lg:block w-64 flex-shrink-0">
            <WizardSidebar
              formData={formData}
              recipientCount={0}
              clientId={clientId}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {currentStep === 1 && (
              <CampaignSetupStep
                clientId={clientId}
                initialData={formData}
                onNext={handleNext}
                onCancel={handleClose}
              />
            )}

            {currentStep === 2 && (
              <CodesUploadStep
                clientId={clientId}
                campaignId={campaignId}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <ConditionsStep
                clientId={clientId}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 4 && (
              <LandingPageSelectionStep
                clientId={clientId}
                campaignId={campaignId}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 5 && (
              <FormsSelectionStep
                clientId={clientId}
                campaignId={campaignId}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 6 && (
              <DeliveryFulfillmentStep
                clientId={clientId}
                initialData={formData}
                recipientCount={formData.recipient_count || 0}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 7 && (
              <SummaryStep
                formData={formData}
                clientId={clientId}
                recipientCount={formData.recipient_count || 0}
                onBack={handleBack}
                onConfirm={handleClose}
              />
            )}
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
