import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { AccountSettings } from "@/features/settings/components/AccountSettings";
import { CompanySettings } from "@/features/settings/components/CompanySettings";
import { CommunicationsSettings } from "@/features/settings/components/CommunicationsSettings";
import { IntegrationsSettings } from "@/features/settings/components/IntegrationsSettings";
import { TeamSettings } from "@/features/settings/components/TeamSettings";
import { BillingSettings } from "@/features/settings/components/BillingSettings";
// Legacy imports - kept for backward compatibility redirects
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { ClaimPlatformAdmin } from "@/features/settings/components/ClaimPlatformAdmin";
import { ClientBrandingPreview } from "@/features/settings/components/ClientBrandingPreview";
import { PermissionGate } from "@core/auth/components/PermissionGate";
import { Edit } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { legacyRouteRedirects } from '@core/config/settingsConfig';

export default function Settings() {
  const { currentClient } = useTenant();
  const { tab } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  
  const activeTab = tab || "account";
  
  // Handle legacy route redirects
  useEffect(() => {
    if (!tab) {
      navigate("/settings/account", { replace: true });
      return;
    }

    // Check for legacy routes that need redirecting
    const redirect = legacyRouteRedirects[tab];
    if (redirect) {
      if (redirect.startsWith('/')) {
        // External redirect (e.g., to /activity)
        navigate(redirect, { replace: true });
      } else if (redirect.includes('?')) {
        // Internal redirect with query params
        const [path, params] = redirect.split('?');
        navigate(`/settings/${path}?${params}`, { replace: true });
      } else {
        // Simple internal redirect
        navigate(`/settings/${redirect}`, { replace: true });
      }
    }
  }, [tab, navigate]);

  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      // ============================================
      // NEW CONSOLIDATED TABS (Week 4 structure)
      // ============================================
      case "account":
        return <AccountSettings />;
      case "company":
        return <CompanySettings />;
      case "communications":
        return <CommunicationsSettings />;
      case "integrations":
        return <IntegrationsSettings />;
      case "team":
        return <TeamSettings />;
      case "billing":
        return <BillingSettings />;

      // ============================================
      // LEGACY TABS (kept for backward compatibility)
      // These will redirect via useEffect, but render
      // if somehow accessed directly
      // ============================================
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
                <p className="text-muted-foreground">Platform-wide user management (Admin only)</p>
              </div>
              <InviteUserDialog />
            </div>
            <PendingInvitations />
          </div>
        );
      case "security":
        return <SecuritySettings />;
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
