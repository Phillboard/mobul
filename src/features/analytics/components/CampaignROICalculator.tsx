import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";

interface CampaignROICalculatorProps {
  campaignId: string;
}

export function CampaignROICalculator({ campaignId }: CampaignROICalculatorProps) {
  const { data: campaign } = useQuery({
    queryKey: ['campaign-roi', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          audiences(total_count, valid_count),
          recipients(count),
          events(event_type)
        `)
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate costs
  const totalRecipients = campaign?.audiences?.total_count || 0;
  const mailCostPerPiece = 0.60; // $0.40 production + $0.20 postage (example)
  const giftCardCost = 23.50; // Wholesale cost for $25 card
  
  // Get redemption count
  const redemptions = campaign?.events?.filter(
    (e: any) => e.event_type === 'gift_card_redeemed'
  ).length || 0;

  const totalMailCost = totalRecipients * mailCostPerPiece;
  const totalGiftCardCost = redemptions * giftCardCost;
  const totalCost = totalMailCost + totalGiftCardCost;

  // Calculate metrics
  const responseRate = campaign?.events?.filter(
    (e: any) => e.event_type === 'purl_viewed' || e.event_type === 'qr_scanned'
  ).length || 0;
  
  const costPerLead = responseRate > 0 ? totalCost / responseRate : 0;
  const costPerRedemption = redemptions > 0 ? totalCost / redemptions : 0;

  return (
    <div className="space-y-4">
      {/* Cost Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mail Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMailCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalRecipients} pieces × ${mailCostPerPiece}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gift Card Costs</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalGiftCardCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {redemptions} cards × ${giftCardCost}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Campaign total spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Lead</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costPerLead > 0 ? `$${costPerLead.toFixed(2)}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {responseRate} responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Conversion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costPerRedemption > 0 ? `$${costPerRedemption.toFixed(2)}` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {redemptions} redemptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm">Response Rate</span>
              <Badge>
                {totalRecipients > 0 
                  ? ((responseRate / totalRecipients) * 100).toFixed(2) 
                  : '0'}%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm">Redemption Rate</span>
              <Badge>
                {responseRate > 0 
                  ? ((redemptions / responseRate) * 100).toFixed(2) 
                  : '0'}%
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="text-sm">Cost Efficiency</span>
              <Badge variant={costPerLead < 50 ? "default" : "secondary"}>
                {costPerLead < 50 ? "Excellent" : costPerLead < 100 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

