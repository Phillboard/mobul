import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { usePoolInventory } from "@/hooks/usePoolInventory";

interface PoolInventoryWidgetProps {
  poolId: string | null;
  className?: string;
}

export function PoolInventoryWidget({ poolId, className }: PoolInventoryWidgetProps) {
  const { data: pool, isLoading } = usePoolInventory(poolId);

  if (isLoading || !pool) {
    return null;
  }

  const lowThreshold = pool.low_stock_threshold || 20;
  const isCritical = pool.available_cards === 0;
  const isLow = pool.available_cards > 0 && pool.available_cards <= lowThreshold;
  const isGood = pool.available_cards > lowThreshold;
  const utilizationPercent = pool.total_cards > 0 
    ? Math.round((pool.available_cards / pool.total_cards) * 100)
    : 0;

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Pool Inventory</h3>
        {isCritical && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Empty
          </Badge>
        )}
        {isLow && (
          <Badge variant="outline" className="flex items-center gap-1 border-yellow-500 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
          </Badge>
        )}
        {isGood && (
          <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-700 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            In Stock
          </Badge>
        )}
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-2xl font-bold">{pool.available_cards}</p>
          <p className="text-xs text-muted-foreground">cards remaining</p>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${
              isCritical ? 'bg-destructive' : 
              isLow ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pool.pool_name}</span>
          <span>{utilizationPercent}% available</span>
        </div>
      </div>
    </Card>
  );
}
