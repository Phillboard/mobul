/**
 * ConditionsStep - Set up reward triggers and SMS message templates
 * 
 * Per Mike's requirements:
 * - Default condition name: "Listened to sales call"
 * - Default trigger: manual_agent (agent marks it complete)
 * - Predefined conditions only (no custom free-form input)
 * - SMS opt-in and delivery message customization
 * 
 * Template Hierarchy:
 * 1. Campaign-specific override (set here)
 * 2. Client default (from Settings > Communications)
 * 3. System default (hardcoded fallback)
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/components/ui/collapsible";
import { Plus, Trash2, GripVertical, AlertCircle, CheckCircle, AlertTriangle, Gift, MessageSquare, ChevronDown, Info, RotateCcw, Edit } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from '@shared/hooks';
import type { CampaignFormData } from "@/types/campaigns";
import { SimpleBrandDenominationSelector } from "@/features/gift-cards/components/SimpleBrandDenominationSelector";
import { GiftCardErrorBoundary } from "@/shared/components/ErrorBoundaries";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useClientSmsTemplates } from "@/features/settings/hooks/useClientSmsTemplates";
import { 
  validateSmsTemplate, 
  checkSmsLength,
  SMS_TEMPLATE_TYPES,
} from "@/shared/utils/a2pValidation";

// System default SMS message templates (compliance-friendly)
const DEFAULT_OPT_IN_MESSAGE = SMS_TEMPLATE_TYPES.opt_in_request.defaultTemplate;
const DEFAULT_DELIVERY_MESSAGE = SMS_TEMPLATE_TYPES.gift_card_delivery.defaultTemplate;

// Predefined trigger types - per Mike's requirements
const TRIGGER_TYPES = [
  { 
    value: "manual_agent" as const, 
    label: "Agent Accepted", 
    description: "Call center agent marks condition as met"
  },
  { 
    value: "call_completed" as const, 
    label: "Call Completed", 
    description: "Automatically triggers when call ends (via Twilio API)"
  },
  { 
    value: "form_submitted" as const, 
    label: "Form Submitted", 
    description: "Customer submits the landing page form"
  },
  { 
    value: "time_delay" as const, 
    label: "Time Delay", 
    description: "Automatic trigger after specified time"
  },
] as const;

type TriggerType = typeof TRIGGER_TYPES[number]['value'];

interface Condition {
  id: string;
  condition_number: number;
  condition_name: string;
  trigger_type: TriggerType;
  brand_id?: string; // Brand selection
  card_value?: number; // Denomination
  brand_name?: string; // Display name
  sms_template: string;
  is_active: boolean;
}

interface ConditionsStepProps {
  clientId: string;
  initialData: Partial<CampaignFormData>;
  onNext: (data: Partial<CampaignFormData>) => void;
  onBack: () => void;
}

export function ConditionsStep({ clientId, initialData, onNext, onBack }: ConditionsStepProps) {
  const { toast } = useToast();
  const recipientCount = initialData.recipient_count || 0;

  // Fetch client default templates
  const { data: clientTemplates, isLoading: templatesLoading } = useClientSmsTemplates(clientId);

  // Get effective default templates (client default or system default)
  const effectiveOptInDefault = useMemo(() => {
    return clientTemplates?.opt_in_request?.body || DEFAULT_OPT_IN_MESSAGE;
  }, [clientTemplates]);

  const effectiveDeliveryDefault = useMemo(() => {
    return clientTemplates?.gift_card_delivery?.body || DEFAULT_DELIVERY_MESSAGE;
  }, [clientTemplates]);

  // SMS Settings state
  const [smsSettingsOpen, setSmsSettingsOpen] = useState(true);
  const [optInCustomized, setOptInCustomized] = useState(
    Boolean(initialData.sms_opt_in_message && initialData.sms_opt_in_message !== effectiveOptInDefault)
  );
  const [smsOptInMessage, setSmsOptInMessage] = useState(
    initialData.sms_opt_in_message || ''
  );

  // A2P validation for opt-in message
  const optInValidation = useMemo(() => {
    const messageToValidate = optInCustomized ? smsOptInMessage : effectiveOptInDefault;
    return validateSmsTemplate(messageToValidate, 'opt_in_request');
  }, [optInCustomized, smsOptInMessage, effectiveOptInDefault]);

  const optInLength = useMemo(() => {
    const messageToCheck = optInCustomized ? smsOptInMessage : effectiveOptInDefault;
    return checkSmsLength(messageToCheck);
  }, [optInCustomized, smsOptInMessage, effectiveOptInDefault]);

  // Initialize conditions - default to "Listened to sales call" with manual_agent trigger
  const [conditions, setConditions] = useState<Condition[]>(() => {
    const existing = (initialData as any).conditions;
    if (existing && existing.length > 0) {
      return existing;
    }
    // Default condition per Mike's requirements
    return [
      {
        id: crypto.randomUUID(),
        condition_number: 1,
        condition_name: "Listened to sales call",
        trigger_type: "manual_agent" as TriggerType,
        sms_template: DEFAULT_DELIVERY_MESSAGE,
        is_active: true,
      },
    ];
  });

  // No longer need to fetch pools - SimpleBrandDenominationSelector handles brand/denomination selection
  // directly from client_available_gift_cards table

  const handleAddCondition = () => {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      condition_number: conditions.length + 1,
      condition_name: `Condition ${conditions.length + 1}`,
      trigger_type: "manual_agent",
      sms_template: DEFAULT_DELIVERY_MESSAGE,
      is_active: true,
    };
    setConditions([...conditions, newCondition]);
  };

  const handleRemoveCondition = (id: string) => {
    if (conditions.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one condition is required.",
        variant: "destructive",
      });
      return;
    }

    const newConditions = conditions
      .filter((c) => c.id !== id)
      .map((c, index) => ({ ...c, condition_number: index + 1 }));
    setConditions(newConditions);
  };

  const handleUpdateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(conditions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const renumbered = items.map((item, index) => ({
      ...item,
      condition_number: index + 1,
    }));

    setConditions(renumbered);
  };

  const handleNext = () => {
    const activeConditions = conditions.filter((c) => c.is_active);
    if (activeConditions.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one active condition is required.",
        variant: "destructive",
      });
      return;
    }

    // Check for missing gift cards (brand_id + card_value)
    const missingGiftCards = activeConditions.filter((c) => !c.brand_id || !c.card_value);
    if (missingGiftCards.length > 0) {
      toast({
        title: "Gift Card Required",
        description: "Please select a gift card reward for all active conditions.",
        variant: "destructive",
      });
      return;
    }

    const missingNames = activeConditions.filter((c) => !c.condition_name.trim());
    if (missingNames.length > 0) {
      toast({
        title: "Condition Name Required",
        description: "Please provide a name for all active conditions.",
        variant: "destructive",
      });
      return;
    }

    // A2P Validation check
    if (!optInValidation.isValid) {
      toast({
        title: "A2P Compliance Error",
        description: "The opt-in message does not meet A2P requirements. Please fix the compliance issues.",
        variant: "destructive",
      });
      return;
    }

    // Check condition SMS templates for A2P compliance
    for (const condition of activeConditions) {
      const deliveryValidation = validateSmsTemplate(
        condition.sms_template || effectiveDeliveryDefault,
        'gift_card_delivery'
      );
      if (!deliveryValidation.isValid) {
        toast({
          title: "A2P Compliance Error",
          description: `Condition "${condition.condition_name}" delivery message does not meet A2P requirements.`,
          variant: "destructive",
        });
        return;
      }
    }

    onNext({ 
      conditions,
      // Only save custom message if customized, otherwise null to use hierarchy
      sms_opt_in_message: optInCustomized ? smsOptInMessage : null,
    } as any);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reward Conditions</h2>
        <p className="text-muted-foreground mt-2">
          Set when customers earn their gift card rewards
        </p>
      </div>

      <Alert>
        <Gift className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> When a condition is met (e.g., customer listened to your sales call), 
          they receive their gift card via SMS automatically.
        </AlertDescription>
      </Alert>

      {/* SMS Message Templates */}
      <Collapsible open={smsSettingsOpen} onOpenChange={setSmsSettingsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">SMS Message Templates</CardTitle>
                    <CardDescription>Customize opt-in and delivery messages</CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${smsSettingsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Opt-In Message */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Opt-In Message (Consent Request)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>This message is sent when the agent requests SMS consent. It must include company name, message frequency, and opt-out instructions for A2P compliance.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {/* A2P Compliance Badge */}
                  {optInValidation.isValid ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      A2P Compliant
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Compliant
                    </Badge>
                  )}
                </div>

                {!optInCustomized ? (
                  // Show client default with option to customize
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {clientTemplates?.opt_in_request?.id ? 'Using Client Default' : 'Using System Default'}
                        </Badge>
                      </div>
                      <p className="text-sm font-mono text-muted-foreground">
                        {effectiveOptInDefault}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOptInCustomized(true);
                        setSmsOptInMessage(effectiveOptInDefault);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Customize for this Campaign
                    </Button>
                  </div>
                ) : (
                  // Custom editing mode
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs">
                      Campaign Override
                    </Badge>
                    <Textarea
                      value={smsOptInMessage}
                      onChange={(e) => setSmsOptInMessage(e.target.value)}
                      rows={3}
                      placeholder={effectiveOptInDefault}
                      className="font-mono text-sm"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>Variables: {"{company}"}, {"{client_name}"}</span>
                        {!optInValidation.isValid && (
                          <span className="text-destructive">
                            {optInValidation.errors[0]}
                          </span>
                        )}
                      </div>
                      <span className={optInLength.length > optInLength.limit ? "text-amber-500" : ""}>
                        {optInLength.length}/{optInLength.limit} chars
                        {optInLength.segments > 1 && ` (${optInLength.segments} SMS)`}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setOptInCustomized(false);
                        setSmsOptInMessage('');
                      }}
                      className="text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset to {clientTemplates?.opt_in_request?.id ? 'Client' : 'System'} Default
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  <strong>Gift Card Delivery Messages</strong> are configured per condition below. Each condition can have its own custom message, or use the client default.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="conditions">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {conditions.map((condition, index) => {
                return (
                  <Draggable key={condition.id} draggableId={condition.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${
                          snapshot.isDragging ? "shadow-lg" : ""
                        } ${!condition.is_active ? "opacity-60" : ""}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing pt-1"
                            >
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">
                                    Condition {condition.condition_number}
                                  </CardTitle>
                                  <Badge variant={condition.is_active ? "default" : "secondary"}>
                                    {condition.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={condition.is_active}
                                    onCheckedChange={(checked) =>
                                      handleUpdateCondition(condition.id, { is_active: checked })
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveCondition(condition.id)}
                                    disabled={conditions.length === 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Condition Name */}
                            <div className="space-y-2">
                              <Label>Condition Name</Label>
                              <Input
                                value={condition.condition_name}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    condition_name: e.target.value,
                                  })
                                }
                                placeholder="e.g., Listened to sales call"
                              />
                            </div>

                            {/* Trigger Type */}
                            <div className="space-y-2">
                              <Label>Trigger</Label>
                              <Select
                                value={condition.trigger_type}
                                onValueChange={(value: TriggerType) =>
                                  handleUpdateCondition(condition.id, { trigger_type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {TRIGGER_TYPES.find(t => t.value === condition.trigger_type)?.description}
                              </p>
                            </div>
                          </div>

                          {/* Gift Card Reward - New Simplified Selector */}
                          <div className="space-y-2">
                            <Label>Gift Card Reward *</Label>
                            <GiftCardErrorBoundary fallback={
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Unable to load gift card options. Please refresh and try again.
                                </AlertDescription>
                              </Alert>
                            }>
                              <SimpleBrandDenominationSelector
                                clientId={clientId}
                                value={condition.brand_id && condition.card_value ? {
                                  brand_id: condition.brand_id,
                                  card_value: condition.card_value,
                                  brand_name: condition.brand_name
                                } : null}
                                onChange={(selection) => {
                                  if (!selection) {
                                    handleUpdateCondition(condition.id, {
                                      brand_id: undefined,
                                      card_value: undefined,
                                      brand_name: undefined,
                                    });
                                  } else {
                                    handleUpdateCondition(condition.id, {
                                      brand_id: selection.brand_id,
                                      card_value: selection.card_value,
                                      brand_name: selection.brand_name,
                                    });
                                  }
                                }}
                                showAvailability={true}
                              />
                            </GiftCardErrorBoundary>
                          </div>

                          {/* SMS Template */}
                          <ConditionSmsTemplate
                            condition={condition}
                            effectiveDefault={effectiveDeliveryDefault}
                            clientHasCustomDefault={Boolean(clientTemplates?.gift_card_delivery?.id)}
                            onUpdate={(updates) => handleUpdateCondition(condition.id, updates)}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {conditions.length < 3 && (
        <Button onClick={handleAddCondition} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Condition
        </Button>
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Next: Customer Page</Button>
      </div>
    </div>
  );
}

/**
 * Helper component for condition-level SMS template with inheritance
 */
interface ConditionSmsTemplateProps {
  condition: Condition;
  effectiveDefault: string;
  clientHasCustomDefault: boolean;
  onUpdate: (updates: Partial<Condition>) => void;
}

function ConditionSmsTemplate({
  condition,
  effectiveDefault,
  clientHasCustomDefault,
  onUpdate,
}: ConditionSmsTemplateProps) {
  const [isCustomized, setIsCustomized] = useState(
    Boolean(condition.sms_template && condition.sms_template !== effectiveDefault)
  );

  const currentMessage = isCustomized ? condition.sms_template : effectiveDefault;
  const validation = useMemo(
    () => validateSmsTemplate(currentMessage, 'gift_card_delivery'),
    [currentMessage]
  );
  const lengthInfo = useMemo(() => checkSmsLength(currentMessage), [currentMessage]);

  const handleCustomize = () => {
    setIsCustomized(true);
    onUpdate({ sms_template: effectiveDefault });
  };

  const handleReset = () => {
    setIsCustomized(false);
    onUpdate({ sms_template: '' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Gift Card Delivery Message</Label>
        {validation.isValid ? (
          <Badge variant="default" className="bg-green-600 text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Compliant
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Not Compliant
          </Badge>
        )}
      </div>

      {!isCustomized ? (
        // Show default with option to customize
        <div className="space-y-2">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                {clientHasCustomDefault ? 'Using Client Default' : 'Using System Default'}
              </Badge>
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              {effectiveDefault}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCustomize}>
            <Edit className="h-3 w-3 mr-1" />
            Customize for this Condition
          </Button>
        </div>
      ) : (
        // Custom editing mode
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs">
            Condition Override
          </Badge>
          <Textarea
            value={condition.sms_template}
            onChange={(e) => onUpdate({ sms_template: e.target.value })}
            rows={2}
            placeholder={effectiveDefault}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Variables: {"{first_name}"}, {"{value}"}, {"{brand}"}, {"{company}"}, {"{link}"}</span>
              {!validation.isValid && (
                <span className="text-destructive">
                  {validation.errors[0]}
                </span>
              )}
            </div>
            <span className={lengthInfo.length > lengthInfo.limit ? "text-amber-500" : ""}>
              {lengthInfo.length}/{lengthInfo.limit}
              {lengthInfo.segments > 1 && ` (${lengthInfo.segments} SMS)`}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset to {clientHasCustomDefault ? 'Client' : 'System'} Default
          </Button>
        </div>
      )}
    </div>
  );
}
