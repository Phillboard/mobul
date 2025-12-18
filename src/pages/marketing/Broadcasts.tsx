/**
 * Broadcasts Page
 * 
 * List of all email/SMS broadcasts (was "Campaigns").
 * Focused view for one-time sends.
 */

import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MarketingCampaignList } from "@/features/marketing/components/MarketingCampaignList";

export default function Broadcasts() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Broadcasts</h1>
            <p className="text-muted-foreground">
              One-time email & SMS sends to your contacts
            </p>
          </div>
          <Button onClick={() => navigate('/marketing/broadcasts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Broadcast
          </Button>
        </div>

        <MarketingCampaignList />
      </div>
    </Layout>
  );
}
