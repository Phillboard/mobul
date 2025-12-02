import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, TrendingUp, DollarSign, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GiftCardSummaryCardProps {
  clientId: string;
}

export function GiftCardSummaryCard({ clientId }: GiftCardSummaryCardProps) {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["gift-card-summary", clientId],
    queryFn: async () => {
      // Get inventory totals for this client's campaigns
      const { data: inventory, error: invError } = await supabase
        .from("gift_card_inventory")
        .select("denomination, status, assigned_to_campaign_id, campaigns!inner(client_id)")
        .eq("campaigns.client_id", clientId);

      if (invError) {
        console.error("Inventory query error:", invError);
        // Return empty data if error (tables might not exist yet)
        return {
          totalValue: 0,
          totalCards: 0,
          availableCards: 0,
          deliveredCards: 0,
          recentValue: 0,
          recentCount: 0,
          pools: 0,
        };
      }

      const totalCards = inventory?.length || 0;
      const availableCards = inventory?.filter(c => c.status === 'available').length || 0;
      const deliveredCards = inventory?.filter(c => c.status === 'delivered').length || 0;
      const totalValue = inventory?.reduce((sum, card) => sum + (card.denomination || 0), 0) || 0;

      // Get recent billing data for trend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentBilling, error: billingError } = await supabase
        .from("gift_card_billing_ledger")
        .select("denomination, billed_at")
        .eq("billed_entity_type", "client")
        .eq("billed_entity_id", clientId)
        .gte("billed_at", thirtyDaysAgo.toISOString());

      if (billingError) {
        console.error("Billing query error:", billingError);
      }

      const recentValue = recentBilling?.reduce((sum, b) => sum + (b.denomination || 0), 0) || 0;

      return {
        totalValue,
        totalCards,
        availableCards,
        deliveredCards,
        recentValue,
        recentCount: recentBilling?.length || 0,
        pools: 0, // No longer using pools
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${summary?.totalValue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            {summary?.totalCards} total cards
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Cards</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.availableCards}</div>
          <p className="text-xs text-muted-foreground">
            Ready to be claimed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          <Gift className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.deliveredCards}</div>
          <p className="text-xs text-muted-foreground">
            Successfully sent to recipients
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.recentCount}</div>
          <p className="text-xs text-muted-foreground">
            ${summary?.recentValue.toFixed(2)} value delivered
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
