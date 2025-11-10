import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CampaignDetailsStep } from "./wizard/CampaignDetailsStep";
import { PURLSettingsStep } from "./wizard/PURLSettingsStep";
import { Progress } from "@/components/ui/progress";

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
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    postage: "standard",
    mail_date_mode: "asap",
    lp_mode: "bridge",
    utm_source: "directmail",
    utm_medium: "postcard",
  });

  const totalSteps = 2;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = (data: Partial<CampaignFormData>) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    setCurrentStep(1);
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
          <DialogTitle>
            Create Campaign - Step {currentStep} of {totalSteps}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Set up campaign details and mailing information"}
            {currentStep === 2 && "Configure personalized URLs and tracking"}
          </DialogDescription>
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
            onComplete={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
