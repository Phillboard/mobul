import { Layout } from "@/components/layout/Layout";
import { CampaignCreateForm } from "@/components/campaigns/create/CampaignCreateForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { currentClient } = useTenant();

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

  return (
    <Layout>
      <div className="container mx-auto py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/campaigns")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create New Campaign
            </h1>
            <p className="text-muted-foreground mt-2">
              Get your mail piece in front of the right people
            </p>
          </div>
        </div>

        {/* Main Content */}
        <CampaignCreateForm clientId={currentClient.id} />
      </div>
    </Layout>
  );
}
