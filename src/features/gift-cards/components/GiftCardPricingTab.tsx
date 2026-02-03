/**
 * GiftCardPricingTab Component
 * 
 * Admin tab for configuring gift card pricing across all levels.
 * Includes cost basis, agency price, client price, and margin calculation.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DollarSign, TrendingUp, Edit2, Save, X, Calculator, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { formatCurrency } from "@/shared/utils/currencyUtils";
import { toast } from "sonner";

interface DenominationPricing {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo?: string;
  denomination: number;
  costBasis: number | null;
  adminCost: number | null;
  tilloCost: number | null;
  agencyPrice: number | null;
  clientPrice: number | null;
  useCustomPricing: boolean;
}

export function GiftCardPricingTab() {
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    costBasis: string;
    agencyPrice: string;
    clientPrice: string;
  }>({ costBasis: "", agencyPrice: "", clientPrice: "" });

  // Fetch pricing data
  const { data: pricingData, isLoading } = useQuery({
    queryKey: ["admin-gift-card-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_denominations")
        .select(`
          id,
          brand_id,
          denomination,
          cost_basis,
          admin_cost_per_card,
          tillo_cost_per_card,
          agency_price,
          client_price,
          use_custom_pricing,
          gift_card_brands!inner(brand_name, logo_url)
        `)
        .order("brand_id")
        .order("denomination");

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        brandId: item.brand_id,
        brandName: item.gift_card_brands.brand_name,
        brandLogo: item.gift_card_brands.logo_url,
        denomination: Number(item.denomination),
        costBasis: item.cost_basis ? Number(item.cost_basis) : null,
        adminCost: item.admin_cost_per_card ? Number(item.admin_cost_per_card) : null,
        tilloCost: item.tillo_cost_per_card ? Number(item.tillo_cost_per_card) : null,
        agencyPrice: item.agency_price ? Number(item.agency_price) : null,
        clientPrice: item.client_price ? Number(item.client_price) : null,
        useCustomPricing: item.use_custom_pricing || false,
      })) as DenominationPricing[];
    },
  });

  // Get unique brands for filter
  const brands = useMemo(() => {
    if (!pricingData) return [];
    const brandMap = new Map<string, { id: string; name: string }>();
    pricingData.forEach((p) => {
      if (!brandMap.has(p.brandId)) {
        brandMap.set(p.brandId, { id: p.brandId, name: p.brandName });
      }
    });
    return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [pricingData]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!pricingData) return [];
    if (selectedBrand === "all") return pricingData;
    return pricingData.filter((p) => p.brandId === selectedBrand);
  }, [pricingData, selectedBrand]);

  // Update mutation
  const updatePricing = useMutation({
    mutationFn: async ({
      id,
      costBasis,
      agencyPrice,
      clientPrice,
    }: {
      id: string;
      costBasis: number | null;
      agencyPrice: number | null;
      clientPrice: number | null;
    }) => {
      const { error } = await supabase
        .from("gift_card_denominations")
        .update({
          cost_basis: costBasis,
          agency_price: agencyPrice,
          client_price: clientPrice,
          use_custom_pricing: agencyPrice !== null || clientPrice !== null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-card-pricing"] });
      setEditingId(null);
      toast.success("Pricing updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update pricing:", error);
      toast.error("Failed to update pricing");
    },
  });

  // Start editing
  const startEdit = (item: DenominationPricing) => {
    setEditingId(item.id);
    setEditValues({
      costBasis: item.costBasis?.toString() || "",
      agencyPrice: item.agencyPrice?.toString() || "",
      clientPrice: item.clientPrice?.toString() || "",
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ costBasis: "", agencyPrice: "", clientPrice: "" });
  };

  // Save editing
  const saveEdit = () => {
    if (!editingId) return;

    updatePricing.mutate({
      id: editingId,
      costBasis: editValues.costBasis ? parseFloat(editValues.costBasis) : null,
      agencyPrice: editValues.agencyPrice ? parseFloat(editValues.agencyPrice) : null,
      clientPrice: editValues.clientPrice ? parseFloat(editValues.clientPrice) : null,
    });
  };

  // Calculate margin
  const calculateMargin = (sellPrice: number | null, costBasis: number | null): string => {
    if (!sellPrice || !costBasis || costBasis === 0) return "-";
    const margin = ((sellPrice - costBasis) / costBasis) * 100;
    return `${margin.toFixed(1)}%`;
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!filteredData.length) return { avgMargin: 0, configured: 0, total: 0 };
    
    let totalMargin = 0;
    let marginCount = 0;
    let configured = 0;
    
    filteredData.forEach((item) => {
      if (item.useCustomPricing) configured++;
      
      const sellPrice = item.clientPrice || item.denomination;
      const cost = item.costBasis || item.denomination * 0.95;
      if (cost > 0) {
        totalMargin += ((sellPrice - cost) / cost) * 100;
        marginCount++;
      }
    });
    
    return {
      avgMargin: marginCount > 0 ? totalMargin / marginCount : 0,
      configured,
      total: filteredData.length,
    };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Margin
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.avgMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {filteredData.length} denominations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custom Pricing
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.configured}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {stats.total} configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Brands
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brands.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              with pricing configured
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Denomination Pricing</CardTitle>
              <CardDescription>
                Configure cost basis and sell prices for each brand and denomination
              </CardDescription>
            </div>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading pricing data...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Face Value</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Agency Price</TableHead>
                    <TableHead className="text-right">Client Price</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => {
                    const isEditing = editingId === item.id;
                    const effectiveCost = item.costBasis || item.denomination * 0.95;
                    const effectiveSellPrice = item.clientPrice || item.denomination;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.brandLogo && (
                              <img
                                src={item.brandLogo}
                                alt={item.brandName}
                                className="h-6 w-6 object-contain"
                              />
                            )}
                            <span className="font-medium">{item.brandName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.denomination}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.costBasis}
                              onChange={(e) =>
                                setEditValues((v) => ({ ...v, costBasis: e.target.value }))
                              }
                              className="w-24 h-8 text-right"
                              placeholder={`${(item.denomination * 0.95).toFixed(2)}`}
                            />
                          ) : (
                            <span className={item.costBasis ? "" : "text-muted-foreground"}>
                              {item.costBasis
                                ? formatCurrency(item.costBasis)
                                : formatCurrency(item.denomination * 0.95)}
                              {!item.costBasis && <span className="text-xs ml-1">(est)</span>}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.agencyPrice}
                              onChange={(e) =>
                                setEditValues((v) => ({ ...v, agencyPrice: e.target.value }))
                              }
                              className="w-24 h-8 text-right"
                              placeholder={`${item.denomination.toFixed(2)}`}
                            />
                          ) : item.agencyPrice ? (
                            formatCurrency(item.agencyPrice)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editValues.clientPrice}
                              onChange={(e) =>
                                setEditValues((v) => ({ ...v, clientPrice: e.target.value }))
                              }
                              className="w-24 h-8 text-right"
                              placeholder={`${item.denomination.toFixed(2)}`}
                            />
                          ) : item.clientPrice ? (
                            formatCurrency(item.clientPrice)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              effectiveSellPrice > effectiveCost
                                ? "default"
                                : effectiveSellPrice < effectiveCost
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {calculateMargin(effectiveSellPrice, effectiveCost)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={saveEdit}
                                disabled={updatePricing.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(item)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Margin Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Margin Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MarginCalculator />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Simple margin calculator component
 */
function MarginCalculator() {
  const [cost, setCost] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  const result = useMemo(() => {
    const costNum = parseFloat(cost);
    const sellNum = parseFloat(sellPrice);

    if (isNaN(costNum) || isNaN(sellNum) || costNum === 0) {
      return null;
    }

    const profit = sellNum - costNum;
    const margin = (profit / costNum) * 100;
    const markup = (profit / sellNum) * 100;

    return { profit, margin, markup };
  }, [cost, sellPrice]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Cost</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-32 pl-7"
            placeholder="23.75"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Sell Price</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            step="0.01"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            className="w-32 pl-7"
            placeholder="25.00"
          />
        </div>
      </div>

      {result && (
        <div className="flex gap-6 pl-4 border-l">
          <div>
            <p className="text-sm text-muted-foreground">Profit</p>
            <p className={`text-lg font-semibold ${result.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(result.profit)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Margin</p>
            <p className={`text-lg font-semibold ${result.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {result.margin.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Markup</p>
            <p className="text-lg font-semibold">{result.markup.toFixed(1)}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
