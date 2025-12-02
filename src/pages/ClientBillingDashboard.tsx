/**
 * Client Billing Dashboard
 * 
 * Shows gift card transaction history and spending summary for a client
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBillingTransactions, useClientSpendingSummary } from '@/hooks/useGiftCardBilling';
import { formatCurrency, formatSource } from '@/lib/gift-cards/provisioning-utils';
import { useTenant } from '@/contexts/TenantContext';
import { DollarSign, TrendingUp, CreditCard, Gift } from 'lucide-react';

export function ClientBillingDashboard() {
  const { currentClient } = useTenant();
  const clientId = currentClient?.id;
  
  const { data: transactions, isLoading } = useBillingTransactions({
    entityType: 'client',
    entityId: clientId,
    limit: 50,
  });

  const { data: summary } = useClientSpendingSummary({ clientId });

  if (!clientId) {
    return (
      <div className="p-8">
        <Alert>
          <AlertDescription>
            No client context found. Please ensure you are logged in as a client user.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading billing data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gift Card Billing</h2>
        <p className="text-muted-foreground">View your gift card transactions and spending</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_spent || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_cards || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Per Card</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary && summary.total_cards > 0
                ? formatCurrency(summary.total_spent / summary.total_cards)
                : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <Alert>
              <AlertDescription>No transactions yet</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {tx.gift_card_brands?.logo_url && (
                      <img
                        src={tx.gift_card_brands.logo_url}
                        alt={tx.gift_card_brands.brand_name}
                        className="w-10 h-10 rounded object-contain"
                      />
                    )}
                    <div>
                      <div className="font-semibold">
                        {tx.gift_card_brands?.brand_name || 'Unknown Brand'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {tx.campaigns?.name || 'Unknown Campaign'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.billed_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatCurrency(tx.denomination)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatSource(tx.transaction_type.includes('inventory') ? 'inventory' : 'tillo')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending by Brand */}
      {summary && summary.by_brand && Object.keys(summary.by_brand).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary.by_brand).map(([brandName, data]: [string, any]) => (
                <div key={brandName} className="flex items-center justify-between">
                  <span className="font-medium">{brandName}</span>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(data.total)}</div>
                    <div className="text-xs text-muted-foreground">{data.count} cards</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ClientBillingDashboard;

