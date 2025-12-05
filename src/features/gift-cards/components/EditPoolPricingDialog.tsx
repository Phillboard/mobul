import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@shared/hooks';
import { DollarSign, Percent, TrendingUp } from "lucide-react";

interface EditPoolPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pool: {
    id: string;
    pool_name: string;
    card_value: number;
    sale_price_per_card?: number | null;
    markup_percentage?: number | null;
    min_purchase_quantity?: number | null;
    available_for_purchase?: boolean | null;
  };
}

export function EditPoolPricingDialog({ open, onOpenChange, pool }: EditPoolPricingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [priceMode, setPriceMode] = useState<'fixed' | 'markup'>('fixed');
  const [salePrice, setSalePrice] = useState("");
  const [markup, setMarkup] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [availableForPurchase, setAvailableForPurchase] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pool) {
      setSalePrice(pool.sale_price_per_card?.toString() || "");
      setMarkup(pool.markup_percentage?.toString() || "");
      setMinQuantity(pool.min_purchase_quantity?.toString() || "1");
      setAvailableForPurchase(pool.available_for_purchase || false);
      
      if (pool.markup_percentage) {
        setPriceMode('markup');
      }
    }
  }, [pool]);

  const calculateSalePrice = () => {
    if (priceMode === 'markup' && markup) {
      const markupDecimal = parseFloat(markup) / 100;
      return pool.card_value * (1 + markupDecimal);
    }
    return parseFloat(salePrice || "0");
  };

  const calculatedSalePrice = calculateSalePrice();
  const profitPerCard = calculatedSalePrice - pool.card_value;
  const profitMargin = pool.card_value > 0 ? (profitPerCard / calculatedSalePrice) * 100 : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        min_purchase_quantity: parseInt(minQuantity) || 1,
        available_for_purchase: availableForPurchase,
      };

      if (priceMode === 'markup' && markup) {
        updates.markup_percentage = parseFloat(markup);
        updates.sale_price_per_card = calculatedSalePrice;
      } else if (priceMode === 'fixed' && salePrice) {
        updates.sale_price_per_card = parseFloat(salePrice);
        updates.markup_percentage = null;
      }

      const { error } = await supabase
        .from("gift_card_pools")
        .update(updates)
        .eq("id", pool.id);

      if (error) throw error;

      toast({
        title: "Pricing Updated!",
        description: `Pool pricing has been updated successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-master-pools"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-pools"] });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to Update",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Pool Pricing</DialogTitle>
          <DialogDescription>
            {pool.pool_name} - Configure pricing and availability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="text-sm text-muted-foreground mb-1">Card Face Value</div>
            <div className="text-2xl font-bold">${pool.card_value}</div>
          </div>

          <div className="space-y-4">
            <Label>Pricing Method</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={priceMode === 'fixed' ? 'default' : 'outline'}
                onClick={() => setPriceMode('fixed')}
                className="h-auto py-4 flex-col gap-2"
              >
                <DollarSign className="h-5 w-5" />
                <span>Fixed Price</span>
              </Button>
              <Button
                variant={priceMode === 'markup' ? 'default' : 'outline'}
                onClick={() => setPriceMode('markup')}
                className="h-auto py-4 flex-col gap-2"
              >
                <Percent className="h-5 w-5" />
                <span>Markup %</span>
              </Button>
            </div>
          </div>

          {priceMode === 'fixed' ? (
            <div className="space-y-2">
              <Label>Sale Price Per Card ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Enter sale price"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Markup Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                placeholder="e.g. 15 for 15%"
              />
              {markup && (
                <p className="text-sm text-muted-foreground">
                  Sale price will be: ${calculatedSalePrice.toFixed(2)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Minimum Purchase Quantity</Label>
            <Input
              type="number"
              min="1"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              placeholder="Minimum cards per purchase"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Available for Purchase</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to buy from this pool
              </p>
            </div>
            <Switch
              checked={availableForPurchase}
              onCheckedChange={setAvailableForPurchase}
            />
          </div>

          {/* Profit Preview */}
          {(salePrice || markup) && (
            <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Profit Analysis</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Cost per card:</span>
                  <span>${pool.card_value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sale price:</span>
                  <span>${calculatedSalePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-green-600 border-t pt-1">
                  <span>Profit per card:</span>
                  <span>${profitPerCard.toFixed(2)} ({profitMargin.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (!salePrice && !markup)}
            >
              {saving ? "Saving..." : "Save Pricing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}