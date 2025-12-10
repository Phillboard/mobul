import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { AccountSettings } from "@/features/settings/components/AccountSettings";
import { GeneralSettings } from "@/features/settings/components/GeneralSettings";
import { PhoneNumbersSettings } from "@/features/settings/components/PhoneNumbersSettings";
import { SMSDeliveryLog } from "@/features/settings/components/SMSDeliveryLog";
import { ClientBrandingEditor } from "@/features/settings/components/ClientBrandingEditor";
import { CRMIntegrationTab } from "@/features/settings/components/CRMIntegrationTab";
import { ZapierIntegrationTab } from "@/features/settings/components/ZapierIntegrationTab";
import { APISettings } from "@/features/settings/components/APISettings";
import { MailProviderSettings } from "@/features/settings/components/MailProviderSettings";
import { InviteUserDialog } from "@/features/settings/components/InviteUserDialog";
import { PendingInvitations } from "@/features/settings/components/PendingInvitations";
import { SecuritySettings } from "@/features/settings/components/SecuritySettings";
import { BillingSettings } from "@/features/settings/components/BillingSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { ClaimPlatformAdmin } from "@/features/settings/components/ClaimPlatformAdmin";
import { ClientBrandingPreview } from "@/features/settings/components/ClientBrandingPreview";
import { PermissionGate } from "@core/auth/components/PermissionGate";
import { Edit } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export default function Settings() {
  const { currentClient } = useTenant();
  const { tab } = useParams();
  const navigate = useNavigate();
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  
  const activeTab = tab || "account";
  
  // Redirect to /settings/account if on base /settings
  useEffect(() => {
    if (!tab) {
      navigate("/settings/account", { replace: true });
    }
  }, [tab, navigate]);

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
      case "mail-provider":
        return <MailProviderSettings />;
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
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <Card>
          {renderTabContent(activeTab)}
        </Card>
      </div>

      <ClaimPlatformAdmin />
    </Layout>
  );
}
