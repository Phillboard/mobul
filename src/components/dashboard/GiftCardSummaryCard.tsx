import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Gift className="h-5 w-5 mr-2 text-primary" />
          Gift Card Inventory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 justify-between">
          {/* Total Value */}
          <div className="flex-1 text-center p-3 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">${summary?.totalValue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Value</p>
            <p className="text-xs text-muted-foreground">{summary?.pools} pools</p>
          </div>

          {/* Available Cards */}
          <div className="flex-1 text-center p-3 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <Package className="h-6 w-6 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold">{summary?.availableCards}</p>
            <p className="text-xs text-muted-foreground mt-1">Available</p>
            <p className="text-xs text-muted-foreground">Ready</p>
          </div>

          {/* Delivered */}
          <div className="flex-1 text-center p-3 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <Gift className="h-6 w-6 mx-auto text-purple-600 mb-1" />
            <p className="text-2xl font-bold">{summary?.deliveredCards}</p>
            <p className="text-xs text-muted-foreground mt-1">Delivered</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </div>

          {/* Last 30 Days */}
          <div className="flex-1 text-center p-3 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <TrendingUp className="h-6 w-6 mx-auto text-orange-600 mb-1" />
            <p className="text-2xl font-bold">{summary?.recentCount}</p>
            <p className="text-xs text-muted-foreground mt-1">30 Days</p>
            <p className="text-xs text-muted-foreground">${summary?.recentValue.toFixed(0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
