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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
      {/* Total Cards */}
      <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {stats.totalCards}
          </div>
        </CardContent>
      </Card>

      {/* Available Cards */}
      <Card className="border-2 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Available
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
            {stats.availableCards}
          </div>
        </CardContent>
      </Card>

      {/* Claimed Cards */}
      <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Claimed
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {stats.claimedCards}
          </div>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
      <Card className="border-2 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-4 pt-6">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
