import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Gift, TrendingUp, AlertCircle, DollarSign } from "lucide-react";

export function GiftCardAnalytics({ clientId }: { clientId?: string }) {
  const { data: stats } = useQuery({
    queryKey: ["gift-card-analytics", clientId],
    queryFn: async () => {
      let poolsQuery = supabase.from("gift_card_pools").select("*");
      const cardsQuery = supabase.from("gift_cards").select("*, gift_card_pools(client_id)");
      const deliveriesQuery = supabase.from("gift_card_deliveries").select("*, campaigns(client_id)");

      if (clientId) {
        poolsQuery = poolsQuery.eq("client_id", clientId);
      }

      const [poolsResult, cardsResult, deliveriesResult] = await Promise.all([
        poolsQuery,
        cardsQuery,
        deliveriesQuery
      ]);

      const pools = poolsResult.data || [];
      const cards = clientId
        ? (cardsResult.data || []).filter((c: any) => c.gift_card_pools?.client_id === clientId)
        : (cardsResult.data || []);
      const deliveries = clientId
        ? (deliveriesResult.data || []).filter((d: any) => d.campaigns?.client_id === clientId)
        : (deliveriesResult.data || []);

      const totalValue = pools.reduce((sum, p) => sum + (p.total_cards * p.card_value), 0);
      const claimedValue = pools.reduce((sum, p) => sum + (p.claimed_cards * p.card_value), 0);

      return {
        totalPools: pools.length,
        totalCards: cards.length,
        availableCards: cards.filter((c: any) => c.status === 'available').length,
        claimedCards: cards.filter((c: any) => c.status === 'claimed').length,
        deliveredCards: deliveries.filter((d: any) => d.delivery_status === 'sent').length,
        failedDeliveries: deliveries.filter((d: any) => d.delivery_status === 'failed').length,
        totalValue,
        claimedValue,
        deliveries,
        pools
      };
    }
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const statusData = [
    { name: 'Available', value: stats?.availableCards || 0 },
    { name: 'Claimed', value: stats?.claimedCards || 0 },
    { name: 'Delivered', value: stats?.deliveredCards || 0 },
  ];

  const deliveryMethodData = stats?.deliveries.reduce((acc: any[], d: any) => {
    const method = d.delivery_method || 'unknown';
    const existing = acc.find(item => item.name === method);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: method, value: 1 });
    }
    return acc;
  }, []) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Gift Card Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Monitor performance and track gift card usage
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPools || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active gift card pools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalValue.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              ${stats?.claimedValue.toFixed(2) || '0.00'} claimed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.deliveredCards && stats?.claimedCards
                ? ((stats.deliveredCards / stats.claimedCards) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.deliveredCards || 0} / {stats?.claimedCards || 0} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failedDeliveries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card Status Distribution</CardTitle>
            <CardDescription>Breakdown by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Methods</CardTitle>
            <CardDescription>How cards are being delivered</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deliveryMethodData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
