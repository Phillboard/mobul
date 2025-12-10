import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Plus, Trash2, ArrowRight, Gift, Mail, Webhook, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';

interface Condition {
  id?: string;
  condition_number: number;
  condition_name: string;
  trigger_type: string;
  crm_event_name?: string;
  time_delay_hours?: number;
  is_active: boolean;
  is_simulated?: boolean;
  simulation_batch_id?: string;
  created_at?: string;
}

interface ConditionBuilderProps {
  campaignId?: string;
  clientId: string;
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

const triggerTypeOptions = [
  { value: 'manual_agent', label: 'Manual Agent Trigger', icon: Phone },
  { value: 'crm_event', label: 'CRM Event', icon: Webhook },
  { value: 'time_delay', label: 'Time Delay', icon: Mail },
  { value: 'mail_delivered', label: 'Mail Delivered', icon: Mail },
  { value: 'call_completed', label: 'Call Completed', icon: Phone },
];

export function ConditionBuilder({ campaignId, clientId, conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    if (conditions.length >= 3) return;
    
    const newCondition: Condition = {
      condition_number: conditions.length + 1,
      condition_name: `Condition ${conditions.length + 1}`,
      trigger_type: 'manual_agent',
      is_active: true,
    };
    
    onChange([...conditions, newCondition]);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    // Renumber remaining conditions
    const renumbered = newConditions.map((c, i) => ({
      ...c,
      condition_number: i + 1,
    }));
    onChange(renumbered);
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange(newConditions);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Campaign Conditions</h3>
          <p className="text-sm text-muted-foreground">
            Define up to 3 sequential conditions that trigger rewards or actions
          </p>
        </div>
        {conditions.length < 3 && (
          <Button onClick={addCondition} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Condition
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {conditions.map((condition, index) => (
          <div key={index} className="relative">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {index + 1}
                    </span>
                    Condition {index + 1}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <CardDescription>
                  When this happens → Then do this
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Condition Name */}
                  <div className="space-y-2">
                    <Label>Condition Name</Label>
                    <Input
                      value={condition.condition_name}
                      onChange={(e) => updateCondition(index, { condition_name: e.target.value })}
                      placeholder="Enter condition name..."
                    />
                  </div>

                  {/* Trigger Type */}
                  <div className="space-y-2">
                    <Label>Trigger Type</Label>
                    <Select
                      value={condition.trigger_type}
                      onValueChange={(value) => updateCondition(index, { trigger_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* CRM Event Name (if CRM event selected) */}
                  {condition.trigger_type === 'crm_event' && (
                    <div className="space-y-2">
                      <Label>CRM Event Name</Label>
                      <Input
                        value={condition.crm_event_name || ''}
                        onChange={(e) => updateCondition(index, { crm_event_name: e.target.value })}
                        placeholder="e.g., deal_closed, contact_updated"
                      />
                    </div>
                  )}

                  {/* Time Delay (if time delay selected) */}
                  {condition.trigger_type === 'time_delay' && (
                    <div className="space-y-2">
                      <Label>Delay Hours</Label>
                      <Input
                        type="number"
                        value={condition.time_delay_hours || ''}
                        onChange={(e) => updateCondition(index, { time_delay_hours: parseInt(e.target.value) || 0 })}
                        placeholder="24"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable or disable this condition
                    </p>
                  </div>
                  <Switch
                    checked={condition.is_active}
                    onCheckedChange={(checked) => updateCondition(index, { is_active: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Arrow between conditions */}
            {index < conditions.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {conditions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground mb-4">
                No conditions configured yet
              </p>
              <Button onClick={addCondition} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Condition
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}