import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/layout/Layout";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { PhoneNumbersSettings } from "@/components/settings/PhoneNumbersSettings";
import { SMSDeliveryLog } from "@/components/settings/SMSDeliveryLog";
import { ClientBrandingEditor } from "@/components/settings/ClientBrandingEditor";
import { CRMIntegrationTab } from "@/components/settings/CRMIntegrationTab";
import { ZapierIntegrationTab } from "@/components/settings/ZapierIntegrationTab";
import { APISettings } from "@/components/settings/APISettings";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { PendingInvitations } from "@/components/settings/PendingInvitations";
import { PermissionTemplateSelector } from "@/components/settings/PermissionTemplateSelector";
import { PermissionCategoryManager } from "@/components/settings/PermissionCategoryManager";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { settingsTabs, settingsGroups } from "@/lib/settingsConfig";
import { useSettingsTabs } from "@/hooks/useSettingsTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/contexts/TenantContext";
import { ClaimPlatformAdmin } from "@/components/settings/ClaimPlatformAdmin";
import { ClientBrandingPreview } from "@/components/settings/ClientBrandingPreview";
import { PermissionGate } from "@/components/PermissionGate";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { currentClient } = useTenant();
  const [activeTab, setActiveTab] = useState("account");
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const visibleTabs = useSettingsTabs();

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case "account":
        return <AccountSettings />;
      case "general":
        return <GeneralSettings />;
      case "phone":
        return <PhoneNumbersSettings />;
      case "sms":
        return <SMSDeliveryLog />;
      case "branding":
        return currentClient ? (
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
                    onSaved={() => setIsEditingBranding(false)}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingBranding(true)}
                    >
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
        ) : null;
      case "crm":
        return <CRMIntegrationTab />;
      case "zapier":
        return <ZapierIntegrationTab />;
      case "api":
        return <APISettings />;
      case "users":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                <p className="text-muted-foreground">Invite and manage team members</p>
              </div>
              <InviteUserDialog />
            </div>
            <PendingInvitations />
          </div>
        );
      case "security":
        return <SecuritySettings />;
      case "billing":
        return <BillingSettings />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account, organization, and integrations
          </p>
        </div>

        <ClaimPlatformAdmin />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="space-y-8">
            {settingsGroups.map((group) => {
              const groupTabs = visibleTabs.filter(tab => 
                settingsTabs.find(t => t.id === tab.id)?.group === group.id
              );

              if (groupTabs.length === 0) return null;

              return (
                <div key={group.id}>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">{group.label}</h2>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                  
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${groupTabs.length}, minmax(0, 1fr))` }}>
                    {groupTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="flex items-center gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              );
            })}
          </div>

          <Card>
            <CardContent className="pt-6">
              {visibleTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  {renderTabContent(tab.id)}
                </TabsContent>
              ))}
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </Layout>
  );
}
