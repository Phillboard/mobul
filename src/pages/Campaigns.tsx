import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CampaignsList } from "@/components/campaigns/CampaignsList";
import { useTenant } from "@/contexts/TenantContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Campaigns() {
  const navigate = useNavigate();
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
      <div className="space-y-4 md:space-y-6 pb-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Campaigns</h1>
            <p className="mt-1 text-muted-foreground text-sm md:text-base">
              Create, manage, and track your direct mail campaigns
            </p>
          </div>
          <Button 
            variant="neon"
            className="shrink-0 h-12 md:h-10 hidden sm:flex shadow-glow-cyan"
            onClick={() => navigate("/campaigns/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>

        <Card variant="glass" hover="glow">
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-lg md:text-xl font-bold tracking-tight">Your Campaigns</CardTitle>
                <CardDescription className="text-sm">
                  Manage and track your direct mail campaigns
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search campaigns..." 
                    className="pl-9 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon" className="h-12 w-12 md:h-10 md:w-10 shrink-0 hidden sm:flex hover:border-primary/50 hover:bg-primary/5 transition-all duration-200">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <CampaignsList clientId={currentClient.id} searchQuery={searchQuery} />
          </CardContent>
        </Card>
        
        {/* Floating Action Button for Mobile */}
        <Button 
          onClick={() => navigate("/campaigns/new")}
          size="icon"
          variant="neon"
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-glow-lg sm:hidden z-40 hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </Layout>
  );
}
