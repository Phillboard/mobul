/**
 * PoolStats Component
 * 
 * Purpose: Displays key statistics for a gift card pool in a grid of stat cards
 * Used by: PoolDetailDialog
 * 
 * Key Features:
 * - Total cards count
 * - Available cards (green highlight)
 * - Claimed cards (blue highlight)
 * - Total value calculation
 * - Utilization percentage
 * 
 * Props:
 * @param {PoolStats} stats - Calculated pool statistics
 * 
 * Related Components: Card, CardHeader, CardTitle, CardContent
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatCurrency } from '@shared/utils/currency';
import { PoolStats as PoolStatsType } from "@/types/giftCards";

interface PoolStatsProps {
  stats: PoolStatsType;
}

export function PoolStats({ stats }: PoolStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* Total Cards */}
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
          Total Cards
        </div>
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-center">
            <div className="text-3xl font-bold text-foreground">
              {stats.totalCards}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Cards */}
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
          Available
        </div>
        <Card className="border border-success/30 bg-success/5 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-center">
            <div className="text-3xl font-bold text-success">
              {stats.availableCards}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claimed Cards */}
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
          Claimed
        </div>
        <Card className="border border-primary/30 bg-primary/5 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-center">
            <div className="text-3xl font-bold text-primary">
              {stats.claimedCards}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Value */}
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
          Total Value
        </div>
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-center">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization */}
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1">
          Utilization
        </div>
        <Card className="border shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-center">
            <div className="text-3xl font-bold text-primary">
              {stats.utilizationPercent.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
