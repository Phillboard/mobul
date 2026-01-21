import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Phone, Settings, Check, X, Plus, AlertTriangle, CheckCircle2, RefreshCw, Edit } from "lucide-react";
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

export function PhoneNumbersSettings() {
  const { currentClient } = useTenant();
  const { data: numbers, isLoading, refetch } = useTrackedNumbers(currentClient?.id || null);
  const updateNumber = useUpdateTrackedNumber();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);
  const [showTwilioForm, setShowTwilioForm] = useState(false);
  const [editForm, setEditForm] = useState({
    forward_to_number: '',
    recording_enabled: true,
    friendly_name: '',
  });

  // Twilio status for client - only fetch when client is selected
  const {
    data: twilioStatus,
    isLoading: twilioLoading,
    error: twilioError,
    refetch: refetchTwilio,
  } = useTwilioStatus(currentClient?.id || null, 'client');
  
  const revalidate = useRevalidateTwilio();
  const disableTwilio = useDisableTwilioConfig();
  
  // Check if we have a valid client selected
  const hasClientSelected = !!currentClient?.id;

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
      refetch();
    } catch (error: any) {
      toast.error(`Failed to release number: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div>Loading phone numbers...</div>;
  }

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

  // Determine Twilio status type
  const statusType = twilioStatus
    ? getTwilioStatusType(twilioStatus.ownConfig, twilioStatus.activeConfig)
    : 'unavailable';

  return (
    <div className="space-y-6">
      {/* Twilio Account Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Twilio Account</CardTitle>
              <CardDescription>
                Configure your own Twilio account for SMS sending
              </CardDescription>
            </div>
            {hasClientSelected && twilioStatus && (
              <TwilioStatusBadge
                status={statusType}
                fallbackName={twilioStatus.activeConfig?.entityName}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* No client selected state */}
          {!hasClientSelected ? (
            <div className="p-4 rounded-lg border bg-muted/50 text-center">
              <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium text-muted-foreground">Select a client</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please select a client from the dropdown above to configure Twilio settings.
              </p>
            </div>
          ) : twilioLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : twilioError ? (
            // API error state - show neutral message, not alarming error
            <div className="space-y-4">
              <TwilioFallbackIndicator
                activeConfig={null}
                fallbackChain={[]}
              />
              
              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="font-medium mb-2">
                  Want to use your own Twilio account?
                </p>
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
                <Button onClick={() => setShowTwilioForm(true)}>
                  Set Up My Twilio Account
                </Button>
              </div>

              {showTwilioForm && (
                <div className="mt-4 pt-4 border-t">
                  <TwilioConfigForm
                    level="client"
                    entityId={currentClient?.id}
                    onSaveSuccess={() => {
                      setShowTwilioForm(false);
                      refetchTwilio();
                    }}
                    onCancel={() => setShowTwilioForm(false)}
                  />
                </div>
              )}
            </div>
          ) : twilioStatus?.ownConfig?.configured && twilioStatus.ownConfig.enabled ? (
            // Configured and enabled state
            <div className="space-y-4">
              {/* Error state */}
              {twilioStatus.ownConfig.lastError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Twilio Error - Using Fallback</AlertTitle>
                  <AlertDescription>
                    <p>Error: {twilioStatus.ownConfig.lastError}</p>
                    {twilioStatus.ownConfig.lastErrorAt && (
                      <p className="text-xs mt-1">
                        Occurred: {new Date(twilioStatus.ownConfig.lastErrorAt).toLocaleString()}
                      </p>
                    )}
                    <p className="mt-2">
                      Currently using {twilioStatus.activeConfig?.entityName} Twilio as fallback
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setShowTwilioForm(true)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Fix Configuration
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Validation needed state */}
              {twilioStatus.ownConfig.needsRevalidation && !twilioStatus.ownConfig.lastError && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Validation Needed</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>Your Twilio credentials need to be re-validated</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRevalidate}
                      disabled={revalidate.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${revalidate.isPending ? 'animate-spin' : ''}`} />
                      Re-validate Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success state (configured, validated, no errors) */}
              {twilioStatus.ownConfig.validated && !twilioStatus.ownConfig.lastError && !twilioStatus.ownConfig.needsRevalidation && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Your Twilio Account is Active
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-green-600 dark:text-green-400">
                      <div className="flex justify-between">
                        <span>Account:</span>
                        <span className="font-mono">****{twilioStatus.ownConfig.accountSidLast4}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span className="font-mono">{twilioStatus.ownConfig.phoneNumber}</span>
                      </div>
                      {twilioStatus.ownConfig.validatedAt && (
                        <div className="flex justify-between">
                          <span>Last Validated:</span>
                          <span>{new Date(twilioStatus.ownConfig.validatedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>This Month:</span>
                        <span>
                          {twilioStatus.ownConfig.currentMonthUsage} SMS sent
                          {twilioStatus.ownConfig.monthlyLimit && (
                            <span className="text-xs"> / {twilioStatus.ownConfig.monthlyLimit} limit</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowTwilioForm(true)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Configuration
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={handleDisableTwilio}
                        disabled={disableTwilio.isPending}
                      >
                        Disable and Use Agency Twilio
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Show form for editing */}
              {showTwilioForm && (
                <div className="mt-4 pt-4 border-t">
                  <TwilioConfigForm
                    level="client"
                    entityId={currentClient?.id}
                    initialData={twilioStatus.ownConfig}
                    onSaveSuccess={() => {
                      setShowTwilioForm(false);
                      refetchTwilio();
                    }}
                    onCancel={() => setShowTwilioForm(false)}
                  />
                </div>
              )}
            </div>
          ) : (
            // Not configured or disabled state
            <div className="space-y-4">
              <TwilioFallbackIndicator
                activeConfig={twilioStatus?.activeConfig}
                fallbackChain={twilioStatus?.fallbackChain || []}
              />
              
              <div className="p-4 rounded-lg border bg-muted/50">
                <p className="font-medium mb-2">
                  Want to use your own Twilio account?
                </p>
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
                <Button onClick={() => setShowTwilioForm(true)}>
                  Set Up My Twilio Account
                </Button>
              </div>

              {showTwilioForm && (
                <div className="mt-4 pt-4 border-t">
                  <TwilioConfigForm
                    level="client"
                    entityId={currentClient?.id}
                    initialData={twilioStatus?.ownConfig}
                    onSaveSuccess={() => {
                      setShowTwilioForm(false);
                      refetchTwilio();
                    }}
                    onCancel={() => setShowTwilioForm(false)}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Phone Numbers Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Phone Numbers</h2>
          <p className="text-muted-foreground">
            Manage tracked phone numbers for call tracking
          </p>
        </div>
        <Button onClick={() => setProvisionDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Provision Number
        </Button>
      </div>

      <div className="grid gap-4">
        {numbers?.map((number) => (
          <Card key={number.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{number.phone_number}</CardTitle>
                    <CardDescription>
                      {number.friendly_name || 'No name set'}
                    </CardDescription>
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
            
            {editingId === number.id && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`friendly-name-${number.id}`}>Friendly Name</Label>
                  <Input
                    id={`friendly-name-${number.id}`}
                    value={editForm.friendly_name}
                    onChange={(e) => setEditForm({ ...editForm, friendly_name: e.target.value })}
                    placeholder="e.g., Spring Campaign Line"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`forward-to-${number.id}`}>Forward Calls To</Label>
                  <Input
                    id={`forward-to-${number.id}`}
                    value={editForm.forward_to_number}
                    onChange={(e) => setEditForm({ ...editForm, forward_to_number: e.target.value })}
                    placeholder="+1234567890"
                  />
                  <p className="text-sm text-muted-foreground">
                    Phone number where calls should be forwarded
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`recording-${number.id}`}>Call Recording</Label>
                    <p className="text-sm text-muted-foreground">
                      Record all calls for quality and compliance
                    </p>
                  </div>
                  <Switch
                    id={`recording-${number.id}`}
                    checked={editForm.recording_enabled}
                    onCheckedChange={(checked) => 
                      setEditForm({ ...editForm, recording_enabled: checked })
                    }
                  />
                </div>
              </CardContent>
            )}

            {editingId !== number.id && (
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Forward To:</span>
                  <span className="font-medium">{number.forward_to_number || 'Not configured'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recording:</span>
                  <span className="font-medium">
                    {number.recording_enabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Cost:</span>
                  <span className="font-medium">${number.monthly_cost || '1.00'}</span>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {(!numbers || numbers.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No phone numbers yet. Numbers are automatically assigned when you create campaigns.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ProvisionNumberDialog
        open={provisionDialogOpen}
        onOpenChange={setProvisionDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
