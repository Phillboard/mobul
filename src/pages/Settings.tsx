import { useState } from "react";
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
import { Edit, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { currentClient } = useTenant();
  const [activeTab, setActiveTab] = useState("account");
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleTabs = useSettingsTabs();
  const isMobile = useIsMobile();

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

  const SettingsSidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="space-y-6 py-4">
      {settingsGroups.map((group) => {
        const groupTabs = visibleTabs.filter(tab => 
          settingsTabs.find(t => t.id === tab.id)?.group === group.id
        );

        if (groupTabs.length === 0) return null;

        return (
          <div key={group.id}>
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h3>
            </div>
            <div className="space-y-1">
              {groupTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (mobile) setMobileOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account, organization, and integrations
            </p>
          </div>
          {isMobile && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="py-6 px-4">
                  <h2 className="text-lg font-semibold mb-4">Settings Menu</h2>
                  <SettingsSidebar mobile />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        <ClaimPlatformAdmin />

        <div className="flex gap-6">
          {!isMobile && (
            <aside className="w-64 shrink-0">
              <div className="sticky top-4 border rounded-lg bg-card">
                <SettingsSidebar />
              </div>
            </aside>
          )}

          <main className="flex-1 min-w-0">
            <Card>
              <CardContent className="pt-6">
                {renderTabContent(activeTab)}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </Layout>
  );
}
