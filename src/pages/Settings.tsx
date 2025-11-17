import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Palette, Building2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { CRMIntegrationTab } from "@/components/settings/CRMIntegrationTab";
import { PhoneNumbersSettings } from "@/components/settings/PhoneNumbersSettings";
import { SMSDeliveryLog } from "@/components/settings/SMSDeliveryLog";
import { ClaimPlatformAdmin } from "@/components/settings/ClaimPlatformAdmin";
import { ZapierIntegrationTab } from "@/components/settings/ZapierIntegrationTab";

export default function Settings() {
  const { currentClient } = useTenant();

  const getIndustryLabel = (industry: string) => {
    const labels: Record<string, string> = {
      roofing: 'Roofing',
      rei: 'Real Estate Investment',
      auto_service: 'Auto Service',
      auto_warranty: 'Auto Warranty',
      auto_buyback: 'Auto Buy-Back'
    };
    return labels[industry] || industry;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your platform settings and preferences
          </p>
        </div>

        <ClaimPlatformAdmin />

        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="phone">Phone Numbers</TabsTrigger>
            <TabsTrigger value="sms">SMS Delivery</TabsTrigger>
            {currentClient && <TabsTrigger value="branding">Client Branding</TabsTrigger>}
            {currentClient && <TabsTrigger value="crm">CRM Integrations</TabsTrigger>}
            {currentClient && <TabsTrigger value="zapier">Zapier</TabsTrigger>}
            <TabsTrigger value="api">API Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Configuration</CardTitle>
                <CardDescription>
                  General platform settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  General settings coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phone" className="space-y-4">
            <PhoneNumbersSettings />
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <SMSDeliveryLog />
          </TabsContent>

          {currentClient && (
            <TabsContent value="branding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Client Branding Preview
                  </CardTitle>
                  <CardDescription>
                    View and manage {currentClient.name}'s brand identity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Client Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Client Name:</span>
                        <span className="font-medium">{currentClient.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Industry:</span>
                        <Badge variant="secondary">{getIndustryLabel(currentClient.industry)}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timezone:</span>
                        <span className="font-medium">{currentClient.timezone}</span>
                      </div>
                    </div>
                  </div>

                  {currentClient.logo_url && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">Logo</h3>
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <img 
                          src={currentClient.logo_url} 
                          alt={`${currentClient.name} logo`}
                          className="max-h-20 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium mb-3">Brand Colors</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {currentClient.brand_colors_json && Object.keys(currentClient.brand_colors_json).length > 0 ? (
                        Object.entries(currentClient.brand_colors_json).map(([name, color]: [string, any]) => (
                          <div key={name} className="space-y-2">
                            <div 
                              className="h-16 rounded-lg border"
                              style={{ backgroundColor: color }}
                            />
                            <p className="text-xs font-medium capitalize">{name}</p>
                            <p className="text-xs text-muted-foreground">{color}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground col-span-4">
                          No brand colors configured yet
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Contact your organization administrator to update branding settings.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {currentClient && (
            <TabsContent value="crm" className="space-y-4">
              <CRMIntegrationTab />
            </TabsContent>
          )}

          {currentClient && (
            <TabsContent value="zapier" className="space-y-4">
              <ZapierIntegrationTab />
            </TabsContent>
          )}

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Manage API keys and webhooks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  API settings coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
