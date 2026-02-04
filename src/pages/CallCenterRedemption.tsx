import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { CallCenterRedemptionPanel } from "@/features/call-center/components/CallCenterRedemptionPanel";
import { ScriptPanel } from "@/features/call-center/components/ScriptPanel";
import { AgentRecentRedemptions } from "@/features/call-center/components/AgentRecentRedemptions";
import { Button } from "@/shared/components/ui/button";
import { Clock } from "lucide-react";

type WorkflowStep = "code" | "optin" | "condition" | "complete";

interface RecipientData {
  first_name?: string;
  last_name?: string;
  campaign?: {
    name?: string;
  };
  gift_card_value?: number;
}

export default function CallCenterRedemption() {
  const [clientId, setClientId] = useState<string | undefined>();
  const [campaignId, setCampaignId] = useState<string | undefined>();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("code");
  const [recipientData, setRecipientData] = useState<RecipientData | undefined>();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const handleRecipientLoaded = (data: {
    clientId?: string;
    campaignId?: string;
    recipient: any;
    step: WorkflowStep
  }) => {
    setClientId(data.clientId);
    setCampaignId(data.campaignId);
    setCurrentStep(data.step);
    setRecipientData({
      first_name: data.recipient.first_name,
      last_name: data.recipient.last_name,
      campaign: data.recipient.campaign ? {
        name: data.recipient.campaign.name
      } : data.recipient.audiences?.campaigns?.[0] ? {
        name: data.recipient.audiences.campaigns[0].name
      } : undefined,
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Call Center Hub</h1>
            <p className="text-muted-foreground">Redeem gift cards and track customer interactions</p>
          </div>
          {/* Mobile toggle for sidebar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="lg:hidden"
          >
            <Clock className="h-4 w-4 mr-1.5" />
            Activity
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0 max-w-4xl space-y-4">
            {/* Scripts Panel - collapses when empty */}
            <ScriptPanel
              clientId={clientId}
              campaignId={campaignId}
              currentStep={currentStep}
              recipientData={recipientData}
            />

            {/* Redemption Workflow */}
            <CallCenterRedemptionPanel onRecipientLoaded={handleRecipientLoaded} />
          </div>

          {/* Sidebar - open on desktop, toggle on mobile */}
          <div className={`w-80 shrink-0 ${showMobileSidebar ? 'block' : 'hidden'} lg:block`}>
            <div className="sticky top-6">
              <AgentRecentRedemptions />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
