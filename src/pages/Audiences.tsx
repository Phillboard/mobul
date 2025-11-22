import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AudienceImportTab } from "@/components/audiences/AudienceImportTab";
import { AudiencesListTab } from "@/components/audiences/AudiencesListTab";

export default function Audiences() {
  const [activeTab, setActiveTab] = useState("import");

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Audiences & Leads
          </h1>
          <p className="text-muted-foreground mt-2">
            Import contacts, buy targeted leads, and manage mailing lists
          </p>
        </div>

        <Card variant="glass">
          <CardContent className="p-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="import">Import</TabsTrigger>
                <TabsTrigger value="saved">Saved Audiences</TabsTrigger>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              </TabsList>

          <TabsContent value="import" className="mt-4">
            <AudienceImportTab />
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <AudiencesListTab />
          </TabsContent>

              <TabsContent value="marketplace" className="mt-4">
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Lead marketplace coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
