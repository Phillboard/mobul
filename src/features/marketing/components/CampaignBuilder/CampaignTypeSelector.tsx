/**
 * Campaign Type Selector
 * 
 * First step of campaign wizard - select email, SMS, or both.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Mail, MessageSquare, Layers } from "lucide-react";
import type { CampaignType } from "../../types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { useTenant } from "@/contexts/TenantContext";

interface Props {
  value: CampaignType;
  linkedCampaignId?: string;
  onChange: (type: CampaignType, linkedCampaignId?: string) => void;
}

const campaignTypes: { type: CampaignType; icon: React.ReactNode; title: string; description: string }[] = [
  {
    type: 'email',
    icon: <Mail className="h-8 w-8" />,
    title: 'Email Campaign',
    description: 'Send marketing emails to your contacts',
  },
  {
    type: 'sms',
    icon: <MessageSquare className="h-8 w-8" />,
    title: 'SMS Campaign',
    description: 'Send text messages to your contacts',
  },
  {
    type: 'both',
    icon: <Layers className="h-8 w-8" />,
    title: 'Email + SMS',
    description: 'Multi-channel campaign with both email and SMS',
  },
];

export function CampaignTypeSelector({ value, linkedCampaignId, onChange }: Props) {
  const [isFollowUp, setIsFollowUp] = useState(!!linkedCampaignId);
  const { currentClient } = useTenant();

  // Fetch mail campaigns for follow-up selection
  const { data: mailCampaigns = [] } = useQuery({
    queryKey: ['mail-campaigns', currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('client_id', currentClient.id)
        .in('status', ['active', 'mailed', 'completed'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentClient?.id && isFollowUp,
  });

  const handleFollowUpToggle = (checked: boolean) => {
    setIsFollowUp(checked);
    if (!checked) {
      onChange(value, undefined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Type Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        {campaignTypes.map((type) => (
          <Card 
            key={type.type}
            className={`cursor-pointer transition-all hover:border-primary ${
              value === type.type ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => onChange(type.type, linkedCampaignId)}
          >
            <CardHeader className="text-center pb-2">
              <div className={`mx-auto p-3 rounded-full ${
                value === type.type ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {type.icon}
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <CardTitle className="text-lg">{type.title}</CardTitle>
              <CardDescription className="mt-1">{type.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Follow-up Sequence Option */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Follow-up Sequence</CardTitle>
              <CardDescription>
                Link this to a mail campaign to send as a follow-up
              </CardDescription>
            </div>
            <Switch
              checked={isFollowUp}
              onCheckedChange={handleFollowUpToggle}
            />
          </div>
        </CardHeader>
        {isFollowUp && (
          <CardContent>
            <div className="space-y-2">
              <Label>Select Mail Campaign</Label>
              <Select
                value={linkedCampaignId}
                onValueChange={(id) => onChange(value, id)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {mailCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This marketing campaign will be triggered based on the mail campaign's delivery
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
