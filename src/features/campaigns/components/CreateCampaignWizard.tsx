import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
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
import { WizardProgressIndicator } from "./wizard/WizardProgressIndicator";
import { DraftManager } from "./DraftManager";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import type { CampaignFormData, MailingMethod } from "@/types/campaigns";
import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useToast } from '@shared/hooks';

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
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampaignFormData>>({
    name: "",
    mailing_method: undefined,
    utm_source: "directmail",
    utm_medium: "postcard",
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
      const data = await callEdgeFunction<{ draft?: { id: string } }>(
        Endpoints.campaigns.saveDraft,
        {
          draftId: currentDraftId,
          clientId,
          draftName: formData.name || "Untitled Draft",
          formData,
          currentStep,
        }
      );
      return data;
    },
    onSuccess: (data) => {
      if (data?.draft?.id && !currentDraftId) {
        setCurrentDraftId(data.draft.id);
      }
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    },
  });

  // Track form changes
  useEffect(() => {
    if (Object.keys(formData).length > 3) {
      setHasUnsavedChanges(true);
    }
  }, [formData]);

  const handleNext = (data: Partial<CampaignFormData>) => {
    setFormData({ ...formData, ...data });
    setHasUnsavedChanges(true);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleLoadDraft = (draft: any) => {
    setFormData(draft.formData);
    setCurrentStep(draft.step);
    setCurrentDraftId(draft.draftId);
    setHasUnsavedChanges(false);
  };

  const handleSaveDraft = async () => {
    await saveDraftMutation.mutateAsync();
    setLastSavedAt(new Date());
    setHasUnsavedChanges(false);
    toast({
      title: "Draft Saved",
      description: "Your campaign progress has been saved",
    });
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowExitWarning(true);
      return;
    }
    closeWizard();
  };

  const closeWizard = () => {
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
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Create Campaign</DialogTitle>
              <div className="flex items-center gap-2">
                {lastSavedAt && (
                  <span className="text-xs text-muted-foreground">
                    Saved {lastSavedAt.toLocaleTimeString()}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isPending || !hasUnsavedChanges}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Progress Indicator */}
          <WizardProgressIndicator
            steps={steps}
            currentStep={currentStep}
            className="mb-4"
          />

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

    {/* Exit Warning Dialog */}
    <AlertDialog open={showExitWarning} onOpenChange={setShowExitWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes in your campaign. If you close now, your progress will be lost.
            Would you like to save as a draft first?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowExitWarning(false)}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => {
              closeWizard();
              setShowExitWarning(false);
            }}
          >
            Discard Changes
          </Button>
          <AlertDialogAction
            onClick={async () => {
              await handleSaveDraft();
              closeWizard();
              setShowExitWarning(false);
            }}
          >
            Save & Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
