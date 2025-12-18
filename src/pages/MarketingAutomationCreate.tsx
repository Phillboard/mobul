/**
 * Marketing Automation Create/Edit Page
 */

import { useParams } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { AutomationBuilder } from "@/features/marketing/components/AutomationBuilder/AutomationBuilder";
import { useMarketingAutomation } from "@/features/marketing/hooks/useMarketingAutomations";

export default function MarketingAutomationCreate() {
  const { id } = useParams();
  const isEdit = !!id;
  
  const { data: automation, isLoading } = useMarketingAutomation(id);

  if (isEdit && isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12 text-muted-foreground">Loading automation...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <AutomationBuilder 
          automation={isEdit ? automation : undefined}
          isEdit={isEdit}
        />
      </div>
    </Layout>
  );
}
