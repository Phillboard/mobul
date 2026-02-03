/**
 * Unified Admin Gift Cards Dashboard
 *
 * Single entry point for all admin gift card management:
 * - Overview with stats and alerts
 * - Brand & denomination management
 * - Master inventory (summary, individual cards, assigned cards)
 * - Sales history & analytics
 * - System monitoring
 */

import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Package, ShoppingBag, BarChart3, Plus, Gift, Activity, AlertTriangle, DollarSign, TrendingUp, CreditCard, PieChart, Building2, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { GiftCardBrandsTab } from "@/features/gift-cards/components/GiftCardBrandsTab";
import { GiftCardInventoryTab } from "@/features/gift-cards/components/GiftCardInventoryTab";
import { AddGiftCardsWizard } from "@/features/gift-cards/components/AddGiftCardsWizard";
import { AgencyBrandAccessTab } from "@/features/gift-cards/components/AgencyBrandAccessTab";
import { GiftCardPricingTab } from "@/features/gift-cards/components/GiftCardPricingTab";
import { GiftCardReportsTab } from "@/features/gift-cards/components/GiftCardReportsTab";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { formatCurrency } from "@/shared/utils/currencyUtils";
import { calculateProfitMargin } from "@/features/gift-cards/lib/provisioning-utils";
import { useGiftCardBrandsWithDenominations, useAdminBillingStats, useTopSpendingClients } from "@/features/gift-cards/hooks";

export default function AdminGiftCards() {
  const [activeTab, setActiveTab] = useState("overview");
  const [wizardOpen, setWizardOpen] = useState(false);

  // Overview data
  const { data: brandsWithDenoms } = useGiftCardBrandsWithDenominations(false);

  const { data: inventoryStats } = useQuery({
    queryKey: ["admin-gift-card-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_inventory")
        .select("status, denomination");
      if (error) throw error;

      let available = 0, assigned = 0, delivered = 0, totalValue = 0;
      data?.forEach((c: any) => {
        if (c.status === "available") { available++; totalValue += Number(c.denomination); }
        if (c.status === "assigned") { assigned++; totalValue += Number(c.denomination); }
        if (c.status === "delivered") delivered++;
      });

      return { available, assigned, delivered, totalValue, total: data?.length || 0 };
    },
  });

  // Recent sales
  const { data: recentSales } = useQuery({
    queryKey: ["admin-recent-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_card_sales")
        .select(`
          id, quantity, total_amount, profit, created_at, notes,
          clients:buyer_client_id(name),
          gift_card_pools:master_pool_id(pool_name, gift_card_brands(brand_name))
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data;
    },
  });

  // System alerts
  const { data: systemAlerts } = useQuery({
    queryKey: ["admin-system-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_alerts")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return data;
    },
  });

  // Financial data
  const { data: billingStats } = useAdminBillingStats();
  const { data: topClients } = useTopSpendingClients(10);

  const activeBrands = brandsWithDenoms?.filter(b => b.is_enabled_by_admin || b.is_active).length || 0;
  const totalDenoms = brandsWithDenoms?.reduce((sum, b) => sum + (b.denominations?.length || 0), 0) || 0;
  const unresolvedAlerts = systemAlerts?.length || 0;
  const profitMargin = billingStats
    ? calculateProfitMargin(billingStats.totalRevenue, billingStats.totalRevenue - billingStats.totalProfit)
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gift Card Administration</h1>
            <p className="text-muted-foreground mt-2">
              Manage brands, inventory, sales, and system health
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Gift Cards
          </Button>
        </div>

        <AddGiftCardsWizard open={wizardOpen} onOpenChange={setWizardOpen} />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="brands">
              <Package className="h-4 w-4 mr-2" />
              Brands
            </TabsTrigger>
            <TabsTrigger value="agency-access">
              <Building2 className="h-4 w-4 mr-2" />
              Agency Access
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="monitoring">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Monitoring
              {unresolvedAlerts > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {unresolvedAlerts}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ========== OVERVIEW TAB ========== */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory Value</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(inventoryStats?.totalValue || 0)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{inventoryStats?.total || 0} total cards</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Available Cards</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(inventoryStats?.available || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {inventoryStats?.assigned || 0} assigned, {inventoryStats?.delivered || 0} delivered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Brands</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeBrands}</div>
                  <p className="text-xs text-muted-foreground mt-1">{totalDenoms} denominations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {unresolvedAlerts === 0 ? (
                      <span className="text-green-600">Healthy</span>
                    ) : (
                      <span className="text-yellow-600">{unresolvedAlerts} Alert{unresolvedAlerts > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts */}
            {systemAlerts && systemAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {systemAlerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{alert.alert_type}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Sales */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {recentSales && recentSales.length > 0 ? (
                  <div className="space-y-3">
                    {recentSales.map((sale: any) => {
                      const client = sale.clients as any;
                      const pool = sale.gift_card_pools as any;
                      const brand = pool?.gift_card_brands as any;
                      return (
                        <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">
                              {sale.quantity} cards to {client?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {brand?.brand_name || pool?.pool_name || "Pool"} - {new Date(sale.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(sale.total_amount)}</p>
                            {sale.profit != null && (
                              <p className={`text-xs ${sale.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {sale.profit >= 0 ? "+" : ""}{formatCurrency(sale.profit)} profit
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No sales recorded yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== BRANDS TAB ========== */}
          <TabsContent value="brands" className="space-y-4">
            <GiftCardBrandsTab />
          </TabsContent>

          {/* ========== AGENCY ACCESS TAB ========== */}
          <TabsContent value="agency-access" className="space-y-4">
            <AgencyBrandAccessTab />
          </TabsContent>

          {/* ========== PRICING TAB ========== */}
          <TabsContent value="pricing" className="space-y-4">
            <GiftCardPricingTab />
          </TabsContent>

          {/* ========== INVENTORY TAB ========== */}
          <TabsContent value="inventory" className="space-y-4">
            <GiftCardInventoryTab />
          </TabsContent>

          {/* ========== REPORTS TAB ========== */}
          <TabsContent value="reports" className="space-y-4">
            <GiftCardReportsTab />
          </TabsContent>

          {/* ========== MONITORING TAB ========== */}
          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {systemAlerts && systemAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {systemAlerts.map((alert: any) => (
                      <div key={alert.id} className="flex items-start gap-3 p-4 rounded-lg border">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{alert.alert_type}</p>
                            <Badge variant="outline" className="text-xs">
                              {alert.severity || "warning"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">All systems healthy</p>
                    <p className="text-sm mt-1">No unresolved alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
