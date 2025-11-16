import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CARD_VALUE_OPTIONS = [5, 10, 15, 20, 25, 50, 100];
const QUANTITY_OPTIONS = [100, 250, 500, 1000, 2500, 5000];
const PROVIDER_OPTIONS = ["Marco's Pizza", "Starbucks", "Amazon", "Target", "Walmart", "Generic"];

export default function PurchaseGiftCards() {
  const { currentClient } = useTenant();
  const [quantity, setQuantity] = useState<number>(500);
  const [cardValue, setCardValue] = useState<number>(25);
  const [poolName, setPoolName] = useState("");
  const [provider, setProvider] = useState("Marco's Pizza");
  const [isProcessing, setIsProcessing] = useState(false);

  const totalCost = quantity * cardValue;

  const handlePurchase = async () => {
    if (!currentClient) {
      toast.error("No client selected");
      return;
    }

    if (!poolName.trim()) {
      toast.error("Please enter a pool name");
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("purchase-gift-cards", {
        body: {
          clientId: currentClient.id,
          quantity,
          cardValue,
          poolName: poolName.trim(),
          provider,
        },
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast.success("Redirecting to checkout...");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(error.message || "Failed to initiate purchase");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Purchase Gift Cards</h1>
          <p className="text-muted-foreground">
            Buy gift cards in bulk to use as campaign rewards
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Gift Card Order</CardTitle>
            <CardDescription>
              Configure your gift card purchase. Cards will be available after payment confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pool Name */}
            <div className="space-y-2">
              <Label htmlFor="poolName">Pool Name</Label>
              <Input
                id="poolName"
                placeholder="e.g., Spring 2024 Campaign - Marco's"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
              />
            </div>

            {/* Quantity Selection */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Select value={quantity.toString()} onValueChange={(val) => setQuantity(parseInt(val))}>
                <SelectTrigger id="quantity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUANTITY_OPTIONS.map((qty) => (
                    <SelectItem key={qty} value={qty.toString()}>
                      {qty.toLocaleString()} cards
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Card Value Selection */}
            <div className="space-y-2">
              <Label htmlFor="cardValue">Card Value</Label>
              <Select value={cardValue.toString()} onValueChange={(val) => setCardValue(parseInt(val))}>
                <SelectTrigger id="cardValue">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARD_VALUE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      ${value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Summary */}
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <h3 className="font-semibold text-foreground">Order Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-medium text-foreground">{provider}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-medium text-foreground">{quantity.toLocaleString()} cards</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Card Value:</span>
                <span className="font-medium text-foreground">${cardValue}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-border flex justify-between">
                <span className="font-semibold text-foreground">Total Cost:</span>
                <span className="text-xl font-bold text-primary">
                  ${totalCost.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Purchase Button */}
            <Button
              onClick={handlePurchase}
              disabled={isProcessing || !poolName.trim()}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Proceed to Checkout
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You will be redirected to Stripe to complete the payment securely
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
