import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Palette, Building2, Edit } from "lucide-react";
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
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { APISettings } from "@/components/settings/APISettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { ClientBrandingEditor } from "@/components/settings/ClientBrandingEditor";
import { ClientBrandingPreview } from "@/components/settings/ClientBrandingPreview";
import { PermissionGate } from "@/components/PermissionGate";
import { useState } from "react";

export default function Settings() {
  const { currentClient } = useTenant();
  const { roles } = useAuth();
  const visibleTabs = useSettingsTabs();
  const navigate = useNavigate();
  const [isEditingBranding, setIsEditingBranding] = useState(false);

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
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="phone" className="space-y-4">
            <PhoneNumbersSettings />
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <SMSDeliveryLog />
          </TabsContent>

          {currentClient && (
            <TabsContent value="branding" className="space-y-4">
              <PermissionGate
                permission="clients.edit"
                fallback={
                  <Card>
                    <CardHeader>
                      <CardTitle>Client Branding</CardTitle>
                      <CardDescription>
                        {currentClient?.name}'s brand identity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ClientBrandingPreview client={currentClient} />
                      <p className="text-sm text-muted-foreground mt-6 pt-6 border-t">
                        Contact your administrator to request branding changes.
                      </p>
                    </CardContent>
                  </Card>
                }
              >
                {isEditingBranding ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Edit Client Branding</CardTitle>
                      <CardDescription>
                        Customize {currentClient?.name}'s brand identity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ClientBrandingEditor
                        client={currentClient}
                        onSaved={() => {
                          setIsEditingBranding(false);
                          window.location.reload();
                        }}
                        onCancel={() => setIsEditingBranding(false)}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Client Branding</CardTitle>
                          <CardDescription>
                            {currentClient?.name}'s brand identity
                          </CardDescription>
                        </div>
                        <Button onClick={() => setIsEditingBranding(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Branding
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ClientBrandingPreview client={currentClient} />
                    </CardContent>
                  </Card>
                )}
              </PermissionGate>
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
            <APISettings />
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
            <SecuritySettings />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <BillingSettings />
          </TabsContent>
        </Tabs>
        )}
      </div>
    </Layout>
  );
}
