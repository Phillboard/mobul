import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CreateCampaignWizard } from "@/components/campaigns/CreateCampaignWizard";
import { CampaignsList } from "@/components/campaigns/CampaignsList";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Campaigns() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentClient } = useTenant();

  if (!currentClient) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a client to view campaigns
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Campaigns</h1>
            <p className="mt-1 text-muted-foreground text-sm md:text-base">
              Create, manage, and track your direct mail campaigns
            </p>
          </div>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 h-10 md:h-9"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        <Card>
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl">Your Campaigns</CardTitle>
                <CardDescription className="text-sm">
                  Manage and track your direct mail campaigns
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search campaigns..." 
                    className="pl-9 w-full h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 hidden sm:flex">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CampaignsList clientId={currentClient.id} searchQuery={searchQuery} />
          </CardContent>
        </Card>
      </div>

      <CreateCampaignWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        clientId={currentClient.id}
      />
    </Layout>
  );
}
