/**
 * Marketing Campaign Create/Edit Page
 * 
 * Wizard for creating email/SMS marketing campaigns.
 */

import { useParams } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { CampaignBuilderWizard } from "@/features/marketing/components/CampaignBuilder/CampaignBuilderWizard";
import { useMarketingCampaign } from "@/features/marketing/hooks/useMarketingCampaigns";

export default function MarketingCampaignCreate() {
  const { id } = useParams();
  const isEdit = !!id;
  
  const { data: campaign, isLoading } = useMarketingCampaign(id);

  if (isEdit && isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12 text-muted-foreground">Loading campaign...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <CampaignBuilderWizard 
          campaign={isEdit ? campaign : undefined}
          isEdit={isEdit}
        />
      </div>
    </Layout>
  );
}
