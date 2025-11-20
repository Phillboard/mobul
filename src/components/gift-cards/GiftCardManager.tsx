import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface GiftCardManagerProps {
  poolId?: string;
  clientId: string;
}

export function GiftCardManager({ poolId, clientId }: GiftCardManagerProps) {
  const { toast } = useToast();
  const [checkingBalance, setCheckingBalance] = useState(false);

  const { data: cards, isLoading, refetch } = useQuery({
    queryKey: ["gift-card-manager", poolId, clientId],
    queryFn: async () => {
      let query = supabase
        .from("gift_cards")
        .select(`
          *,
          pool:gift_card_pools(
            pool_name,
            card_value,
            provider
          ),
          brand:gift_card_brands(
            brand_name,
            logo_url,
            category
          ),
          balance_history:gift_card_balance_history(
            checked_at,
            new_balance,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (poolId) {
        query = query.eq("pool_id", poolId);
      } else {
        // Get all pools for this client
        const { data: pools } = await supabase
          .from("gift_card_pools")
          .select("id")
          .eq("client_id", clientId);
        
        if (pools && pools.length > 0) {
          query = query.in("pool_id", pools.map(p => p.id));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleCheckBalances = async (cardIds?: string[]) => {
    setCheckingBalance(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-gift-card-balance", {
        body: cardIds ? { cardIds } : { poolId },
      });

      if (error) throw error;

      toast({
        title: "Balance Check Complete",
        description: `Checked ${data.results.length} cards`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Balance Check Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCheckingBalance(false);
    }
  };

  const getBalanceStatus = (card: any) => {
    if (!card.last_balance_check) return { color: "secondary", text: "Never Checked" };
    if (card.balance_check_status === "error") return { color: "destructive", text: "Check Failed" };
    
    const daysSinceCheck = Math.floor(
      (Date.now() - new Date(card.last_balance_check).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCheck > 7) return { color: "default", text: `${daysSinceCheck}d ago` };
    return { color: "default", text: `${daysSinceCheck}d ago` };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading cards...</div>;
  }

  const totalValue = cards?.reduce((sum, card) => sum + (card.pool?.card_value || 0), 0) || 0;
  const totalBalance = cards?.reduce((sum, card) => sum + (card.current_balance || card.pool?.card_value || 0), 0) || 0;
  const cardsNeedingCheck = cards?.filter(
    c => !c.last_balance_check || 
    new Date(c.last_balance_check).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cards?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Original Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs Check</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{cardsNeedingCheck}</div>
              {cardsNeedingCheck > 0 && <AlertCircle className="h-5 w-5 text-amber-500" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gift Card Tracker</CardTitle>
              <CardDescription>Monitor and manage gift card balances</CardDescription>
            </div>
            <Button
              onClick={() => handleCheckBalances()}
              disabled={checkingBalance}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${checkingBalance ? "animate-spin" : ""}`} />
              Check All Balances
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Original Value</TableHead>
                <TableHead>Current Balance</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards?.map((card: any) => {
                const balanceStatus = getBalanceStatus(card);
                const originalValue = card.pool?.card_value || 0;
                const currentBalance = card.current_balance || originalValue;
                const usagePercent = ((originalValue - currentBalance) / originalValue * 100).toFixed(0);

                return (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {card.brand?.logo_url && (
                          <img 
                            src={card.brand.logo_url} 
                            alt={card.brand.brand_name}
                            className="h-6 w-6 rounded"
                          />
                        )}
                        <span className="font-medium">
                          {card.brand?.brand_name || card.pool?.pool_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">...{card.card_code.slice(-4)}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        card.status === "available" ? "default" :
                        card.status === "claimed" ? "secondary" :
                        card.status === "delivered" ? "outline" : "destructive"
                      }>
                        {card.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(originalValue)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(currentBalance)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{usagePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={balanceStatus.color as any}>
                        {balanceStatus.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCheckBalances([card.id])}
                        disabled={checkingBalance}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}