/**
 * EditPoolPricing Page
 * 
 * Admin-only page for managing gift card pool pricing
 * 
 * Converted from EditPoolPricingDialog to full page
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useToast } from '@/shared/hooks';
import { DollarSign, ArrowLeft, Save, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/shared/components/ui/breadcrumb";
import { formatCurrency } from '@/shared/utils/utils';

export default function EditPoolPricing() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [salePrice, setSalePrice] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch pool details
  const { data: pool, isLoading } = useQuery({
    queryKey: ["gift-card-pool", poolId],
    queryFn: async () => {
      if (!poolId) return null;
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("*, gift_card_brands(*)")
        .eq("id", poolId)
        .single();
      if (error) throw error;

      // Set initial values
      setSalePrice(data.sale_price_per_card?.toString() || data.card_value.toString());
      setMinQuantity(data.min_purchase_quantity?.toString() || "1");
      setMaxQuantity(data.max_purchase_quantity?.toString() || "");

      return data;
    },
    enabled: !!poolId,
  });

  if (isLoading || !pool) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  const cardValue = Number(pool.card_value);
  const salePriceNum = parseFloat(salePrice) || 0;
  const profitMargin = cardValue > 0 ? ((cardValue - salePriceNum) / cardValue * 100) : 0;
  const isDiscount = salePriceNum < cardValue;

  const handleUpdate = async () => {
    if (!salePrice) {
      toast({
        title: "Missing Information",
        description: "Please enter a sale price",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("gift_card_pools")
        .update({
          sale_price_per_card: parseFloat(salePrice),
          min_purchase_quantity: minQuantity ? parseInt(minQuantity) : null,
          max_purchase_quantity: maxQuantity ? parseInt(maxQuantity) : null,
        })
        .eq("id", poolId);

      if (error) throw error;

      toast({
        title: "Pricing Updated",
        description: "Pool pricing has been successfully updated",
      });

      queryClient.invalidateQueries({ queryKey: ["gift-card-pool", poolId] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-pools"] });

      navigate(`/gift-cards/pools/${poolId}`);
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/gift-cards">Gift Cards</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/gift-cards/pools/${poolId}`}>
                {pool.pool_name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Pricing</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/gift-cards/pools/${poolId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Pool Pricing</h1>
            <p className="text-muted-foreground">
              {pool.gift_card_brands?.brand_name} - {pool.pool_name}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Pricing Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pricing Configuration</CardTitle>
                <CardDescription>
                  Set the sale price and purchase limits for this pool
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pool Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {pool.gift_card_brands?.logo_url && (
                      <img 
                        src={pool.gift_card_brands.logo_url} 
                        alt={pool.gift_card_brands.brand_name}
                        className="h-10 w-10 object-contain"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{pool.pool_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Card Value: {formatCurrency(cardValue)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sale Price */}
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Sale Price Per Card ($) *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Enter sale price"
                  />
                  <p className="text-sm text-muted-foreground">
                    Card face value is {formatCurrency(cardValue)}
                  </p>
                </div>

                {/* Purchase Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minQuantity">Minimum Quantity</Label>
                    <Input
                      id="minQuantity"
                      type="number"
                      min="1"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="Minimum cards per purchase"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxQuantity">Maximum Quantity</Label>
                    <Input
                      id="maxQuantity"
                      type="number"
                      min="1"
                      value={maxQuantity}
                      onChange={(e) => setMaxQuantity(e.target.value)}
                      placeholder="Maximum cards per purchase (optional)"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleUpdate}
                    disabled={!salePrice || updating}
                    className="gap-2"
                    size="lg"
                  >
                    <Save className="h-4 w-4" />
                    {updating ? "Saving..." : "Save Pricing"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/gift-cards/pools/${poolId}`)}
                    disabled={updating}
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Analysis Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Pricing Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Card Face Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(cardValue)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Sale Price</p>
                      <p className="text-2xl font-bold text-primary">
                        {salePrice ? formatCurrency(salePriceNum) : "—"}
                      </p>
                    </div>

                    {salePrice && (
                      <>
                        <div className="border-t pt-3">
                          <p className="text-sm text-muted-foreground">Profit Margin</p>
                          <p className={`text-xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitMargin.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {isDiscount ? `${formatCurrency(cardValue - salePriceNum)} profit per card` : 
                             salePriceNum > cardValue ? `${formatCurrency(salePriceNum - cardValue)} loss per card` :
                             'Break even'}
                          </p>
                        </div>

                        {minQuantity && (
                          <div className="border-t pt-3">
                            <p className="text-sm text-muted-foreground">Min Order Value</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(salePriceNum * parseInt(minQuantity))}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {salePriceNum < cardValue * 0.8 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ Sale price is significantly below face value. Ensure this discount is intentional.
                      </p>
                    </div>
                  )}

                  {salePriceNum > cardValue && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-xs text-red-800 dark:text-red-200">
                        ⚠️ Sale price exceeds face value. This may reduce demand.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

