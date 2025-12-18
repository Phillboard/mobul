/**
 * Trigger Selector Component
 * 
 * Select what triggers the automation.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Mail, Gift, FileText, UserCheck, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useTenant } from "@/contexts/TenantContext";
import type { TriggerType, AutomationTriggerConfig } from "../../types";

interface Props {
  triggerType: TriggerType;
  triggerConfig: AutomationTriggerConfig;
  onChange: (type: TriggerType, config: AutomationTriggerConfig) => void;
}

const triggerOptions: { type: TriggerType; icon: React.ReactNode; title: string; description: string }[] = [
  {
    type: 'mail_campaign_sent',
    icon: <Mail className="h-5 w-5" />,
    title: 'Mail Campaign Sent',
    description: 'Trigger when a mail campaign is sent out',
  },
  {
    type: 'mail_campaign_delivered',
    icon: <Mail className="h-5 w-5" />,
    title: 'Mail Delivered',
    description: 'Trigger when mail is delivered to recipients',
  },
  {
    type: 'gift_card_redeemed',
    icon: <Gift className="h-5 w-5" />,
    title: 'Gift Card Redeemed',
    description: 'Trigger when a gift card is redeemed',
  },
  {
    type: 'form_submitted',
    icon: <FileText className="h-5 w-5" />,
    title: 'Form Submitted',
    description: 'Trigger when an ACE Form is submitted',
  },
  {
    type: 'recipient_approved',
    icon: <UserCheck className="h-5 w-5" />,
    title: 'Recipient Approved',
    description: 'Trigger when a recipient is approved in call center',
  },
  {
    type: 'manual',
    icon: <Zap className="h-5 w-5" />,
    title: 'Manual Trigger',
    description: 'Manually enroll contacts for testing',
  },
];

export function TriggerSelector({ triggerType, triggerConfig, onChange }: Props) {
  const { currentClient } = useTenant();

  // Fetch campaigns for selection
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-for-trigger', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentClient?.id && ['mail_campaign_sent', 'mail_campaign_delivered', 'gift_card_redeemed', 'recipient_approved'].includes(triggerType),
  });

  // Fetch forms for selection
  const { data: forms = [] } = useQuery({
    queryKey: ['forms-for-trigger', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      const { data, error } = await supabase
        .from('ace_forms')
        .select('id, name')
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentClient?.id && triggerType === 'form_submitted',
  });

  const handleTypeChange = (type: TriggerType) => {
    onChange(type, {});
  };

  const handleConfigChange = (updates: Partial<AutomationTriggerConfig>) => {
    onChange(triggerType, { ...triggerConfig, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Trigger Type Selection */}
      <RadioGroup value={triggerType} onValueChange={handleTypeChange as any}>
        <div className="grid gap-3 md:grid-cols-2">
          {triggerOptions.map((option) => (
            <div key={option.type}>
              <RadioGroupItem 
                value={option.type} 
                id={option.type}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.type}
                className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/20"
              >
                <div className="p-2 rounded-full bg-muted">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{option.title}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>

      {/* Trigger Configuration */}
      {['mail_campaign_sent', 'mail_campaign_delivered', 'gift_card_redeemed', 'recipient_approved'].includes(triggerType) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campaign Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Apply to all campaigns</Label>
              <Switch
                checked={triggerConfig.allCampaigns}
                onCheckedChange={(checked) => handleConfigChange({ 
                  allCampaigns: checked,
                  campaignId: checked ? undefined : triggerConfig.campaignId,
                })}
              />
            </div>
            
            {!triggerConfig.allCampaigns && (
              <div className="space-y-2">
                <Label>Select Campaign</Label>
                <Select
                  value={triggerConfig.campaignId}
                  onValueChange={(value) => handleConfigChange({ campaignId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a campaign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {triggerType === 'form_submitted' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Form Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Select Form</Label>
              <Select
                value={triggerConfig.formId}
                onValueChange={(value) => handleConfigChange({ formId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a form..." />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {triggerType === 'manual' && (
        <Card>
          <CardContent className="py-6 text-center">
            <Zap className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-muted-foreground">
              Contacts will be enrolled manually through the API or automation detail page
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
