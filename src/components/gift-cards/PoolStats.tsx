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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currencyUtils";
import { PoolStats as PoolStatsType } from "@/types/giftCards";

interface PoolStatsProps {
  stats: PoolStatsType;
}

export function PoolStats({ stats }: PoolStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
      {/* Total Cards */}
      <Card className="border-2 shadow-sm hover:shadow-lg transition-all">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Total Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold text-foreground">
            {stats.totalCards}
          </div>
        </CardContent>
      </Card>

      {/* Available Cards */}
      <Card className="border-2 border-success/20 bg-gradient-to-br from-success/5 to-background shadow-sm hover:shadow-lg transition-all">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Available
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold text-success">
            {stats.availableCards}
          </div>
        </CardContent>
      </Card>

      {/* Claimed Cards */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-sm hover:shadow-lg transition-all">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Claimed
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold text-primary">
            {stats.claimedCards}
          </div>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card className="border-2 shadow-sm hover:shadow-lg transition-all">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Total Value
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold text-primary">
            {formatCurrency(stats.totalValue)}
          </div>
        </CardContent>
      </Card>

      {/* Utilization */}
      <Card className="border-2 shadow-sm hover:shadow-lg transition-all">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Utilization
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold text-primary">
            {stats.utilizationPercent.toFixed(0)}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
