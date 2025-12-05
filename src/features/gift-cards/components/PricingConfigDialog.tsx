/**
 * PricingConfigDialog - Admin Pricing Configuration
 * Allows admin to set custom prices for gift card denominations
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useUpdateDenominationPricing } from "@/hooks/useGiftCardDenominations";
import { useDenominationPricing, calculateProfitMargin } from "@/hooks/useDenominationPricing";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PricingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: string;
  brandName?: string;
  denomination?: number;
  denominationId?: string;
  logoUrl?: string;
}

export function PricingConfigDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  denomination,
  denominationId,
  logoUrl,
}: PricingConfigDialogProps) {
  const [useCustomPricing, setUseCustomPricing] = useState(false);
  const [clientPrice, setClientPrice] = useState("");
  const [agencyPrice, setAgencyPrice] = useState("");
  const [costBasis, setCostBasis] = useState("");

  const { data: existingPricing } = useDenominationPricing(brandId, denomination);
  const updatePricing = useUpdateDenominationPricing();

  // Load existing pricing data
  useEffect(() => {
    if (existingPricing && open) {
      setUseCustomPricing(existingPricing.use_custom_pricing || false);
      setClientPrice(existingPricing.client_price?.toString() || "");
      setAgencyPrice(existingPricing.agency_price?.toString() || "");
      setCostBasis(existingPricing.cost_basis?.toString() || "");
    }
  }, [existingPricing, open]);

  const faceValue = denomination || 0;
  const clientPriceNum = parseFloat(clientPrice) || faceValue;
  const costBasisNum = parseFloat(costBasis) || 0;

  const profitMargin = costBasisNum > 0 ? calculateProfitMargin(clientPriceNum, costBasisNum) : 0;
  const priceDiff = clientPriceNum - faceValue;
  const priceDiffPercent = faceValue > 0 ? (priceDiff / faceValue) * 100 : 0;

  const handleSave = async () => {
    if (!denominationId) return;

    await updatePricing.mutateAsync({
      denominationId,
      useCustomPricing,
      clientPrice: useCustomPricing && clientPrice ? parseFloat(clientPrice) : undefined,
      agencyPrice: useCustomPricing && agencyPrice ? parseFloat(agencyPrice) : undefined,
      costBasis: costBasis ? parseFloat(costBasis) : undefined,
    });

    onOpenChange(false);
  };

  const handleReset = () => {
    setUseCustomPricing(false);
    setClientPrice("");
    setAgencyPrice("");
    setCostBasis("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5" />
              Configure Pricing
            </div>
          </DialogTitle>
          <DialogDescription>
            Set custom pricing for this gift card denomination
          </DialogDescription>
        </DialogHeader>

        {/* Brand & Denomination Display */}
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt={brandName} className="h-10 w-auto object-contain" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-lg">{brandName}</p>
              <p className="text-sm text-muted-foreground">
                Face Value: <span className="font-medium">${faceValue.toFixed(2)}</span>
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              ${denomination}
            </Badge>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Custom Pricing Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div>
              <Label htmlFor="custom-pricing" className="text-base font-semibold">
                Use Custom Pricing
              </Label>
              <p className="text-sm text-muted-foreground">
                Set a different price than face value
              </p>
            </div>
            <Switch
              id="custom-pricing"
              checked={useCustomPricing}
              onCheckedChange={setUseCustomPricing}
            />
          </div>

          {useCustomPricing && (
            <>
              {/* Client Price */}
              <div className="space-y-2">
                <Label htmlFor="client-price" className="text-base font-semibold">
                  Client Price *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="client-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={faceValue.toFixed(2)}
                    value={clientPrice}
                    onChange={(e) => setClientPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
                {clientPrice && (
                  <div className="flex items-center gap-2 text-sm">
                    {priceDiff > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">
                          +${priceDiff.toFixed(2)} ({priceDiffPercent.toFixed(1)}% markup)
                        </span>
                      </>
                    ) : priceDiff < 0 ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">
                          ${priceDiff.toFixed(2)} ({Math.abs(priceDiffPercent).toFixed(1)}% discount)
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Same as face value</span>
                    )}
                  </div>
                )}
              </div>

              {/* Agency Price (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="agency-price" className="text-base">
                  Agency Price <span className="text-muted-foreground text-sm">(optional)</span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Different price for agencies with billing enabled
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="agency-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={clientPrice || faceValue.toFixed(2)}
                    value={agencyPrice}
                    onChange={(e) => setAgencyPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            </>
          )}

          {/* Cost Basis */}
          <div className="space-y-2">
            <Label htmlFor="cost-basis" className="text-base">
              Cost Basis <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <p className="text-sm text-muted-foreground">
              What you pay for CSV cards (for profit tracking)
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="cost-basis"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* Profit Margin Display */}
          {useCustomPricing && costBasis && clientPrice && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                  <p className="text-2xl font-bold">
                    {profitMargin > 0 ? '+' : ''}{profitMargin.toFixed(2)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Profit: ${(clientPriceNum - costBasisNum).toFixed(2)} per card
                  </p>
                </div>
                {profitMargin < 0 && (
                  <AlertCircle className="h-8 w-8 text-destructive" />
                )}
              </div>
            </Card>
          )}

          {/* Warning for negative margin */}
          {useCustomPricing && profitMargin < 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Warning: Your client price is lower than your cost basis. You will lose money on each card sold.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <Card className="p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <strong>Provisioning Strategy:</strong> The system will use CSV inventory first, then fallback to Tillo API.
              Custom pricing applies to both sources.
            </p>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} disabled={updatePricing.isPending}>
            Reset to Face Value
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updatePricing.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={
              updatePricing.isPending ||
              (useCustomPricing && (!clientPrice || parseFloat(clientPrice) <= 0))
            }
          >
            {updatePricing.isPending ? "Saving..." : "Save Pricing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

