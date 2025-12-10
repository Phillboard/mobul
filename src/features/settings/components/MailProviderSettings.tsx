import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Separator } from "@/shared/components/ui/separator";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useMailProviderSettings, MailProviderSettings as MailProviderSettingsType, SettingsLevel } from '@/features/settings/hooks';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@core/services/supabase';
import { Mail, Webhook, Shield, Settings2, Info, Building2, Users } from "lucide-react";

export function MailProviderSettings() {
  const { settings, isLoading, saveSettings, isSaving } = useMailProviderSettings();
  const { hasRole } = useAuth();
  const { currentClient, currentOrg, organizations, clients } = useTenant();

  const isAgency = hasRole('agency_owner');
  const isAdmin = hasRole('admin');
  const isDirectClient = currentClient && !currentClient.org_id;

  // Admin-specific state
  const [settingsLevel, setSettingsLevel] = useState<SettingsLevel>('organization');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [formData, setFormData] = useState<Partial<MailProviderSettingsType>>({
    provider_type: 'postgrid',
    postgrid_enabled: true,
    postgrid_test_mode: true,
    custom_enabled: false,
    allow_clients_postgrid: true,
    allow_clients_custom: true,
    custom_auth_type: 'api_key',
  });

  // Fetch all organizations for admin (if needed)
  const { data: allOrganizations } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, type')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && organizations.length === 0,
  });

  // Fetch all clients for the selected org (if admin and client level selected)
  const { data: allClients } = useQuery({
    queryKey: ['all-clients', selectedOrgId],
    queryFn: async () => {
      const query = supabase
        .from('clients')
        .select('id, name, org_id')
        .order('name');
      
      if (selectedOrgId) {
        query.eq('org_id', selectedOrgId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && settingsLevel === 'client',
  });

  // Initialize selected IDs from current context
  useEffect(() => {
    if (isAdmin) {
      if (settings?.org_id) {
        setSettingsLevel('organization');
        setSelectedOrgId(settings.org_id);
      } else if (settings?.client_id) {
        setSettingsLevel('client');
        setSelectedClientId(settings.client_id);
      } else if (currentOrg?.id) {
        setSelectedOrgId(currentOrg.id);
      }
    }
  }, [settings, currentOrg, isAdmin]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate level-specific requirements
    if (isAdmin) {
      if (settingsLevel === 'organization' && !selectedOrgId) {
        alert('Please select an organization');
        return;
      }
      if (settingsLevel === 'client' && !selectedClientId) {
        alert('Please select a client');
        return;
      }
      
      saveSettings({
        data: formData,
        level: settingsLevel,
        targetOrgId: selectedOrgId,
        targetClientId: selectedClientId,
      });
    } else {
      // For non-admins, auto-detect level
      const level: SettingsLevel = currentClient?.id ? 'client' : 'organization';
      saveSettings({
        data: formData,
        level,
        targetOrgId: currentOrg?.id,
        targetClientId: currentClient?.id,
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading settings...</div>;
  }

  // Check what options are available based on agency settings
  const agencyAllowsPostgrid = isAgency || isDirectClient || isAdmin || settings?.allow_clients_postgrid !== false;
  const agencyAllowsCustom = isAgency || isDirectClient || isAdmin || settings?.allow_clients_custom !== false;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Mail Provider Configuration
          </CardTitle>
          <CardDescription>
            {isAgency || isAdmin
              ? "Configure how direct mail is fulfilled for your organization and control client options."
              : isDirectClient
              ? "Configure how your direct mail campaigns are fulfilled and sent."
              : "Choose your preferred mail fulfillment provider (options set by your agency)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Admin Level Selector */}
          {isAdmin && (
            <>
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Settings Level
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose whether these settings apply to an entire organization (agency) or a specific client.
                </p>
                
                <div className="space-y-4">
                  <RadioGroup
                    value={settingsLevel}
                    onValueChange={(value: SettingsLevel) => {
                      setSettingsLevel(value);
                      // Reset selections when changing level
                      if (value === 'organization') {
                        setSelectedClientId('');
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="organization" id="level-org" />
                      <Label htmlFor="level-org" className="font-normal cursor-pointer flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Organization (Agency) Level
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="client" id="level-client" />
                      <Label htmlFor="level-client" className="font-normal cursor-pointer flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Client Level
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Organization Selector */}
                  {settingsLevel === 'organization' && (
                    <div className="space-y-2">
                      <Label htmlFor="select-org">Select Organization</Label>
                      <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                        <SelectTrigger id="select-org">
                          <SelectValue placeholder="Choose an organization..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(allOrganizations || organizations).map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name} {org.type === 'agency' ? '(Agency)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedOrgId && (
                        <p className="text-xs text-muted-foreground">
                          Settings will apply to all clients under this organization unless they have their own client-level settings.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Client Selector */}
                  {settingsLevel === 'client' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="select-org-for-client">Organization (Optional)</Label>
                        <Select value={selectedOrgId || 'all'} onValueChange={(value) => {
                          setSelectedOrgId(value === 'all' ? '' : value);
                          setSelectedClientId(''); // Reset client selection
                        }}>
                          <SelectTrigger id="select-org-for-client">
                            <SelectValue placeholder="Filter by organization..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Organizations</SelectItem>
                            {(allOrganizations || organizations).map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="select-client">Select Client</Label>
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                          <SelectTrigger id="select-client">
                            <SelectValue placeholder="Choose a client..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(allClients || clients).map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedClientId && (
                          <p className="text-xs text-muted-foreground">
                            Settings will apply only to this specific client and override organization-level settings.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Agency Controls */}
          {(isAgency || isAdmin) && !currentClient && (
            <>
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Client Permissions
                </h3>
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-postgrid" className="cursor-pointer">
                      Allow clients to use PostGrid
                    </Label>
                    <Switch
                      id="allow-postgrid"
                      checked={formData.allow_clients_postgrid}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, allow_clients_postgrid: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-custom" className="cursor-pointer">
                      Allow clients to use custom mailhouse
                    </Label>
                    <Switch
                      id="allow-custom"
                      checked={formData.allow_clients_custom}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, allow_clients_custom: checked })
                      }
                    />
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Provider Selection */}
          <div className="space-y-4">
            <Label>Active Provider</Label>
            
            {!agencyAllowsPostgrid && !agencyAllowsCustom && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your agency has not enabled any mail providers. Please contact your agency administrator.
                </AlertDescription>
              </Alert>
            )}

            <RadioGroup
              value={formData.provider_type}
              onValueChange={(value: 'postgrid' | 'custom' | 'both') =>
                setFormData({ ...formData, provider_type: value })
              }
            >
              {agencyAllowsPostgrid && (
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="postgrid" id="postgrid" />
                  <div className="space-y-1">
                    <Label htmlFor="postgrid" className="font-normal cursor-pointer">
                      PostGrid (Platform Default)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use PostGrid's API for automated mail fulfillment with tracking and delivery confirmation.
                    </p>
                  </div>
                </div>
              )}

              {agencyAllowsCustom && (
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="custom" id="custom" />
                  <div className="space-y-1">
                    <Label htmlFor="custom" className="font-normal cursor-pointer">
                      Custom Mailhouse Integration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Connect to your existing mailhouse software via API webhook.
                    </p>
                  </div>
                </div>
              )}

              {agencyAllowsPostgrid && agencyAllowsCustom && (isAgency || isDirectClient || isAdmin) && (
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="both" id="both" />
                  <div className="space-y-1">
                    <Label htmlFor="both" className="font-normal cursor-pointer">
                      Both (Choose per campaign)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable both options and select provider at campaign submission.
                    </p>
                  </div>
                </div>
              )}
            </RadioGroup>
          </div>

          <Separator />

          {/* PostGrid Configuration */}
          {(formData.provider_type === 'postgrid' || formData.provider_type === 'both') && agencyAllowsPostgrid && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                PostGrid Configuration
              </h3>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="postgrid-enabled" className="cursor-pointer">
                    Enable PostGrid
                  </Label>
                  <Switch
                    id="postgrid-enabled"
                    checked={formData.postgrid_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, postgrid_enabled: checked })
                    }
                  />
                </div>

                {formData.postgrid_enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="postgrid-test" className="cursor-pointer">
                        Test Mode
                      </Label>
                      <Switch
                        id="postgrid-test"
                        checked={formData.postgrid_test_mode}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, postgrid_test_mode: checked })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postgrid-key">API Key Secret Name</Label>
                      <Input
                        id="postgrid-key"
                        placeholder="POSTGRID_API_KEY"
                        value={formData.postgrid_api_key_name || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, postgrid_api_key_name: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Reference to the secret name stored in Supabase secrets
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Custom Mailhouse Configuration */}
          {(formData.provider_type === 'custom' || formData.provider_type === 'both') && agencyAllowsCustom && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Custom Mailhouse Configuration
                </h3>
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="custom-enabled" className="cursor-pointer">
                      Enable Custom Integration
                    </Label>
                    <Switch
                      id="custom-enabled"
                      checked={formData.custom_enabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, custom_enabled: checked })
                      }
                    />
                  </div>

                  {formData.custom_enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="custom-name">Provider Name</Label>
                        <Input
                          id="custom-name"
                          placeholder="My Print Shop"
                          value={formData.custom_provider_name || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, custom_provider_name: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="custom-webhook">Webhook URL</Label>
                        <Input
                          id="custom-webhook"
                          type="url"
                          placeholder="https://api.myprintshop.com/webhook"
                          value={formData.custom_webhook_url || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, custom_webhook_url: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="auth-type">Authentication Type</Label>
                        <Select
                          value={formData.custom_auth_type || 'api_key'}
                          onValueChange={(value: any) =>
                            setFormData({ ...formData, custom_auth_type: value })
                          }
                        >
                          <SelectTrigger id="auth-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="api_key">API Key</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="custom_header">Custom Header</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.custom_auth_type === 'custom_header' && (
                        <div className="space-y-2">
                          <Label htmlFor="auth-header">Header Name</Label>
                          <Input
                            id="auth-header"
                            placeholder="X-API-Key"
                            value={formData.custom_auth_header_name || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, custom_auth_header_name: e.target.value })
                            }
                          />
                        </div>
                      )}

                      {formData.custom_auth_type !== 'none' && (
                        <div className="space-y-2">
                          <Label htmlFor="custom-secret">Secret Name</Label>
                          <Input
                            id="custom-secret"
                            placeholder="MAILHOUSE_API_KEY"
                            value={formData.custom_webhook_secret_name || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, custom_webhook_secret_name: e.target.value })
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Reference to the secret name stored in Supabase secrets
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
