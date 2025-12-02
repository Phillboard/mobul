/**
 * ConditionsStep - Set up reward triggers
 * 
 * Per Mike's requirements:
 * - Default condition name: "Listened to sales call"
 * - Default trigger: manual_agent (agent marks it complete)
 * - Predefined conditions only (no custom free-form input)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, AlertCircle, CheckCircle, AlertTriangle, Gift } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import type { CampaignFormData } from "@/types/campaigns";
import { SimpleBrandDenominationSelector } from "@/components/gift-cards/SimpleBrandDenominationSelector";

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
        sms_template: "Hi {first_name}! Thanks for your time. Here's your ${value} {provider} gift card: {link}",
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
      sms_template: "Hi {first_name}! Your ${value} {provider} gift card: {link}",
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

    onNext({ conditions } as any);
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
                            <Label>Gift Card SMS Message</Label>
                            <Textarea
                              value={condition.sms_template}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, {
                                  sms_template: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder="Hi {first_name}! Your ${value} {provider} gift card: {link}"
                            />
                            <p className="text-xs text-muted-foreground">
                              Variables: {"{first_name}"}, {"{last_name}"}, {"{value}"}, {"{provider}"}, {"{link}"}
                            </p>
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
