/**
 * ConditionsStep - Set up reward triggers and SMS message templates
 * 
 * Per Mike's requirements:
 * - Default condition name: "Listened to sales call"
 * - Default trigger: manual_agent (agent marks it complete)
 * - Predefined conditions only (no custom free-form input)
 * - SMS opt-in and delivery message customization
 */

import { useState } from "react";
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
import { Plus, Trash2, GripVertical, AlertCircle, CheckCircle, AlertTriangle, Gift, MessageSquare, ChevronDown, Info } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from '@shared/hooks';
import type { CampaignFormData } from "@/types/campaigns";
import { SimpleBrandDenominationSelector } from "@/features/gift-cards/components/SimpleBrandDenominationSelector";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

// Default SMS message templates (compliance-friendly)
const DEFAULT_OPT_IN_MESSAGE = "To send your activation code, we'll text you a link and a few related messages over the next 30 days from {company}. Msg & data rates may apply. Reply STOP to stop at any time.";
const DEFAULT_DELIVERY_MESSAGE = "Hi {first_name}! Here's your ${value} {provider} gift card from {company}: {link}";

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

  // SMS Settings state
  const [smsSettingsOpen, setSmsSettingsOpen] = useState(true);
  const [smsOptInMessage, setSmsOptInMessage] = useState(
    initialData.sms_opt_in_message || DEFAULT_OPT_IN_MESSAGE
  );

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

    onNext({ 
      conditions,
      sms_opt_in_message: smsOptInMessage,
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
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Opt-In Message (Consent Request)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>This message is sent when the agent requests SMS consent. It must include company name, message frequency, and opt-out instructions for compliance.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  value={smsOptInMessage}
                  onChange={(e) => setSmsOptInMessage(e.target.value)}
                  rows={3}
                  placeholder={DEFAULT_OPT_IN_MESSAGE}
                  className="font-mono text-sm"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Variables: {"{company}"}, {"{client_name}"}</span>
                  <span className={smsOptInMessage.length > 160 ? "text-amber-500" : ""}>
                    {smsOptInMessage.length}/160 characters {smsOptInMessage.length > 160 && "(may split into multiple SMS)"}
                  </span>
                </div>
                {smsOptInMessage !== DEFAULT_OPT_IN_MESSAGE && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSmsOptInMessage(DEFAULT_OPT_IN_MESSAGE)}
                    className="text-xs"
                  >
                    Reset to default
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  <strong>Gift Card Delivery Messages</strong> are configured per condition below. Each condition can have its own custom message.
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
                            <SimpleBrandDenominationSelector
                              clientId={clientId}
                              value={condition.brand_id && condition.card_value ? {
                                brandId: condition.brand_id,
                                denomination: condition.card_value
                              } : null}
                              onChange={(selection) =>
                                handleUpdateCondition(condition.id, {
                                  brand_id: selection.brandId,
                                  card_value: selection.denomination,
                                  brand_name: selection.brandName,
                                })
                              }
                              showAvailability={true}
                            />
                          </div>

                          {/* SMS Template */}
                          <div className="space-y-2">
                            <Label>Gift Card Delivery Message</Label>
                            <Textarea
                              value={condition.sms_template}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, {
                                  sms_template: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder={DEFAULT_DELIVERY_MESSAGE}
                              className="font-mono text-sm"
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Variables: {"{first_name}"}, {"{last_name}"}, {"{value}"}, {"{provider}"}, {"{company}"}, {"{link}"}</span>
                              <span className={condition.sms_template.length > 160 ? "text-amber-500" : ""}>
                                {condition.sms_template.length}/160
                              </span>
                            </div>
                          </div>
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
