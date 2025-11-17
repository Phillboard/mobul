import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowRight, Gift, Mail, Webhook, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Condition {
  id?: string;
  condition_number: number;
  condition_type: string;
  trigger_action: string;
  sequence_order: number;
  is_required: boolean;
  gift_card_pool_id?: string;
  sms_template?: string;
  webhook_url?: string;
  config_json?: Record<string, any>;
}

interface ConditionBuilderProps {
  campaignId?: string;
  clientId: string;
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

const conditionTypeOptions = [
  { value: 'mail_delivered', label: 'Mail Delivered', icon: Mail },
  { value: 'call_completed', label: 'Call Completed', icon: Phone },
  { value: 'qr_scanned', label: 'QR Code Scanned', icon: Mail },
  { value: 'purl_visited', label: 'Landing Page Visited', icon: Mail },
  { value: 'form_submitted', label: 'Form Submitted', icon: Mail },
  { value: 'time_delay', label: 'Time Delay', icon: Mail },
  { value: 'manual_trigger', label: 'Manual Trigger', icon: Mail },
];

const triggerActionOptions = [
  { value: 'send_gift_card', label: 'Send Gift Card', icon: Gift },
  { value: 'send_sms', label: 'Send SMS', icon: Phone },
  { value: 'trigger_webhook', label: 'Trigger Webhook', icon: Webhook },
  { value: 'update_crm', label: 'Update CRM', icon: Webhook },
  { value: 'send_email', label: 'Send Email', icon: Mail },
];

export function ConditionBuilder({ campaignId, clientId, conditions, onChange }: ConditionBuilderProps) {
  const { data: giftCardPools } = useQuery({
    queryKey: ['gift-card-pools', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_card_pools')
        .select('*')
        .eq('client_id', clientId)
        .gt('available_cards', 0);
      
      if (error) throw error;
      return data;
    },
  });

  const addCondition = () => {
    if (conditions.length >= 3) return;
    
    const newCondition: Condition = {
      condition_number: conditions.length + 1,
      condition_type: 'mail_delivered',
      trigger_action: 'send_gift_card',
      sequence_order: conditions.length + 1,
      is_required: true,
      config_json: {},
    };
    
    onChange([...conditions, newCondition]);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    // Renumber remaining conditions
    const renumbered = newConditions.map((c, i) => ({
      ...c,
      condition_number: i + 1,
      sequence_order: i + 1,
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
                <div className="grid grid-cols-2 gap-4">
                  {/* Condition Type */}
                  <div className="space-y-2">
                    <Label>When</Label>
                    <Select
                      value={condition.condition_type}
                      onValueChange={(value) => updateCondition(index, { condition_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trigger Action */}
                  <div className="space-y-2">
                    <Label>Then</Label>
                    <Select
                      value={condition.trigger_action}
                      onValueChange={(value) => updateCondition(index, { trigger_action: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerActionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Gift Card Pool Selection */}
                {condition.trigger_action === 'send_gift_card' && (
                  <div className="space-y-2">
                    <Label>Gift Card Pool</Label>
                    <Select
                      value={condition.gift_card_pool_id || ''}
                      onValueChange={(value) => updateCondition(index, { gift_card_pool_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a gift card pool" />
                      </SelectTrigger>
                      <SelectContent>
                        {giftCardPools?.map((pool) => (
                          <SelectItem key={pool.id} value={pool.id}>
                            {pool.pool_name} - ${pool.card_value} ({pool.available_cards} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* SMS Template */}
                {(condition.trigger_action === 'send_sms' || condition.trigger_action === 'send_gift_card') && (
                  <div className="space-y-2">
                    <Label>SMS Message</Label>
                    <Textarea
                      value={condition.sms_template || ''}
                      onChange={(e) => updateCondition(index, { sms_template: e.target.value })}
                      placeholder="Enter SMS message template..."
                      rows={3}
                    />
                  </div>
                )}

                {/* Webhook URL */}
                {(condition.trigger_action === 'trigger_webhook' || condition.trigger_action === 'update_crm') && (
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={condition.webhook_url || ''}
                      onChange={(e) => updateCondition(index, { webhook_url: e.target.value })}
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>Required Condition</Label>
                    <p className="text-xs text-muted-foreground">
                      Must be met before next condition can trigger
                    </p>
                  </div>
                  <Switch
                    checked={condition.is_required}
                    onCheckedChange={(checked) => updateCondition(index, { is_required: checked })}
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