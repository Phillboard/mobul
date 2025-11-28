import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CampaignSetupStep } from "@/components/campaigns/wizard/CampaignSetupStep";
import { CodesUploadStep } from "@/components/campaigns/wizard/CodesUploadStep";
import { ConditionsStep } from "@/components/campaigns/wizard/ConditionsStep";
import { LandingPageSelectionStep } from "@/components/campaigns/wizard/LandingPageSelectionStep";
import { FormsSelectionStep } from "@/components/campaigns/wizard/FormsSelectionStep";
import { DeliveryFulfillmentStep } from "@/components/campaigns/wizard/DeliveryFulfillmentStep";
import { SummaryStep } from "@/components/campaigns/wizard/SummaryStep";
import { StepIndicator } from "@/components/campaigns/wizard/StepIndicator";
import { WizardSidebar } from "@/components/campaigns/wizard/WizardSidebar";
import type { CampaignFormData } from "@/types/campaigns";

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const [currentStep, setCurrentStep] = useState(1);
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

  if (!currentClient) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to create a campaign.
          </AlertDescription>
        </Alert>
      </div>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/campaigns")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <StepIndicator currentStep={currentStep} steps={steps} />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-8">
              <WizardSidebar
                formData={formData}
                recipientCount={formData.recipient_count || 0}
                clientId={currentClient.id}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 max-w-4xl">
            {currentStep === 1 && (
              <CampaignSetupStep
                clientId={currentClient.id}
                initialData={formData}
                onNext={handleNext}
                onCancel={handleClose}
              />
            )}

            {currentStep === 2 && (
              <CodesUploadStep
                clientId={currentClient.id}
                campaignId={campaignId}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <ConditionsStep
                clientId={currentClient.id}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 4 && (
              <LandingPageSelectionStep
                clientId={currentClient.id}
                campaignId={campaignId}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 5 && (
              <FormsSelectionStep
                clientId={currentClient.id}
                campaignId={campaignId}
                initialData={formData}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 6 && (
              <DeliveryFulfillmentStep
                clientId={currentClient.id}
                initialData={formData}
                recipientCount={formData.recipient_count || 0}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 7 && (
              <SummaryStep
                formData={formData}
                clientId={currentClient.id}
                recipientCount={formData.recipient_count || 0}
                onBack={handleBack}
                onConfirm={handleClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
