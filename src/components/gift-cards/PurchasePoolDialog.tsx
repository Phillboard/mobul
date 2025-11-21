import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Wallet, CreditCard, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface PurchasePoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool: any;
  clientId: string;
  clientBalance: number;
}

export function PurchasePoolDialog({ open, onOpenChange, pool, clientId, clientBalance }: PurchasePoolDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  
  const minQty = pool.min_purchase_quantity || 1;
  const [quantity, setQuantity] = useState(minQty.toString());
  const [purchasing, setPurchasing] = useState(false);

  const pricePerCard = pool.sale_price_per_card || pool.card_value;
  const totalCost = parseInt(quantity || "0") * pricePerCard;
  const remainingBalance = clientBalance - totalCost;
  const canAfford = remainingBalance >= 0;

  const handlePurchase = async () => {
    if (!canAfford) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough credits to complete this purchase.",
        variant: "destructive",
      });
      return;
    }

    const qty = parseInt(quantity);
    if (qty < minQty) {
      toast({
        title: "Below Minimum",
        description: `Minimum purchase quantity is ${minQty} cards`,
        variant: "destructive",
      });
      return;
    }

    if (qty > pool.available_cards) {
      toast({
        title: "Not Enough Cards",
        description: `Only ${pool.available_cards} cards available`,
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("transfer-admin-cards", {
        body: {
          masterPoolId: pool.id,
          buyerClientId: clientId,
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

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["marketplace-pools"] });
      queryClient.invalidateQueries({ queryKey: ["client-balance"] });
      queryClient.invalidateQueries({ queryKey: ["client-purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
      
      onOpenChange(false);
      setQuantity(minQty.toString());
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Purchase Gift Cards</DialogTitle>
          <DialogDescription>
            {pool.gift_card_brands?.brand_name} - {pool.pool_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pool Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5" />
              <span className="font-semibold">Pool Details</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Card Value:</span>
                <p className="font-semibold">{formatCurrency(pool.card_value)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Price per Card:</span>
                <p className="font-semibold">{formatCurrency(pricePerCard)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Available:</span>
                <p className="font-semibold">{pool.available_cards} cards</p>
              </div>
              <div>
                <span className="text-muted-foreground">Min Quantity:</span>
                <p className="font-semibold">{minQty} cards</p>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={minQty}
              max={pool.available_cards}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Min: ${minQty}`}
            />
            <p className="text-sm text-muted-foreground">
              Enter quantity between {minQty} and {pool.available_cards}
            </p>
          </div>

          {/* Purchase Summary */}
          <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">Purchase Summary</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="font-semibold">{quantity} cards</span>
              </div>
              <div className="flex justify-between">
                <span>Price per card:</span>
                <span>{formatCurrency(pricePerCard)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total Cost:</span>
                <span className="font-bold text-primary">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Current Balance:
                </span>
                <span className="font-semibold">{formatCurrency(clientBalance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">After Purchase:</span>
                <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
            </div>

            {!canAfford && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                ⚠️ Insufficient balance to complete this purchase
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={!canAfford || purchasing || parseInt(quantity) < minQty}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              {purchasing ? "Processing..." : `Purchase ${quantity} Card${parseInt(quantity) > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}