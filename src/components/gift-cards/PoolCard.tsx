import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Upload } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type GiftCardPool = Tables<"gift_card_pools">;

interface PoolCardProps {
  pool: GiftCardPool;
  onUploadClick: (poolId: string) => void;
}

export function PoolCard({ pool, onUploadClick }: PoolCardProps) {
  const utilizationPercent = pool.total_cards > 0 
    ? ((pool.claimed_cards + pool.delivered_cards) / pool.total_cards * 100).toFixed(1)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{pool.pool_name}</CardTitle>
            <CardDescription>
              {pool.provider && `${pool.provider} · `}
              ${pool.card_value.toFixed(2)} per card
            </CardDescription>
          </div>
          <Badge variant={pool.available_cards > 10 ? "default" : "destructive"}>
            {pool.available_cards} available
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold">{pool.total_cards}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Claimed</div>
              <div className="text-2xl font-semibold">{pool.claimed_cards}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Delivered</div>
              <div className="text-2xl font-semibold">{pool.delivered_cards}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Utilization</span>
              <span className="font-medium">{utilizationPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onUploadClick(pool.id)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Cards
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              <Package className="h-4 w-4 mr-2" />
              View Inventory
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
