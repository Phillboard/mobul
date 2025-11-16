import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2 } from "lucide-react";

interface PurchaseGiftCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

const CARD_VALUE_OPTIONS = [10, 25, 50, 100, 250, 500];
const QUANTITY_OPTIONS = [10, 25, 50, 100, 250, 500, 1000];

export function PurchaseGiftCardsDialog({
  open,
  onOpenChange,
  clientId,
}: PurchaseGiftCardsDialogProps) {
  const [quantity, setQuantity] = useState<number>(50);
  const [cardValue, setCardValue] = useState<number>(25);
  const [poolName, setPoolName] = useState("");
  const [provider, setProvider] = useState("Generic");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const totalCost = quantity * cardValue;

  const handlePurchase = async () => {
    if (!poolName.trim()) {
      toast({
        title: "Pool name required",
        description: "Please enter a name for your gift card pool",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('purchase-gift-cards', {
        body: {
          clientId,
          quantity,
          cardValue,
          poolName: poolName.trim(),
          provider,
        },
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to initiate purchase. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Purchase Gift Cards in Bulk</DialogTitle>
          <DialogDescription>
            Purchase gift cards for your campaigns. You'll be redirected to complete payment securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="pool-name">Pool Name</Label>
            <Input
              id="pool-name"
              placeholder="e.g., Holiday Campaign 2024"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Select
                value={quantity.toString()}
                onValueChange={(value) => setQuantity(Number(value))}
                disabled={isProcessing}
              >
                <SelectTrigger id="quantity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUANTITY_OPTIONS.map((qty) => (
                    <SelectItem key={qty} value={qty.toString()}>
                      {qty} cards
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-value">Card Value</Label>
              <Select
                value={cardValue.toString()}
                onValueChange={(value) => setCardValue(Number(value))}
                disabled={isProcessing}
              >
                <SelectTrigger id="card-value">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider (Optional)</Label>
            <Input
              id="provider"
              placeholder="e.g., Amazon, Visa"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantity:</span>
              <span className="font-medium">{quantity} cards</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Card Value:</span>
              <span className="font-medium">${cardValue} each</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
              <span>Total Cost:</span>
              <span>${totalCost.toLocaleString()}</span>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Checkout
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You will be redirected to Stripe for secure payment processing
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
