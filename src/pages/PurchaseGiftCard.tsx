/**
 * PurchaseGiftCard Page
 * 
 * Full-page checkout-style interface for purchasing gift cards from pools
 * 
 * Converted from PurchasePoolDialog to full page for better UX
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Wallet, CreditCard, TrendingUp, ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatCurrency } from '@/lib/utils/utils';
import { useAuth } from "@core/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function PurchaseGiftCard() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  
  const [quantity, setQuantity] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  // Fetch pool details
  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: ["marketplace-pool", poolId],
    queryFn: async () => {
      if (!poolId) return null;
      const { data, error } = await supabase
        .from("gift_card_pools")
        .select("*, gift_card_brands(*)")
        .eq("id", poolId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!poolId,
  });

  // Fetch client balance
  const { data: clientBalance } = useQuery({
    queryKey: ["client-balance"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: clientUser } = await supabase
        .from("client_users")
        .select("client_id")
        .eq("user_id", user.id)
        .single();

      if (!clientUser) return 0;

      const { data: client } = await supabase
        .from("clients")
        .select("balance")
        .eq("id", clientUser.client_id)
        .single();

      return Number(client?.balance || 0);
    },
  });

  if (!pool || poolLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  const minQty = pool.min_purchase_quantity || 1;
  const pricePerCard = pool.sale_price_per_card || pool.card_value;
  const totalCost = parseInt(quantity || "0") * pricePerCard;
  const remainingBalance = (clientBalance || 0) - totalCost;
  const canAfford = remainingBalance >= 0;
  const qty = parseInt(quantity || "0");
  const isValidQuantity = qty >= minQty && qty <= pool.available_cards;

  const handlePurchase = async () => {
    if (!canAfford) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough credits to complete this purchase.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidQuantity) {
      toast({
        title: "Invalid Quantity",
        description: `Please enter a quantity between ${minQty} and ${pool.available_cards}`,
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);
    try {
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("client_id")
        .eq("user_id", session?.user?.id)
        .single();

      if (!clientUser) throw new Error("Client not found");

      const { data, error } = await supabase.functions.invoke("transfer-admin-cards", {
        body: {
          masterPoolId: poolId,
          buyerClientId: clientUser.client_id,
          quantity: qty,
          pricePerCard: pricePerCard,
          soldByUserId: session?.user?.id,
          notes: `Client self-service purchase from marketplace`,
        },
      });

      if (error) throw error;

      toast({
        title: "Purchase Successful!",
        description: `${qty} gift cards have been added to your account`,
      });

      queryClient.invalidateQueries({ queryKey: ["marketplace-pools"] });
      queryClient.invalidateQueries({ queryKey: ["client-balance"] });
      queryClient.invalidateQueries({ queryKey: ["client-purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
      
      setPurchaseComplete(true);
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (purchaseComplete) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6 py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-900 p-6 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Purchase Complete!</h1>
            <p className="text-lg text-muted-foreground">
              {qty} gift cards have been added to your account
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-semibold">{pool.gift_card_brands?.brand_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pool:</span>
                <span className="font-semibold">{pool.pool_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-semibold">{qty} cards</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Card Value:</span>
                <span className="font-semibold">{formatCurrency(pool.card_value)}</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="font-semibold">Total Paid:</span>
                <span className="font-bold text-primary">{formatCurrency(totalCost)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/gift-cards')} size="lg">
              View My Gift Cards
            </Button>
            <Button onClick={() => navigate('/gift-cards/marketplace')} variant="outline" size="lg">
              Continue Shopping
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/gift-cards">Gift Cards</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/gift-cards/marketplace">Marketplace</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Purchase</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Purchase Gift Cards</h1>
            <p className="text-muted-foreground">
              {pool.gift_card_brands?.brand_name} - {pool.pool_name}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Pool Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pool Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  {pool.gift_card_brands?.logo_url && (
                    <img 
                      src={pool.gift_card_brands.logo_url} 
                      alt={pool.gift_card_brands.brand_name}
                      className="h-16 w-16 object-contain"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{pool.pool_name}</h3>
                    <p className="text-muted-foreground">{pool.gift_card_brands?.brand_name}</p>
                  </div>
                  <Badge variant={pool.available_cards > 0 ? "default" : "destructive"}>
                    {pool.available_cards} available
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Card Value</span>
                    <p className="text-lg font-semibold">{formatCurrency(pool.card_value)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Price per Card</span>
                    <p className="text-lg font-semibold">{formatCurrency(pricePerCard)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Minimum Quantity</span>
                    <p className="text-lg font-semibold">{minQty} cards</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Available Cards</span>
                    <p className="text-lg font-semibold">{pool.available_cards}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quantity Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Quantity</CardTitle>
                <CardDescription>
                  Enter the number of gift cards you want to purchase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={minQty}
                    max={pool.available_cards}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={`Min: ${minQty}, Max: ${pool.available_cards}`}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter quantity between {minQty} and {pool.available_cards}
                  </p>
                </div>

                {!canAfford && quantity && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Insufficient balance. You need {formatCurrency(totalCost)} but only have {formatCurrency(clientBalance || 0)}.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="md:col-span-1">
            <div className="sticky top-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-semibold">{quantity || 0} cards</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price per card:</span>
                      <span>{formatCurrency(pricePerCard)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="font-semibold">Total Cost:</span>
                      <span className="font-bold text-xl text-primary">{formatCurrency(totalCost)}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Current Balance:
                      </span>
                      <span className="font-semibold">{formatCurrency(clientBalance || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">After Purchase:</span>
                      <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePurchase}
                    disabled={!canAfford || purchasing || !isValidQuantity || !quantity}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {purchasing ? "Processing..." : `Purchase ${quantity || 0} Card${qty !== 1 ? 's' : ''}`}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="w-full"
                    disabled={purchasing}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

