import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Settings, DollarSign, AlertCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import type { PoolHealthStatus, AgencyMetrics } from "@/types/creditAccounts";

export function AdminGiftCardInventory() {
  const [selectedTab, setSelectedTab] = useState("inventory");

  // Fetch pool health status
  const { data: poolHealth, isLoading: poolsLoading } = useQuery({
    queryKey: ["admin-pool-health"],
    queryFn: async () => {
      const { data: pools, error } = await supabase
        .from("gift_card_pools")
        .select(`
          id,
          pool_name,
          pool_type,
          card_value,
          available_cards,
          total_cards,
          low_stock_threshold,
          is_active,
          cost_per_card,
          brand_id,
          api_provider_id,
          gift_card_brands (brand_name),
          gift_card_api_providers (provider_name)
        `)
        .eq("is_active", true)
        .order("brand_id");

      if (error) throw error;

      return pools.map((pool): PoolHealthStatus => {
        const available = pool.available_cards || 0;
        const threshold = pool.low_stock_threshold || 50;
        
        let status: "healthy" | "low" | "empty" = "healthy";
        if (available === 0) status = "empty";
        else if (available < 10) status = "low";
        else if (available < threshold) status = "low";

        return {
          poolId: pool.id,
          brandName: pool.gift_card_brands?.brand_name || "Unknown",
          denomination: pool.card_value,
          poolType: pool.pool_type as "csv" | "buffer" | "api_config",
          availableCards: available,
          totalCards: pool.total_cards || 0,
          threshold: threshold,
          status: status,
          apiProvider: pool.gift_card_api_providers?.provider_name,
          costPerCard: pool.cost_per_card
        };
      });
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch agency accounts
  const { data: agencyAccounts, isLoading: agenciesLoading } = useQuery({
    queryKey: ["admin-agency-accounts"],
    queryFn: async () => {
      const { data: agencies, error } = await supabase
        .from("agencies")
        .select(`
          id,
          name,
          credit_account_id,
          status,
          credit_accounts (
            total_purchased,
            total_allocated,
            total_used,
            total_remaining
          )
        `)
        .eq("status", "active");

      if (error) throw error;

      // Get client counts and monthly stats
      const agenciesWithStats = await Promise.all(
        agencies.map(async (agency) => {
          const { count: clientCount } = await supabase
            .from("clients")
            .select("*", { count: "only", head: true })
            .eq("agency_id", agency.id);

          // Get redemptions this month
          const firstDayOfMonth = new Date();
          firstDayOfMonth.setDate(1);
          firstDayOfMonth.setHours(0, 0, 0, 0);

          const { count: cardsThisMonth } = await supabase
            .from("gift_card_redemptions")
            .select("*", { count: "only", head: true })
            .gte("created_at", firstDayOfMonth.toISOString())
            .in("campaign_id", 
              supabase
                .from("campaigns")
                .select("id")
                .in("client_id",
                  supabase.from("clients").select("id").eq("agency_id", agency.id)
                )
            );

          return {
            agencyId: agency.id,
            agencyName: agency.name,
            creditBalance: agency.credit_accounts?.total_remaining || 0,
            totalClientsCount: clientCount || 0,
            activeClientsCount: clientCount || 0,
            cardsThisMonth: cardsThisMonth || 0,
            revenueThisMonth: 0,
            profitThisMonth: 0,
            topClients: []
          };
        })
      );

      return agenciesWithStats;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch recent system alerts
  const { data: systemAlerts } = useQuery({
    queryKey: ["system-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_alerts")
        .select("*")
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  // Calculate totals
  const csvPools = poolHealth?.filter(p => p.poolType === "csv") || [];
  const apiPools = poolHealth?.filter(p => p.poolType === "api_config") || [];
  const healthyPools = poolHealth?.filter(p => p.status === "healthy").length || 0;
  const lowPools = poolHealth?.filter(p => p.status === "low").length || 0;
  const emptyPools = poolHealth?.filter(p => p.status === "empty").length || 0;

  const getStatusBadge = (status: "healthy" | "low" | "empty") => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case "low":
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Low</Badge>;
      case "empty":
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Empty</Badge>;
    }
  };

  const getAlertBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case "info":
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gift Card Inventory</h1>
          <p className="text-muted-foreground">Master inventory control and agency management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure API
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Pools</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyPools}</div>
            <p className="text-xs text-muted-foreground">CSV & API configurations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowPools}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empty Pools</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emptyPools}</div>
            <p className="text-xs text-muted-foreground">Using API fallback</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agencies</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencyAccounts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">With credit accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      {systemAlerts && systemAlerts.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{systemAlerts.length} active system alerts</strong> - Check the Alerts tab for details
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
          <TabsTrigger value="agencies">Agency Accounts</TabsTrigger>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Master Inventory Status</CardTitle>
              <CardDescription>CSV pools and API configurations by brand and denomination</CardDescription>
            </CardHeader>
            <CardContent>
              {poolsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Denomination</TableHead>
                      <TableHead>Pool Type</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>API Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost/Card</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poolHealth?.map((pool) => (
                      <TableRow key={pool.poolId}>
                        <TableCell className="font-medium">{pool.brandName}</TableCell>
                        <TableCell>${pool.denomination}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">{pool.poolType}</Badge>
                        </TableCell>
                        <TableCell>{pool.availableCards.toLocaleString()}</TableCell>
                        <TableCell>{pool.totalCards.toLocaleString()}</TableCell>
                        <TableCell>{pool.apiProvider || "-"}</TableCell>
                        <TableCell>{getStatusBadge(pool.status)}</TableCell>
                        <TableCell>
                          {pool.costPerCard ? `$${pool.costPerCard.toFixed(2)}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agencies Tab */}
        <TabsContent value="agencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agency Accounts</CardTitle>
              <CardDescription>Credit balances and usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {agenciesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading agencies...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agency</TableHead>
                      <TableHead>Credit Balance</TableHead>
                      <TableHead>Clients</TableHead>
                      <TableHead>Cards This Month</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencyAccounts?.map((agency) => (
                      <TableRow key={agency.agencyId}>
                        <TableCell className="font-medium">{agency.agencyName}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                            {agency.creditBalance.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>{agency.totalClientsCount}</TableCell>
                        <TableCell>{agency.cardsThisMonth.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">Manage</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Active alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {systemAlerts && systemAlerts.length > 0 ? (
                <div className="space-y-3">
                  {systemAlerts.map((alert) => (
                    <Alert key={alert.id}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <div>
                          {getAlertBadge(alert.severity)}
                          <span className="ml-2">{alert.message}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">Resolve</Button>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  No active alerts - system is healthy
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

