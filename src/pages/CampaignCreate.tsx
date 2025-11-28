import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { CreateCampaignWizard } from "@/components/campaigns/CreateCampaignWizard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const [wizardOpen, setWizardOpen] = useState(true);

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

  const handleWizardClose = () => {
    setWizardOpen(false);
    navigate("/campaigns");
  };

  return (
    <Layout>
      <CreateCampaignWizard 
        open={wizardOpen} 
        onOpenChange={handleWizardClose}
        clientId={currentClient.id} 
      />
    </Layout>
  );
}
