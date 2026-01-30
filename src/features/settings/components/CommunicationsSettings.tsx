/**
 * CommunicationsSettings Component
 * 
 * Consolidated communications settings combining:
 * - Phone Numbers management
 * - Twilio configuration
 * - SMS Templates with A2P compliance enforcement
 */

import { useState, useEffect, useMemo } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { 
  Phone, MessageSquare, Settings, Check, X, Plus, AlertTriangle, 
  CheckCircle2, RefreshCw, Edit, FileText, Link2, RotateCcw, Info,
  ChevronDown, Save, Loader2
} from "lucide-react";
import { useTrackedNumbers, useUpdateTrackedNumber } from '@/features/settings/hooks';
import { useTwilioStatus, useRevalidateTwilio, useDisableTwilioConfig } from '@/features/settings/hooks/useTwilioConfig';
import { useClientSmsTemplates, useSaveClientSmsTemplates, useResetTemplateToDefault, type SmsTemplateData } from '@/features/settings/hooks/useClientSmsTemplates';
import { useTenant } from '@/contexts/TenantContext';
import { ProvisionNumberDialog } from "./ProvisionNumberDialog";
import { SmsUrlBuilder } from "./SmsUrlBuilder";
import { InlineComplianceStatus } from "./A2PComplianceIndicator";
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
import {
  validateSmsTemplate,
  checkSmsLength,
  SMS_TEMPLATE_TYPES,
  type SmsTemplateType,
} from '@/shared/utils/a2pValidation';

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
          <SmsTemplatesSection clientId={currentClient?.id || null} />
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

/**
 * SMS Templates Section Component
 * Manages client-level default SMS templates with A2P compliance enforcement
 * 
 * Only 3 template types:
 * 1. Opt-In Request - Sent to request consent (TCPA required)
 * 2. Opt-In Confirmation - Sent when user replies YES (can be disabled)
 * 3. Gift Card Delivery - Sent when gift card is provisioned
 */
function SmsTemplatesSection({ clientId }: { clientId: string | null }) {
  const { data: templates, isLoading, error } = useClientSmsTemplates(clientId);
  const saveTemplates = useSaveClientSmsTemplates();
  const resetTemplate = useResetTemplateToDefault();
  
  // Local state for editing
  const [editedTemplates, setEditedTemplates] = useState<Record<SmsTemplateType, SmsTemplateData> | null>(null);
  const [urlBuilderOpen, setUrlBuilderOpen] = useState(false);
  const [activeUrlBuilderTemplate, setActiveUrlBuilderTemplate] = useState<SmsTemplateType | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<SmsTemplateType>>(
    new Set(['opt_in_request', 'opt_in_confirmation', 'gift_card_delivery'])
  );

  // Initialize local state when templates load
  useEffect(() => {
    if (templates && !editedTemplates) {
      setEditedTemplates(templates);
    }
  }, [templates, editedTemplates]);

  // Check if any templates have been modified
  const hasChanges = useMemo(() => {
    if (!templates || !editedTemplates) return false;
    return Object.entries(editedTemplates).some(([type, edited]) => {
      const original = templates[type as SmsTemplateType];
      return edited.body !== original?.body || edited.enabled !== original?.enabled;
    });
  }, [templates, editedTemplates]);

  // Check if all enabled templates are valid
  const allValid = useMemo(() => {
    if (!editedTemplates) return true;
    return Object.values(editedTemplates).every(t => 
      !t.enabled || t.validation.isValid
    );
  }, [editedTemplates]);

  const handleTemplateChange = (type: SmsTemplateType, newBody: string) => {
    if (!editedTemplates) return;
    
    const validation = validateSmsTemplate(newBody, type);
    setEditedTemplates({
      ...editedTemplates,
      [type]: {
        ...editedTemplates[type],
        body: newBody,
        validation,
        isDefault: newBody === SMS_TEMPLATE_TYPES[type].defaultTemplate,
      },
    });
  };

  const handleToggleEnabled = (type: SmsTemplateType, enabled: boolean) => {
    if (!editedTemplates) return;
    
    setEditedTemplates({
      ...editedTemplates,
      [type]: {
        ...editedTemplates[type],
        enabled,
      },
    });
  };

  const handleResetToDefault = async (type: SmsTemplateType) => {
    if (!editedTemplates || !clientId) return;
    
    const template = editedTemplates[type];
    const defaultBody = SMS_TEMPLATE_TYPES[type].defaultTemplate;
    
    // If there's a saved custom template, delete it
    if (template.id) {
      await resetTemplate.mutateAsync({
        clientId,
        templateId: template.id,
        templateType: type,
      });
    }
    
    // Update local state
    const validation = validateSmsTemplate(defaultBody, type);
    setEditedTemplates({
      ...editedTemplates,
      [type]: {
        ...editedTemplates[type],
        id: undefined,
        body: defaultBody,
        validation,
        isDefault: true,
        enabled: true,
      },
    });
  };

  const handleSave = async () => {
    if (!clientId || !editedTemplates) return;
    
    await saveTemplates.mutateAsync({
      clientId,
      templates: editedTemplates,
    });
  };

  const openUrlBuilder = (type: SmsTemplateType) => {
    setActiveUrlBuilderTemplate(type);
    setUrlBuilderOpen(true);
  };

  const handleInsertLink = (url: string) => {
    if (!activeUrlBuilderTemplate || !editedTemplates) return;
    
    const current = editedTemplates[activeUrlBuilderTemplate].body;
    // Append the URL to the template (with space if needed)
    const newBody = current.endsWith(' ') ? current + url : `${current} ${url}`;
    
    handleTemplateChange(activeUrlBuilderTemplate, newBody.trim());
    setUrlBuilderOpen(false);
  };

  const toggleExpanded = (type: SmsTemplateType) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (!clientId) {
    return (
      <SettingsEmptyState
        icon={FileText}
        title="Select a Client"
        description="Please select a client to manage SMS templates."
      />
    );
  }

  // Show loading while query is in progress OR while editedTemplates is being initialized
  if (isLoading || (templates && !editedTemplates)) {
    return (
      <SettingsCard
        title="SMS Templates"
        description="Loading templates..."
        icon={FileText}
      >
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </SettingsCard>
    );
  }

  if (error || !templates || !editedTemplates) {
    return (
      <SettingsCard
        title="SMS Templates"
        description="Error loading templates"
        icon={FileText}
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load SMS templates. Please try again.
          </AlertDescription>
        </Alert>
      </SettingsCard>
    );
  }

  // Only show 3 template types in specific order
  const templateTypes: SmsTemplateType[] = ['opt_in_request', 'opt_in_confirmation', 'gift_card_delivery'];

  return (
    <>
      <SettingsCard
        title="SMS Templates (Client Defaults)"
        description="Configure the 3 SMS messages sent during the gift card workflow. Campaigns can override these."
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            {hasChanges && !allValid && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Fix compliance errors
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || !allValid || saveTemplates.isPending}
            >
              {saveTemplates.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Templates
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* A2P Compliance Notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>SMS Message Flow</AlertTitle>
            <AlertDescription>
              1. <strong>Opt-In Request</strong> is sent to get consent. 
              2. <strong>Opt-In Confirmation</strong> is sent when user replies YES (optional). 
              3. <strong>Gift Card Delivery</strong> is sent with the gift card code.
            </AlertDescription>
          </Alert>

          {/* Template Editors */}
          {templateTypes.map((type, index) => {
            const template = editedTemplates[type];
            const config = SMS_TEMPLATE_TYPES[type];
            
            // Skip if template not loaded yet
            if (!template || !config) {
              return null;
            }
            
            const lengthInfo = checkSmsLength(template.body || '');
            const isExpanded = expandedTemplates.has(type);
            const isModified = templates && (
              template.body !== templates[type]?.body || 
              template.enabled !== templates[type]?.enabled
            );
            const canBeDisabled = config.canBeDisabled === true;

            return (
              <Collapsible
                key={type}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(type)}
              >
                <Card className={!template.enabled ? 'opacity-60' : (!template.validation.isValid ? 'border-destructive' : '')}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronDown 
                            className={`h-4 w-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} 
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm font-medium">
                              {index + 1}.
                            </span>
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {config.label}
                                {!template.enabled && (
                                  <Badge variant="secondary" className="text-xs">
                                    Disabled
                                  </Badge>
                                )}
                                {isModified && template.enabled && (
                                  <Badge variant="outline" className="text-xs">
                                    Modified
                                  </Badge>
                                )}
                                {template.isDefault && !isModified && template.enabled && (
                                  <Badge variant="secondary" className="text-xs">
                                    System Default
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {config.description}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {template.enabled && template.validation.isValid ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Compliant
                            </Badge>
                          ) : template.enabled ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Not Compliant
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {/* Enable/Disable Toggle for opt_in_confirmation */}
                      {canBeDisabled && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <Label className="text-sm font-medium">Send confirmation when user opts in</Label>
                            <p className="text-xs text-muted-foreground">
                              Disable to skip sending a confirmation message when user replies YES
                            </p>
                          </div>
                          <Switch
                            checked={template.enabled}
                            onCheckedChange={(checked) => handleToggleEnabled(type, checked)}
                          />
                        </div>
                      )}

                      {/* Template Editor - only show if enabled or not optional */}
                      {(template.enabled || !canBeDisabled) && (
                        <>
                          <Textarea
                            value={template.body}
                            onChange={(e) => handleTemplateChange(type, e.target.value)}
                            rows={3}
                            className="font-mono text-sm"
                            placeholder={config.defaultTemplate}
                          />

                          {/* Compliance Status */}
                          <InlineComplianceStatus
                            validation={template.validation}
                            charCount={lengthInfo.length}
                            charLimit={lengthInfo.limit}
                            segments={lengthInfo.segments}
                          />

                          {/* Available Variables */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Variables:</span>
                            {config.variables.map((v) => (
                              <Tooltip key={v}>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-muted"
                                    onClick={() => {
                                      const newBody = template.body + (template.body.endsWith(' ') ? '' : ' ') + v;
                                      handleTemplateChange(type, newBody);
                                    }}
                                  >
                                    {v}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>Click to insert</TooltipContent>
                              </Tooltip>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              {type === 'gift_card_delivery' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openUrlBuilder(type)}
                                >
                                  <Link2 className="h-3 w-3 mr-1" />
                                  URL Builder
                                </Button>
                              )}
                              {(template.id || isModified) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResetToDefault(type)}
                                  disabled={resetTemplate.isPending}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Reset to Default
                                </Button>
                              )}
                            </div>

                            {/* Compliance Errors */}
                            {!template.validation.isValid && (
                              <div className="text-xs text-destructive">
                                {template.validation.errors[0]}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          {/* Footer Note */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Individual campaigns can override Opt-In Request and Gift Card Delivery messages.
          </p>
        </div>
      </SettingsCard>

      {/* URL Builder Dialog */}
      <SmsUrlBuilder
        open={urlBuilderOpen}
        onOpenChange={setUrlBuilderOpen}
        onInsertLink={handleInsertLink}
        clientId={clientId}
      />
    </>
  );
}

export default CommunicationsSettings;
