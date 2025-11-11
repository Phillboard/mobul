import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CampaignDetailsStep } from "./wizard/CampaignDetailsStep";
import { PURLSettingsStep } from "./wizard/PURLSettingsStep";
import { SummaryStep } from "./wizard/SummaryStep";
import { Progress } from "@/components/ui/progress";
import { DraftManager } from "./DraftManager";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CreateCampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export interface CampaignFormData {
  // Step 1
  name: string;
  template_id: string | null;
  size: "4x6" | "6x9" | "6x11" | "letter" | "trifold";
  audience_id: string | null;
  postage: "first_class" | "standard";
  mail_date_mode: "asap" | "scheduled";
  mail_date: Date | null;
  
  // Step 2
  lp_mode: "bridge" | "redirect";
  base_lp_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

export function CreateCampaignWizard({
  open,
  onOpenChange,
  clientId,
}: CreateCampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    postage: "standard",
    mail_date_mode: "asap",
    lp_mode: "bridge",
    utm_source: "directmail",
    utm_medium: "postcard",
  });

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                Create Campaign - Step {currentStep} of {totalSteps}
              </DialogTitle>
              <DialogDescription>
                {currentStep === 1 && "Set up campaign details and mailing information"}
                {currentStep === 2 && "Configure personalized URLs and tracking"}
                {currentStep === 3 && "Review and confirm campaign details"}
              </DialogDescription>
            </div>
            {currentStep < totalSteps && (
              <DraftManager
                clientId={clientId}
                onLoadDraft={handleLoadDraft}
                currentFormData={formData}
                currentStep={currentStep}
              />
            )}
          </div>
        </DialogHeader>

        <Progress value={progress} className="mb-4" />

        {currentStep === 1 && (
          <CampaignDetailsStep
            clientId={clientId}
            initialData={formData}
            onNext={handleNext}
            onCancel={handleClose}
          />
        )}

        {currentStep === 2 && (
          <PURLSettingsStep
            clientId={clientId}
            formData={formData}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}

        {currentStep === 3 && (
          <SummaryStep
            formData={formData}
            onBack={handleBack}
            onConfirm={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
