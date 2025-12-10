import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  ArrowRightLeft,
  Plus
} from "lucide-react";
import { useCreditAccount, useCreditTransactionHistory } from "@features/billing/hooks/useCreditManagement";
import { formatCurrency } from "@/shared/utils/currency";
import { formatDistanceToNow } from "date-fns";

interface CreditBalanceWidgetProps {
  entityType: 'platform' | 'agency' | 'client';
  entityId: string;
  showActions?: boolean;
  onAllocate?: () => void;
  onTransfer?: () => void;
}

export function CreditBalanceWidget({
  entityType,
  entityId,
  showActions = false,
  onAllocate,
  onTransfer,
}: CreditBalanceWidgetProps) {
  const { data: account, isLoading } = useCreditAccount(entityType, entityId);
  const { data: transactions } = useCreditTransactionHistory(entityType, entityId, 10);

  if (isLoading) {
    return <div>Loading credit balance...</div>;
  }

  if (!account) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No credit account found. Credits will be created automatically when first allocated.
        </AlertDescription>
      </Alert>
    );
  }

  const isLowBalance = account.balance < account.low_balance_threshold;
  const availableBalance = account.balance - account.reserved_balance;

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <Card className={isLowBalance ? "border-yellow-200" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Credit Balance
              </CardTitle>
              <CardDescription>
                {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Account
              </CardDescription>
            </div>
            {showActions && (
              <div className="flex gap-2">
                {onAllocate && (
                  <Button size="sm" onClick={onAllocate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Credits
                  </Button>
                )}
                {onTransfer && (
                  <Button size="sm" variant="outline" onClick={onTransfer}>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Transfer
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Total Balance */}
            <div>
              <div className="text-3xl font-bold">
                {formatCurrency(account.balance, account.currency)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {isLowBalance && (
                  <Badge variant="outline" className="text-yellow-600">
                    Low Balance
                  </Badge>
                )}
                {account.reserved_balance > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({formatCurrency(account.reserved_balance, account.currency)} reserved)
                  </span>
                )}
              </div>
            </div>

            {/* Available Balance */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available:</span>
              <span className="font-medium">
                {formatCurrency(availableBalance, account.currency)}
              </span>
            </div>

            {/* Low Balance Warning */}
            {isLowBalance && (
              <Alert variant="default" className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm">
                  Balance is below threshold of {formatCurrency(account.low_balance_threshold, account.currency)}.
                  Consider adding more credits.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <CardDescription>Last 10 credit movements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.map((transaction) => {
                const isCredit = ['allocation', 'transfer_in', 'refund'].includes(transaction.transaction_type);
                
                return (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-2 border rounded hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isCredit ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                        </div>
                        {transaction.description && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), account.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

