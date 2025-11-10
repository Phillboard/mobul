import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { AudienceImportTab } from "@/components/audiences/AudienceImportTab";
import { AudiencesListTab } from "@/components/audiences/AudiencesListTab";

export default function Audiences() {
  const { currentClient } = useTenant();
  const [activeTab, setActiveTab] = useState("import");

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audiences & Leads</h1>
          <p className="text-muted-foreground mt-2">
            Import contacts, buy targeted leads, and manage your mailing lists
          </p>
        </div>

        {!currentClient && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                Please select a client from the sidebar to manage audiences
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="audiences">Saved Audiences</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-6">
            <AudienceImportTab clientId={currentClient?.id || null} />
          </TabsContent>

          <TabsContent value="audiences" className="mt-6">
            <AudiencesListTab clientId={currentClient?.id || null} />
          </TabsContent>

          <TabsContent value="marketplace" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
                  <h3 className="text-lg font-semibold">Marketplace Coming Soon</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Purchase targeted leads filtered by industry and geography
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
