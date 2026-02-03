/**
 * AgencyPricingTab Component
 * 
 * Agency-level tab for viewing costs and setting client markup.
 * Shows the agency's cost per card and calculates client prices.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { DollarSign, TrendingUp, Save, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { formatCurrency } from "@/shared/utils/currencyUtils";
import { toast } from "sonner";

interface AgencyPricingTabProps {
  agencyId: string;
  agencyName?: string;
}

interface AgencyPricingData {
  brandId: string;
  brandName: string;
  brandLogo?: string;
  denomination: number;
  agencyCost: number; // What the agency pays
  defaultMarkup: number;
  clientPrice: number; // What clients pay (calculated)
}

export function AgencyPricingTab({ agencyId, agencyName }: AgencyPricingTabProps) {
  const queryClient = useQueryClient();
  const [markupPercentage, setMarkupPercentage] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch agency data including markup
  const { data: agencyData } = useQuery({
    queryKey: ["agency-data", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name, gift_card_markup_percentage, default_markup_percentage")
        .eq("id", agencyId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Set initial markup from agency data
  useMemo(() => {
    if (agencyData?.gift_card_markup_percentage != null && markupPercentage === "") {
      setMarkupPercentage(agencyData.gift_card_markup_percentage.toString());
    }
  }, [agencyData, markupPercentage]);

  // Fetch pricing data for agency's enabled brands
  const { data: pricingData, isLoading } = useQuery({
    queryKey: ["agency-pricing-view", agencyId],
    queryFn: async () => {
      // Get agency's enabled brands with their denominations
      const { data: agencyBrands, error: brandsError } = await supabase
        .from("agency_available_gift_cards")
        .select(`
          brand_id,
          denomination,
          gift_card_brands (brand_name, logo_url)
        `)
        .eq("agency_id", agencyId)
        .eq("is_enabled", true);

      if (brandsError) throw brandsError;

      // Get pricing from denominations table
      const { data: denomPricing, error: pricingError } = await supabase
        .from("gift_card_denominations")
        .select("brand_id, denomination, agency_price, cost_basis");

      if (pricingError) throw pricingError;

      // Create pricing map
      const pricingMap = new Map<string, { agencyPrice: number | null; costBasis: number | null }>();
      denomPricing?.forEach((item) => {
        const key = `${item.brand_id}-${item.denomination}`;
        pricingMap.set(key, {
          agencyPrice: item.agency_price,
          costBasis: item.cost_basis,
        });
      });

      // Build pricing data
      const result: AgencyPricingData[] = (agencyBrands || []).map((item: any) => {
        const key = `${item.brand_id}-${item.denomination}`;
        const pricing = pricingMap.get(key);
        const brand = item.gift_card_brands;
        
        // Agency cost is the agency_price from denominations, or fall back to face value
        const agencyCost = pricing?.agencyPrice || item.denomination;
        
        return {
          brandId: item.brand_id,
          brandName: brand?.brand_name || "Unknown",
          brandLogo: brand?.logo_url,
          denomination: Number(item.denomination),
          agencyCost,
          defaultMarkup: agencyData?.gift_card_markup_percentage || 0,
          clientPrice: agencyCost * (1 + (agencyData?.gift_card_markup_percentage || 0) / 100),
        };
      });

      return result.sort((a, b) => a.brandName.localeCompare(b.brandName) || a.denomination - b.denomination);
    },
    enabled: !!agencyId,
  });

  // Update markup mutation
  const updateMarkup = useMutation({
    mutationFn: async (newMarkup: number) => {
      const { error } = await supabase
        .from("agencies")
        .update({ gift_card_markup_percentage: newMarkup })
        .eq("id", agencyId);

      if (error) throw error;
      return newMarkup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-data", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-pricing-view", agencyId] });
      toast.success("Markup percentage saved");
    },
    onError: (error) => {
      console.error("Failed to update markup:", error);
      toast.error("Failed to save markup percentage");
    },
  });

  // Handle save markup
  const handleSaveMarkup = async () => {
    const markup = parseFloat(markupPercentage);
    if (isNaN(markup) || markup < 0) {
      toast.error("Please enter a valid markup percentage");
      return;
    }
    await updateMarkup.mutateAsync(markup);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!pricingData) return { avgCost: 0, avgClientPrice: 0, avgMargin: 0 };

    const totalCost = pricingData.reduce((sum, p) => sum + p.agencyCost, 0);
    const totalClientPrice = pricingData.reduce((sum, p) => sum + p.clientPrice, 0);
    const count = pricingData.length;

    return {
      avgCost: count > 0 ? totalCost / count : 0,
      avgClientPrice: count > 0 ? totalClientPrice / count : 0,
      avgMargin: parseFloat(markupPercentage) || 0,
    };
  }, [pricingData, markupPercentage]);

  // Recalculate client prices when markup changes
  const calculatedPricing = useMemo(() => {
    if (!pricingData) return [];
    const markup = parseFloat(markupPercentage) || 0;
    
    return pricingData.map(item => ({
      ...item,
      clientPrice: item.agencyCost * (1 + markup / 100),
    }));
  }, [pricingData, markupPercentage]);

  return (
    <div className="space-y-6">
      {/* Markup Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Client Pricing Markup
          </CardTitle>
          <CardDescription>
            Set a markup percentage that will be applied to your costs when billing clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="markup">Default Markup Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="markup"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(e.target.value)}
                  className="w-32"
                  placeholder="7.5"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>
            <Button
              onClick={handleSaveMarkup}
              disabled={updateMarkup.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMarkup.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Current markup: <strong>{agencyData?.gift_card_markup_percentage || 0}%</strong>
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Cost (Avg)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Client Price (Avg)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.avgClientPrice)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Margin
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Pricing Preview</CardTitle>
          <CardDescription>
            Shows your cost and the calculated client price with the current markup
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading pricing data...
            </div>
          ) : calculatedPricing.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead className="text-right">Face Value</TableHead>
                    <TableHead className="text-right">Your Cost</TableHead>
                    <TableHead className="text-right">Client Price</TableHead>
                    <TableHead className="text-right">Your Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calculatedPricing.map((item, index) => {
                    const profit = item.clientPrice - item.agencyCost;
                    
                    return (
                      <TableRow key={`${item.brandId}-${item.denomination}-${index}`}>
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
                        <TableCell className="text-right">
                          ${item.denomination}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.agencyCost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.clientPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={profit > 0 ? "default" : "secondary"}>
                            {formatCurrency(profit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No brands are currently enabled for your agency</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
