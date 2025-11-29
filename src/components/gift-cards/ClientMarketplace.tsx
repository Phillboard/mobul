import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package } from "lucide-react";
import { formatCurrency } from '@/lib/utils/utils';
import { PurchasePoolDialog } from "./PurchasePoolDialog";

interface ClientMarketplaceProps {
  clientId: string;
}

export function ClientMarketplace({ clientId }: ClientMarketplaceProps) {
  const navigate = useNavigate();

  const { data: availablePools, isLoading } = useQuery({
    queryKey: ["marketplace-pools", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select(`
          *,
          gift_card_brands (
            brand_name,
            logo_url,
            category
          )
        `)
        .eq("is_master_pool", true)
        .eq("available_for_purchase", true)
        .gt("available_cards", 0)
        .order("gift_card_brands(brand_name)");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: client } = useQuery({
    queryKey: ["client-balance", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("name, credits")
        .eq("id", clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: purchaseHistory } = useQuery({
    queryKey: ["client-purchase-history", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_card_sales")
        .select(`
          *,
          gift_card_pools!admin_card_sales_master_pool_id_fkey(
            pool_name,
            gift_card_brands(brand_name)
          )
        `)
        .eq("buyer_client_id", clientId)
        .order("sale_date", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  // Group pools by brand
  const poolsByBrand = availablePools?.reduce((acc, pool) => {
    const brandName = pool.gift_card_brands?.brand_name || 'Other';
    if (!acc[brandName]) {
      acc[brandName] = [];
    }
    acc[brandName].push(pool);
    return acc;
  }, {} as Record<string, any[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading marketplace...
        </CardContent>
      </Card>
    );
  }

  if (!availablePools || availablePools.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pools Available</h3>
          <p className="text-muted-foreground">
            There are no gift card pools available for purchase at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Wallet</span>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(client?.credits || 0)}
            </span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Available Pools by Brand */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Gift Cards</h2>
          <p className="text-muted-foreground">Purchase gift cards to use in your campaigns</p>
        </div>

        {Object.entries(poolsByBrand || {}).map(([brandName, brandPools]) => (
          <Card key={brandName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {brandName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brandPools.map((pool) => (
                  <Card key={pool.id} className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{pool.pool_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {pool.gift_card_brands?.category}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Card Value:</span>
                          <span className="font-semibold">{formatCurrency(pool.card_value)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Price per Card:</span>
                          <span className="font-bold text-primary">
                            {formatCurrency(pool.sale_price_per_card || pool.card_value)}
                          </span>
                        </div>
                        {pool.markup_percentage && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Markup:</span>
                            <span>{pool.markup_percentage}%</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {pool.available_cards} available
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Min: {pool.min_purchase_quantity || 1}
                        </span>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => navigate(`/gift-cards/purchase/${pool.id}`)}
                        disabled={(client?.credits || 0) < (pool.sale_price_per_card || pool.card_value)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Purchase
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Purchase History */}
      {purchaseHistory && purchaseHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {purchaseHistory.map((purchase) => (
                <div 
                  key={purchase.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                >
                  <div>
                    <p className="font-semibold">
                      {purchase.gift_card_pools?.gift_card_brands?.brand_name} - {purchase.gift_card_pools?.pool_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(purchase.sale_date).toLocaleDateString()} • {purchase.quantity} cards
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(purchase.total_amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(purchase.price_per_card)}/card
                    </p>
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