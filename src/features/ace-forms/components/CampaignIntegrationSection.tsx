import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Gift, Users } from "lucide-react";
import { useFormBuilder } from '@app/providers/FormBuilderProvider';

interface CampaignIntegrationSectionProps {
  clientId: string;
}

export function CampaignIntegrationSection({ clientId }: CampaignIntegrationSectionProps) {
  const { config, updateSettings } = useFormBuilder();
  const campaignId = (config.settings as any).campaign_id;

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns-for-forms", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          status,
          rewards_enabled,
          reward_pool_id,
          gift_card_pools (
            id,
            pool_name,
            card_value,
            available_cards
          )
        `)
        .eq("client_id", clientId)
        .in("status", ["draft", "scheduled", "in_production"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get the full count for selected campaign
  const { data: recipientCount } = useQuery({
    queryKey: ["campaign-recipient-count", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const { count, error } = await supabase
        .from("recipients")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaignId);

      if (error) throw error;
      return count;
    },
    enabled: !!campaignId,
  });

  const selectedCampaign = campaigns?.find(c => c.id === campaignId);

  const handleCampaignChange = (newCampaignId: string) => {
    updateSettings({ campaign_id: newCampaignId });
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-base">Campaign Integration (Required)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Link to Campaign *</Label>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading campaigns...</p>
          ) : (
            <Select
              value={campaignId || ""}
              onValueChange={handleCampaignChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign..." />
              </SelectTrigger>
              <SelectContent>
                {campaigns && campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.status})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No campaigns available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {campaignId && selectedCampaign ? (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Linked to: {selectedCampaign.name}</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  <span>
                    {recipientCount !== null ? recipientCount.toLocaleString() : "—"} recipients
                  </span>
                </div>

                <div className="mt-2 text-sm">
                  Form submissions will:
                </div>
                <ul className="text-sm space-y-1">
                  <li>• Validate redemption codes from this campaign</li>
                  <li>• Enrich contact data automatically</li>
                  <li>• Track in campaign analytics</li>
                  {selectedCampaign.rewards_enabled && (
                    <li className="font-medium text-green-600">
                      • Provision gift cards automatically
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>

            {selectedCampaign.rewards_enabled && selectedCampaign.gift_card_pools && (
              <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm text-green-900 dark:text-green-100">
                    Gift Cards Enabled
                  </span>
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">
                  <div>Pool: {selectedCampaign.gift_card_pools.pool_name}</div>
                  <div>Value: ${selectedCampaign.gift_card_pools.card_value}</div>
                  <div>Available: {selectedCampaign.gift_card_pools.available_cards} cards</div>
                </div>
              </div>
            )}
          </>
        ) : (
          !campaignId && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Campaign Required</AlertTitle>
              <AlertDescription>
                You must link this form to a campaign before publishing. This ensures proper code validation and reward provisioning.
              </AlertDescription>
            </Alert>
          )
        )}
      </CardContent>
    </Card>
  );
}

