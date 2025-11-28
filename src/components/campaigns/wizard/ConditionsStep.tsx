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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import type { CampaignFormData } from "@/types/campaigns";

interface Condition {
  id: string;
  condition_number: number;
  condition_name: string;
  trigger_type: "manual_agent" | "call_completed" | "form_submitted" | "time_delay";
  gift_card_pool_id: string;
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

  // Initialize conditions from initialData or create a default one
  const [conditions, setConditions] = useState<Condition[]>(() => {
    const existing = (initialData as any).conditions;
    if (existing && existing.length > 0) {
      return existing;
    }
    return [
      {
        id: crypto.randomUUID(),
        condition_number: 1,
        condition_name: "Identity Verification",
        trigger_type: "call_completed" as const,
        gift_card_pool_id: "",
        sms_template: "Hi {first_name}! Thanks for calling. Your ${value} {provider} gift card: {code}",
        is_active: true,
      },
    ];
  });

  // Fetch gift card pools
  const { data: giftCardPools, isLoading } = useQuery({
    queryKey: ["gift-card-pools", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("id, pool_name, card_value, available_cards, total_cards")
        .eq("client_id", clientId)
        .order("pool_name");

      if (error) throw error;
      return data;
    },
  });

  const handleAddCondition = () => {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      condition_number: conditions.length + 1,
      condition_name: `Condition ${conditions.length + 1}`,
      trigger_type: "manual_agent",
      gift_card_pool_id: "",
      sms_template: "Hi {first_name}! Your ${value} {provider} gift card: {code}",
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

    // Renumber after reordering
    const renumbered = items.map((item, index) => ({
      ...item,
      condition_number: index + 1,
    }));

    setConditions(renumbered);
  };

  const handleNext = () => {
    // Validation
    const activeConditions = conditions.filter((c) => c.is_active);
    if (activeConditions.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one active condition is required.",
        variant: "destructive",
      });
      return;
    }

    // Check all active conditions have pools selected
    const missingPools = activeConditions.filter((c) => !c.gift_card_pool_id);
    if (missingPools.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please select a gift card pool for all active conditions.`,
        variant: "destructive",
      });
      return;
    }

    // Check all active conditions have names
    const missingNames = activeConditions.filter((c) => !c.condition_name.trim());
    if (missingNames.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please provide a name for all active conditions.`,
        variant: "destructive",
      });
      return;
    }

    onNext({ conditions } as any);
  };

  const getPoolById = (poolId: string) => {
    return giftCardPools?.find((p) => p.id === poolId);
  };

  const validatePoolInventory = (poolId: string) => {
    const pool = getPoolById(poolId);
    if (!pool) return null;

    if (pool.available_cards === 0) {
      return { type: "error" as const, message: "Pool is empty" };
    }
    if (pool.available_cards < recipientCount) {
      return {
        type: "error" as const,
        message: `Only ${pool.available_cards} cards available, need ${recipientCount}`,
      };
    }
    if (pool.available_cards < recipientCount * 1.1) {
      return {
        type: "warning" as const,
        message: `Low buffer: Only ${pool.available_cards - recipientCount} extra cards`,
      };
    }
    return { type: "success" as const, message: `${pool.available_cards} cards available` };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Campaign Conditions</h2>
        <p className="text-muted-foreground mt-2">
          Set up reward triggers and gift card provisioning conditions
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Create multiple conditions to reward customers at different stages. Each condition can have
          its own trigger type and gift card pool.
        </AlertDescription>
      </Alert>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="conditions">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {conditions.map((condition, index) => {
                const pool = getPoolById(condition.gift_card_pool_id);
                const validation = condition.gift_card_pool_id
                  ? validatePoolInventory(condition.gift_card_pool_id)
                  : null;

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
                        <CardHeader>
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
                            <div className="space-y-2">
                              <Label>Condition Name *</Label>
                              <Input
                                value={condition.condition_name}
                                onChange={(e) =>
                                  handleUpdateCondition(condition.id, {
                                    condition_name: e.target.value,
                                  })
                                }
                                placeholder="e.g., Identity Verification"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Trigger Type *</Label>
                              <Select
                                value={condition.trigger_type}
                                onValueChange={(value: any) =>
                                  handleUpdateCondition(condition.id, { trigger_type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manual_agent">Manual (Agent Action)</SelectItem>
                                  <SelectItem value="call_completed">Call Completed</SelectItem>
                                  <SelectItem value="form_submitted">Form Submitted</SelectItem>
                                  <SelectItem value="time_delay">Time Delay</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Gift Card Pool *</Label>
                            <Select
                              value={condition.gift_card_pool_id}
                              onValueChange={(value) =>
                                handleUpdateCondition(condition.id, { gift_card_pool_id: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a gift card pool..." />
                              </SelectTrigger>
                              <SelectContent>
                                {isLoading ? (
                                  <SelectItem value="loading" disabled>
                                    Loading pools...
                                  </SelectItem>
                                ) : giftCardPools && giftCardPools.length > 0 ? (
                                  giftCardPools.map((pool) => (
                                    <SelectItem key={pool.id} value={pool.id}>
                                      {pool.pool_name} - ${pool.card_value} ({pool.available_cards}{" "}
                                      available)
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>
                                    No pools available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>

                            {validation && (
                              <Alert
                                variant={
                                  validation.type === "error" ? "destructive" : "default"
                                }
                              >
                                {validation.type === "error" && (
                                  <AlertTriangle className="h-4 w-4" />
                                )}
                                {validation.type === "warning" && (
                                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                )}
                                {validation.type === "success" && (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                )}
                                <AlertDescription>{validation.message}</AlertDescription>
                              </Alert>
                            )}

                            {pool && (
                              <div className="text-sm text-muted-foreground">
                                {pool.pool_name}: {pool.available_cards} of {pool.total_cards} cards
                                available
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>SMS Template</Label>
                            <Textarea
                              value={condition.sms_template}
                              onChange={(e) =>
                                handleUpdateCondition(condition.id, {
                                  sms_template: e.target.value,
                                })
                              }
                              rows={3}
                              placeholder="Hi {first_name}! Your ${value} {provider} gift card: {code}"
                            />
                            <p className="text-xs text-muted-foreground">
                              Variables: {"{first_name}"}, {"{last_name}"}, {"{value}"},{" "}
                              {"{provider}"}, {"{code}"}
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

      <Button onClick={handleAddCondition} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Another Condition
      </Button>

      <div className="flex justify-between gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Next: Landing Page</Button>
      </div>
    </div>
  );
}

