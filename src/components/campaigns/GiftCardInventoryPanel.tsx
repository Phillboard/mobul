import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, TrendingDown, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GiftCardInventoryPanelProps {
  campaignId: string;
}

export function GiftCardInventoryPanel({ campaignId }: GiftCardInventoryPanelProps) {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ["campaign-gift-card-inventory", campaignId],
    queryFn: async () => {
      // Get campaign conditions with gift card pools
      const { data: conditions, error: condError } = await supabase
        .from("campaign_reward_configs")
        .select(`
          *,
          gift_card_pools (
            id,
            pool_name,
            provider,
            card_value,
            total_cards,
            available_cards,
            claimed_cards,
            delivered_cards,
            failed_cards
          )
        `)
        .eq("campaign_id", campaignId);

      if (condError) throw condError;

      // Get conditions met count
      const { data: metConditions, error: metError } = await supabase
        .from("call_conditions_met")
        .select("condition_number, id")
        .eq("campaign_id", campaignId);

      if (metError) throw metError;

      const metCounts = metConditions?.reduce((acc, item) => {
        acc[item.condition_number] = (acc[item.condition_number] || 0) + 1;
        return acc;
      }, {} as Record<number, number>) || {};

      return conditions?.map((cond: any) => ({
        ...cond,
        metCount: metCounts[cond.condition_number] || 0,
      })) || [];
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading inventory...</div>;
  }

  const poolsWithInventory = inventory?.filter((inv: any) => inv.gift_card_pools) || [];
  const lowInventory = poolsWithInventory.filter(
    (inv: any) => inv.gift_card_pools.available_cards < 10
  );

  return (
    <div className="space-y-4">
      {lowInventory.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {lowInventory.length} condition{lowInventory.length > 1 ? 's have' : ' has'} low gift card inventory
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {poolsWithInventory.map((inv: any) => {
          const pool = inv.gift_card_pools;
          const utilizationRate = pool.total_cards > 0 
            ? ((pool.claimed_cards / pool.total_cards) * 100).toFixed(1)
            : 0;
          const isLow = pool.available_cards < 10;

          return (
            <Card key={inv.id} className={isLow ? "border-destructive" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Condition #{inv.condition_number}</CardTitle>
                    <CardDescription className="text-xs">
                      {pool.provider} - ${pool.card_value}
                    </CardDescription>
                  </div>
                  <Gift className={`h-4 w-4 ${isLow ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Available</p>
                    <p className="font-semibold text-lg">{pool.available_cards}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Triggered</p>
                    <p className="font-semibold text-lg">{inv.metCount}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="font-medium">{utilizationRate}%</span>
                  </div>
                  <Progress value={Number(utilizationRate)} className="h-2" />
                </div>

                <div className="flex gap-2 text-xs">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ✓ {pool.delivered_cards} sent
                  </Badge>
                  {pool.failed_cards > 0 && (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      ✗ {pool.failed_cards} failed
                    </Badge>
                  )}
                </div>

                {isLow && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <TrendingDown className="h-3 w-3" />
                    <span>Low inventory - refill needed</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {poolsWithInventory.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No gift card pools configured for this campaign
          </CardContent>
        </Card>
      )}
    </div>
  );
}
