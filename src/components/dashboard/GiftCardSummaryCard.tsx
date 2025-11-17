import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, TrendingUp, DollarSign, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GiftCardSummaryCardProps {
  clientId: string;
}

export function GiftCardSummaryCard({ clientId }: GiftCardSummaryCardProps) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["gift-card-summary", clientId],
    queryFn: async () => {
      // Get pool totals
      const { data: pools, error: poolError } = await supabase
        .from("gift_card_pools")
        .select("card_value, total_cards, available_cards, delivered_cards")
        .eq("client_id", clientId);

      if (poolError) throw poolError;

      const totalValue = pools?.reduce((sum, pool) => sum + (pool.card_value * pool.total_cards), 0) || 0;
      const totalCards = pools?.reduce((sum, pool) => sum + pool.total_cards, 0) || 0;
      const availableCards = pools?.reduce((sum, pool) => sum + (pool.available_cards || 0), 0) || 0;
      const deliveredCards = pools?.reduce((sum, pool) => sum + (pool.delivered_cards || 0), 0) || 0;

      // Get recent deliveries for trend
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentDeliveries, error: deliveryError } = await supabase
        .from("gift_card_deliveries")
        .select("created_at, gift_cards!inner(gift_card_pools!inner(client_id, card_value))")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .eq("gift_cards.gift_card_pools.client_id", clientId)
        .eq("delivery_status", "sent");

      if (deliveryError) throw deliveryError;

      const recentValue = recentDeliveries?.reduce((sum, d: any) => {
        return sum + (d.gift_cards?.gift_card_pools?.card_value || 0);
      }, 0) || 0;

      return {
        totalValue,
        totalCards,
        availableCards,
        deliveredCards,
        recentValue,
        recentCount: recentDeliveries?.length || 0,
        pools: pools?.length || 0,
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
            {summary?.totalCards} cards across {summary?.pools} pools
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
