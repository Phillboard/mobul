import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Palette, Building2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { CRMIntegrationTab } from "@/components/settings/CRMIntegrationTab";
import { PhoneNumbersSettings } from "@/components/settings/PhoneNumbersSettings";
import { SMSDeliveryLog } from "@/components/settings/SMSDeliveryLog";
import { ClaimPlatformAdmin } from "@/components/settings/ClaimPlatformAdmin";
import { ZapierIntegrationTab } from "@/components/settings/ZapierIntegrationTab";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { useSettingsTabs } from "@/hooks/useSettingsTabs";
import { roleDisplayNames, roleColors } from "@/lib/roleUtils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { currentClient } = useTenant();
  const { roles } = useAuth();
  const visibleTabs = useSettingsTabs();
  const navigate = useNavigate();

  // Get primary role for badge display
  const primaryRole = roles[0]?.role;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure your platform settings and preferences
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Role Badge */}
            {primaryRole && (
              <Badge className={roleColors[primaryRole]}>
                {roleDisplayNames[primaryRole]}
              </Badge>
            )}
            
            {/* Context Indicator */}
            {currentClient && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{currentClient.name}</span>
              </div>
            )}
          </div>
        </div>

        <ClaimPlatformAdmin />

        {visibleTabs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Palette className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Settings Available</h3>
              <p className="text-muted-foreground mb-4">
                You don't have permission to access any settings sections.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={visibleTabs[0]?.id || "account"} className="w-full">
            <TabsList>
              {visibleTabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="account" className="space-y-4">
              <AccountSettings />
            </TabsContent>

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

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/user-management')}>
                  Go to User Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Coming soon
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>
                  Coming soon
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </Layout>
  );
}
