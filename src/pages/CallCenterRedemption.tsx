import { useState } from "react";
import { Layout } from "@/shared/components/layout/Layout";
import { CallCenterRedemptionPanel } from "@/features/call-center/components/CallCenterRedemptionPanel";
import { ScriptPanel } from "@/features/call-center/components/ScriptPanel";
import { UnifiedSidebar } from "@/features/call-center/components/UnifiedSidebar";

type WorkflowStep = "code" | "contact" | "condition" | "complete";

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
      campaign: data.recipient.audiences?.campaigns?.[0] ? {
        name: data.recipient.audiences.campaigns[0].name
      } : undefined,
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Call Center Hub</h1>
          <p className="text-muted-foreground">Redeem gift cards and track customer interactions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Workflow Area (3/4 width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Scripts Panel */}
            <ScriptPanel
              clientId={clientId}
              campaignId={campaignId}
              currentStep={currentStep}
              recipientData={recipientData}
            />

            {/* Redemption Workflow */}
            <CallCenterRedemptionPanel onRecipientLoaded={handleRecipientLoaded} />
          </div>

          {/* Sidebar (1/4 width) */}
          <div className="lg:col-span-1">
            <UnifiedSidebar selectedPoolId={null} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
