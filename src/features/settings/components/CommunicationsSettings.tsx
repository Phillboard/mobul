/**
 * CommunicationsSettings Component
 * 
 * Consolidated communications settings combining:
 * - Phone Numbers management
 * - Twilio configuration
 * - SMS Templates (placeholder)
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Textarea } from "@/shared/components/ui/textarea";
import { 
  Phone, MessageSquare, Settings, Check, X, Plus, AlertTriangle, 
  CheckCircle2, RefreshCw, Edit, FileText
} from "lucide-react";
import { useTrackedNumbers, useUpdateTrackedNumber } from '@/features/settings/hooks';
import { useTwilioStatus, useRevalidateTwilio, useDisableTwilioConfig } from '@/features/settings/hooks/useTwilioConfig';
import { useTenant } from '@/contexts/TenantContext';
import { ProvisionNumberDialog } from "./ProvisionNumberDialog";
import { 
  TwilioConfigForm, 
  TwilioStatusBadge, 
  TwilioFallbackIndicator 
} from "./twilio";
import { getTwilioStatusType } from '@/features/settings/types/twilio';
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import {
  SettingsPageLayout,
  SettingsCard,
  SettingsEmptyState,
} from './ui';

export function CommunicationsSettings() {
  const { currentClient } = useTenant();
  const [activeTab, setActiveTab] = useState('phone-numbers');
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [showTwilioForm, setShowTwilioForm] = useState(false);

  // Phone numbers
  const { data: numbers, isLoading: numbersLoading, refetch: refetchNumbers } = useTrackedNumbers(currentClient?.id || null);
  const updateNumber = useUpdateTrackedNumber();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    forward_to_number: '',
    recording_enabled: true,
    friendly_name: '',
  });

  // Twilio
  const {
    data: twilioStatus,
    isLoading: twilioLoading,
    error: twilioError,
    refetch: refetchTwilio,
  } = useTwilioStatus(currentClient?.id || null, 'client');
  
  const revalidate = useRevalidateTwilio();
  const disableTwilio = useDisableTwilioConfig();

  const hasClientSelected = !!currentClient?.id;

  // Phone number handlers
  const handleEdit = (number: any) => {
    setEditingId(number.id);
    setEditForm({
      forward_to_number: number.forward_to_number || '',
      recording_enabled: number.recording_enabled !== false,
      friendly_name: number.friendly_name || '',
    });
  };

  const handleSave = async (id: string) => {
    await updateNumber.mutateAsync({ id, updates: editForm });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleRelease = async (phoneNumberId: string) => {
    if (!confirm('Are you sure you want to release this phone number? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('release-twilio-number', {
        body: { phoneNumberId },
      });

      if (error) throw error;
      
      toast.success('Phone number released successfully');
      refetchNumbers();
    } catch (error: any) {
      toast.error(`Failed to release number: ${error.message}`);
    }
  };

  // Twilio handlers
  const handleDisableTwilio = async () => {
    if (!currentClient?.id) return;
    
    if (!confirm('Are you sure you want to disable your Twilio account? SMS will fall back to your agency\'s Twilio.')) {
      return;
    }

    try {
      await disableTwilio.mutateAsync({
        level: 'client',
        entityId: currentClient.id,
      });
      toast.success('Twilio disabled. Now using agency fallback.');
      refetchTwilio();
    } catch (error: any) {
      toast.error(`Failed to disable Twilio: ${error.message}`);
    }
  };

  const handleRevalidate = async () => {
    if (!currentClient?.id) return;

    try {
      await revalidate.mutateAsync({
        level: 'client',
        entityId: currentClient.id,
      });
      toast.success('Twilio credentials revalidated successfully');
      refetchTwilio();
    } catch (error: any) {
      toast.error(`Revalidation failed: ${error.message}`);
    }
  };

  const statusType = twilioStatus
    ? getTwilioStatusType(twilioStatus.ownConfig, twilioStatus.activeConfig)
    : 'unavailable';

  if (!hasClientSelected) {
    return (
      <SettingsPageLayout title="Communications" description="Configure phone numbers and messaging">
        <SettingsEmptyState
          icon={Phone}
          title="Select a Client"
          description="Please select a client from the dropdown above to configure communication settings."
        />
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout 
      title="Communications" 
      description="Manage phone numbers, Twilio configuration, and message templates"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="phone-numbers">
            <Phone className="h-4 w-4 mr-2" />
            Phone Numbers
          </TabsTrigger>
          <TabsTrigger value="twilio">
            <MessageSquare className="h-4 w-4 mr-2" />
            Twilio Config
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Phone Numbers Tab */}
        <TabsContent value="phone-numbers" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Phone Numbers</h3>
              <p className="text-sm text-muted-foreground">Manage tracked phone numbers for call tracking</p>
            </div>
            <Button onClick={() => setProvisionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Provision Number
            </Button>
          </div>

          {numbersLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : numbers?.length === 0 ? (
            <SettingsEmptyState
              icon={Phone}
              title="No Phone Numbers"
              description="Numbers are automatically assigned when you create campaigns, or you can provision them manually."
              action={{ label: "Provision Number", onClick: () => setProvisionDialogOpen(true) }}
            />
          ) : (
            <div className="grid gap-4">
              {numbers?.map((number) => (
                <Card key={number.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">{number.phone_number}</CardTitle>
                          <CardDescription>{number.friendly_name || 'No name set'}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={number.status === 'assigned' ? 'default' : 'secondary'}>
                          {number.status}
                        </Badge>
                        {editingId === number.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleSave(number.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(number)}>
                              <Settings className="h-4 w-4" />
                            </Button>
                            {number.status !== 'released' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRelease(number.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Release
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {editingId === number.id ? (
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Friendly Name</Label>
                        <Input
                          value={editForm.friendly_name}
                          onChange={(e) => setEditForm({ ...editForm, friendly_name: e.target.value })}
                          placeholder="e.g., Spring Campaign Line"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Forward Calls To</Label>
                        <Input
                          value={editForm.forward_to_number}
                          onChange={(e) => setEditForm({ ...editForm, forward_to_number: e.target.value })}
                          placeholder="+1234567890"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Call Recording</Label>
                          <p className="text-sm text-muted-foreground">Record calls for quality and compliance</p>
                        </div>
                        <Switch
                          checked={editForm.recording_enabled}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, recording_enabled: checked })}
                        />
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="pt-2 text-sm text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Forward To:</span>
                        <span className="font-medium">{number.forward_to_number || 'Not configured'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recording:</span>
                        <span className="font-medium">{number.recording_enabled !== false ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Twilio Configuration Tab */}
        <TabsContent value="twilio" className="space-y-6">
          <SettingsCard
            title="Twilio Account"
            description="Configure your own Twilio account for SMS sending"
            icon={MessageSquare}
            actions={
              twilioStatus && (
                <TwilioStatusBadge
                  status={statusType}
                  fallbackName={twilioStatus.activeConfig?.entityName}
                />
              )
            }
          >
            {twilioLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : twilioError ? (
              <div className="space-y-4">
                <TwilioFallbackIndicator activeConfig={null} fallbackChain={[]} />
                <SetupTwilioPrompt onSetup={() => setShowTwilioForm(true)} />
                {showTwilioForm && (
                  <TwilioConfigForm
                    level="client"
                    entityId={currentClient?.id}
                    onSaveSuccess={() => { setShowTwilioForm(false); refetchTwilio(); }}
                    onCancel={() => setShowTwilioForm(false)}
                  />
                )}
              </div>
            ) : twilioStatus?.ownConfig?.configured && twilioStatus.ownConfig.enabled ? (
              <div className="space-y-4">
                {twilioStatus.ownConfig.lastError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Twilio Error - Using Fallback</AlertTitle>
                    <AlertDescription>
                      <p>Error: {twilioStatus.ownConfig.lastError}</p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowTwilioForm(true)}>
                        <Edit className="h-3 w-3 mr-1" /> Fix Configuration
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {twilioStatus.ownConfig.needsRevalidation && !twilioStatus.ownConfig.lastError && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Validation Needed</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Your Twilio credentials need to be re-validated</span>
                      <Button size="sm" variant="outline" onClick={handleRevalidate} disabled={revalidate.isPending}>
                        <RefreshCw className={`h-3 w-3 mr-1 ${revalidate.isPending ? 'animate-spin' : ''}`} />
                        Re-validate Now
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {twilioStatus.ownConfig.validated && !twilioStatus.ownConfig.lastError && !twilioStatus.ownConfig.needsRevalidation && (
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-300">Your Twilio Account is Active</p>
                      <div className="mt-2 space-y-1 text-sm text-green-600 dark:text-green-400">
                        <div className="flex justify-between">
                          <span>Account:</span>
                          <span className="font-mono">****{twilioStatus.ownConfig.accountSidLast4}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phone:</span>
                          <span className="font-mono">{twilioStatus.ownConfig.phoneNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Month:</span>
                          <span>{twilioStatus.ownConfig.currentMonthUsage} SMS sent</span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowTwilioForm(true)}>
                          <Edit className="h-3 w-3 mr-1" /> Edit Configuration
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-600 hover:text-orange-700"
                          onClick={handleDisableTwilio}
                          disabled={disableTwilio.isPending}
                        >
                          Disable and Use Agency Twilio
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {showTwilioForm && (
                  <TwilioConfigForm
                    level="client"
                    entityId={currentClient?.id}
                    initialData={twilioStatus.ownConfig}
                    onSaveSuccess={() => { setShowTwilioForm(false); refetchTwilio(); }}
                    onCancel={() => setShowTwilioForm(false)}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <TwilioFallbackIndicator
                  activeConfig={twilioStatus?.activeConfig}
                  fallbackChain={twilioStatus?.fallbackChain || []}
                />
                <SetupTwilioPrompt onSetup={() => setShowTwilioForm(true)} />
                {showTwilioForm && (
                  <TwilioConfigForm
                    level="client"
                    entityId={currentClient?.id}
                    initialData={twilioStatus?.ownConfig}
                    onSaveSuccess={() => { setShowTwilioForm(false); refetchTwilio(); }}
                    onCancel={() => setShowTwilioForm(false)}
                  />
                )}
              </div>
            )}
          </SettingsCard>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <SettingsCard
            title="SMS Templates"
            description="Customize message templates for gift card delivery and opt-in requests"
            icon={FileText}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Gift Card Delivery Template</Label>
                <Textarea 
                  placeholder="Hi {{first_name}}, your {{amount}} gift card is ready! Click here to claim: {{claim_url}}"
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{{first_name}}"}, {"{{last_name}}"}, {"{{amount}}"}, {"{{brand}}"}, {"{{claim_url}}"}, {"{{code}}"}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Opt-In Request Template</Label>
                <Textarea 
                  placeholder="Reply YES to receive promotional messages from {{company_name}}. Msg & data rates may apply."
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{{company_name}}"}, {"{{campaign_name}}"}
                </p>
              </div>

              <div className="flex justify-end">
                <Button>Save Templates</Button>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>
      </Tabs>

      <ProvisionNumberDialog
        open={provisionDialogOpen}
        onOpenChange={setProvisionDialogOpen}
        onSuccess={refetchNumbers}
      />
    </SettingsPageLayout>
  );
}

// Helper component for Twilio setup prompt
function SetupTwilioPrompt({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="p-4 rounded-lg border bg-muted/50">
      <p className="font-medium mb-2">Want to use your own Twilio account?</p>
      <ul className="text-sm text-muted-foreground space-y-1 mb-4">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Use your own phone number
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Manage your own billing
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Build your sender reputation
        </li>
      </ul>
      <Button onClick={onSetup}>Set Up My Twilio Account</Button>
    </div>
  );
}

export default CommunicationsSettings;
