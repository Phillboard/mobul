/**
 * Admin Financial Reports
 * 
 * Platform-wide gift card transaction analytics and reporting
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdminBillingStats, useTopSpendingClients } from '@/hooks/useGiftCardBilling';
import { formatCurrency, calculateProfitMargin } from '@/lib/gift-cards/provisioning-utils';
import { DollarSign, TrendingUp, CreditCard, Package, PieChart } from 'lucide-react';

export function AdminFinancialReports() {
  const { data: stats, isLoading } = useAdminBillingStats();
  const { data: topClients } = useTopSpendingClients(10);

  if (isLoading) {
    return <div>Loading reports...</div>;
  }

  const profitMargin = stats
    ? calculateProfitMargin(stats.totalRevenue, stats.totalRevenue - stats.totalProfit)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gift Card Financial Reports</h1>
        <p className="text-muted-foreground">Platform-wide analytics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalProfit || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cards Provisioned</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCards || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Per Card</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && stats.totalCards > 0
                ? formatCurrency(stats.totalRevenue / stats.totalCards)
                : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Provisioning Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-6 border rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats?.fromInventory || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">From Uploaded Inventory</div>
              <Badge variant="outline" className="mt-2">
                {stats?.totalCards ? ((stats.fromInventory / stats.totalCards) * 100).toFixed(1) : 0}%
              </Badge>
            </div>
            <div className="text-center p-6 border rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{stats?.fromTillo || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">From Tillo API</div>
              <Badge variant="outline" className="mt-2">
                {stats?.totalCards ? ((stats.fromTillo / stats.totalCards) * 100).toFixed(1) : 0}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Spending Clients */}
      <Card>
        <CardHeader>
          <CardTitle>Top Spending Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {topClients && topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((client: any, index: number) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                      #{index + 1}
                    </div>
                    <span className="font-medium">{client.name}</span>
                  </div>
                  <div className="font-semibold text-lg">{formatCurrency(client.total_spent)}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminFinancialReports;

