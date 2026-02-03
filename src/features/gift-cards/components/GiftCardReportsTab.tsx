/**
 * GiftCardReportsTab Component
 * 
 * Admin reports tab for profit analytics and inventory insights.
 * Shows revenue, costs, profit margins, and trends.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/shared/components/ui/table";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  BarChart3,
  PieChart,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { formatCurrency } from "@/shared/utils/currencyUtils";

interface ProfitByBrand {
  brandId: string;
  brandName: string;
  brandLogo?: string;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
  cardsProvisioned: number;
}

interface ProfitByAgency {
  agencyId: string;
  agencyName: string;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
  cardsProvisioned: number;
}

export function GiftCardReportsTab() {
  // Fetch billing ledger data
  const { data: billingData, isLoading: isLoadingBilling } = useQuery({
    queryKey: ["admin-gift-card-billing-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_billing_ledger")
        .select(`
          id,
          amount_billed,
          cost_basis,
          brand_id,
          billed_entity_type,
          billed_entity_id,
          billed_at,
          metadata,
          gift_card_brands (brand_name, logo_url)
        `)
        .order("billed_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agency names
  const { data: agencies } = useQuery({
    queryKey: ["agencies-for-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name");
      if (error) throw error;
      
      const map = new Map<string, string>();
      data?.forEach(a => map.set(a.id, a.name));
      return map;
    },
  });

  // Fetch client names
  const { data: clients } = useQuery({
    queryKey: ["clients-for-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name");
      if (error) throw error;
      
      const map = new Map<string, string>();
      data?.forEach(c => map.set(c.id, c.name));
      return map;
    },
  });

  // Fetch low stock alerts
  const { data: lowStockBrands } = useQuery({
    queryKey: ["low-stock-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_inventory")
        .select(`
          brand_id,
          denomination,
          gift_card_brands (brand_name, logo_url)
        `)
        .eq("status", "available");

      if (error) throw error;

      // Count by brand + denomination
      const counts = new Map<string, {
        brandId: string;
        brandName: string;
        brandLogo?: string;
        denomination: number;
        count: number;
      }>();

      data?.forEach((item: any) => {
        const key = `${item.brand_id}-${item.denomination}`;
        if (!counts.has(key)) {
          counts.set(key, {
            brandId: item.brand_id,
            brandName: item.gift_card_brands?.brand_name || "Unknown",
            brandLogo: item.gift_card_brands?.logo_url,
            denomination: item.denomination,
            count: 0,
          });
        }
        counts.get(key)!.count++;
      });

      // Filter to low stock (< 10 cards)
      return Array.from(counts.values())
        .filter(b => b.count < 10)
        .sort((a, b) => a.count - b.count);
    },
  });

  // Calculate profit by brand
  const profitByBrand = useMemo((): ProfitByBrand[] => {
    if (!billingData) return [];

    const brandMap = new Map<string, ProfitByBrand>();

    billingData.forEach((item: any) => {
      if (!item.brand_id) return;

      const key = item.brand_id;
      if (!brandMap.has(key)) {
        const brand = item.gift_card_brands as any;
        brandMap.set(key, {
          brandId: key,
          brandName: brand?.brand_name || "Unknown",
          brandLogo: brand?.logo_url,
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          cardsProvisioned: 0,
        });
      }

      const stats = brandMap.get(key)!;
      stats.totalRevenue += Number(item.amount_billed) || 0;
      stats.totalCost += Number(item.cost_basis) || 0;
      stats.cardsProvisioned++;
    });

    // Calculate profit and margin
    return Array.from(brandMap.values())
      .map(b => ({
        ...b,
        profit: b.totalRevenue - b.totalCost,
        margin: b.totalCost > 0 ? ((b.totalRevenue - b.totalCost) / b.totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [billingData]);

  // Calculate profit by entity (agency/client)
  const profitByEntity = useMemo((): ProfitByAgency[] => {
    if (!billingData || !agencies || !clients) return [];

    const entityMap = new Map<string, ProfitByAgency>();

    billingData.forEach((item: any) => {
      const key = `${item.billed_entity_type}-${item.billed_entity_id}`;
      
      if (!entityMap.has(key)) {
        let entityName = "Unknown";
        if (item.billed_entity_type === "agency") {
          entityName = agencies.get(item.billed_entity_id) || "Unknown Agency";
        } else if (item.billed_entity_type === "client") {
          entityName = clients.get(item.billed_entity_id) || "Unknown Client";
        }

        entityMap.set(key, {
          agencyId: item.billed_entity_id,
          agencyName: entityName,
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          cardsProvisioned: 0,
        });
      }

      const stats = entityMap.get(key)!;
      stats.totalRevenue += Number(item.amount_billed) || 0;
      stats.totalCost += Number(item.cost_basis) || 0;
      stats.cardsProvisioned++;
    });

    return Array.from(entityMap.values())
      .map(e => ({
        ...e,
        profit: e.totalRevenue - e.totalCost,
        margin: e.totalCost > 0 ? ((e.totalRevenue - e.totalCost) / e.totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [billingData, agencies, clients]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!billingData) return { revenue: 0, cost: 0, profit: 0, margin: 0, cards: 0 };

    let revenue = 0;
    let cost = 0;
    let cards = 0;

    billingData.forEach((item: any) => {
      revenue += Number(item.amount_billed) || 0;
      cost += Number(item.cost_basis) || 0;
      cards++;
    });

    return {
      revenue,
      cost,
      profit: revenue - cost,
      margin: cost > 0 ? ((revenue - cost) / cost) * 100 : 0,
      cards,
    };
  }, [billingData]);

  // Calculate source breakdown
  const sourceBreakdown = useMemo(() => {
    if (!billingData) return { inventory: 0, tillo: 0 };

    let inventory = 0;
    let tillo = 0;

    billingData.forEach((item: any) => {
      const source = item.metadata?.source;
      if (source === "tillo") {
        tillo++;
      } else {
        inventory++;
      }
    });

    return { inventory, tillo };
  }, [billingData]);

  if (isLoadingBilling) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overallStats.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overallStats.cards.toLocaleString()} cards provisioned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overallStats.cost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {formatCurrency(overallStats.cards > 0 ? overallStats.cost / overallStats.cards : 0)}/card
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Profit
            </CardTitle>
            {overallStats.profit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overallStats.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(overallStats.profit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overallStats.margin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sourcing
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">{sourceBreakdown.inventory}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-2xl font-bold text-purple-600">{sourceBreakdown.tillo}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Inventory / Tillo API
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockBrands && lowStockBrands.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Brands with fewer than 10 cards available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {lowStockBrands.slice(0, 8).map((brand) => (
                <div
                  key={`${brand.brandId}-${brand.denomination}`}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/10"
                >
                  {brand.brandLogo && (
                    <img src={brand.brandLogo} alt={brand.brandName} className="h-8 w-8 object-contain" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{brand.brandName}</p>
                    <p className="text-xs text-muted-foreground">${brand.denomination}</p>
                  </div>
                  <Badge variant={brand.count === 0 ? "destructive" : "secondary"}>
                    {brand.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profit by Brand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Profit by Brand
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitByBrand.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Cards</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitByBrand.map((brand) => (
                    <TableRow key={brand.brandId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {brand.brandLogo && (
                            <img src={brand.brandLogo} alt={brand.brandName} className="h-6 w-6 object-contain" />
                          )}
                          <span className="font-medium">{brand.brandName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(brand.totalRevenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(brand.totalCost)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${brand.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(brand.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={brand.margin >= 5 ? "default" : brand.margin >= 0 ? "secondary" : "destructive"}>
                          {brand.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{brand.cardsProvisioned}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No billing data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit by Entity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Profit by Agency/Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitByEntity.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Cards</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitByEntity.map((entity, index) => (
                    <TableRow key={`${entity.agencyId}-${index}`}>
                      <TableCell className="font-medium">{entity.agencyName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entity.totalRevenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(entity.totalCost)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${entity.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(entity.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={entity.margin >= 5 ? "default" : entity.margin >= 0 ? "secondary" : "destructive"}>
                          {entity.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{entity.cardsProvisioned}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No billing data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
