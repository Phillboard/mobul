/**
 * AddGiftCardDialog - Select Brand & Denomination for Client
 * Replaces CreatePoolDialogV2 - works with new brand-denomination system
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Gift } from "lucide-react";
import { BrandSelector } from "./BrandSelector";
import { useGiftCardBrands } from "../hooks/useGiftCardBrands";
import { useAddClientGiftCard } from "../hooks/useClientAvailableGiftCards";
import { useTenant } from '@app/providers/TenantProvider';
import { useToast } from '@shared/hooks';
import { Badge } from "@/components/ui/badge";

interface AddGiftCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string; // Optional override, defaults to current tenant client
}

const COMMON_DENOMINATIONS = [5, 10, 15, 20, 25, 50, 100, 250, 500];

export function AddGiftCardDialog({ open, onOpenChange, clientId: propClientId }: AddGiftCardDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [denomination, setDenomination] = useState<string>("");
  const [customAmount, setCustomAmount] = useState("");
  
  const { currentClient } = useTenant();
  const clientId = propClientId || currentClient?.id;
  
  const { data: brands = [] } = useGiftCardBrands(true); // Only enabled brands
  const addGiftCard = useAddClientGiftCard(clientId);
  const { toast } = useToast();

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
  };

  const handleNext = () => {
    if (step === 1 && selectedBrandId) {
      setStep(2);
    }
  };

  const handleAdd = async () => {
    if (!selectedBrandId || !clientId) return;
    
    const finalDenomination = denomination === 'custom' 
      ? parseFloat(customAmount)
      : parseFloat(denomination);

    if (!finalDenomination || finalDenomination <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid denomination amount",
        variant: "destructive",
      });
      return;
    }

    try {
      await addGiftCard.mutateAsync({
        brandId: selectedBrandId,
        denomination: finalDenomination,
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
      console.error("Error adding gift card:", error);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedBrandId("");
    setDenomination("");
    setCustomAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {step === 1 ? 'Select Gift Card Brand' : 'Select Denomination'}
            </div>
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Choose a gift card brand to add to this client' 
              : 'Select the card value to make available'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <BrandSelector
              brands={brands}
              selectedBrandId={selectedBrandId}
              onSelectBrand={handleBrandSelect}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Selected Brand Summary */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                {selectedBrand?.logo_url && (
                  <img 
                    src={selectedBrand.logo_url} 
                    alt={selectedBrand.brand_name}
                    className="h-10 w-auto object-contain"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-lg">{selectedBrand?.brand_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBrand?.category?.replace('_', ' ') || 'Gift Card'}
                  </p>
                </div>
                <Badge variant="secondary">Selected</Badge>
              </div>
            </Card>

            {/* Denomination Selection */}
            <div className="space-y-3">
              <Label htmlFor="denomination" className="text-base font-semibold">
                Card Denomination
              </Label>
              <Select value={denomination} onValueChange={setDenomination}>
                <SelectTrigger id="denomination" className="h-12">
                  <SelectValue placeholder="Select card value" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Common Amounts</p>
                  </div>
                  {COMMON_DENOMINATIONS.map((amount) => (
                    <SelectItem key={amount} value={amount.toString()} className="py-3">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">${amount.toFixed(2)}</span>
                        {amount === 25 && (
                          <Badge variant="outline" className="ml-2 text-xs">Popular</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  <div className="border-t my-1" />
                  <SelectItem value="custom" className="py-3">
                    <span className="font-medium">Custom Amount...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom Amount Input */}
              {denomination === 'custom' && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="custom-amount">Enter Custom Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <input
                      id="custom-amount"
                      type="number"
                      step="0.01"
                      min="1"
                      max="1000"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="pl-7 w-full h-12 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter any amount between $1.00 and $1,000.00
                  </p>
                </div>
              )}
            </div>

            {/* Info Box */}
            <Card className="p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Once added, this gift card option will be available 
                for use in campaigns. You can upload physical card codes or purchase via Tillo API.
              </p>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={addGiftCard.isPending}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={addGiftCard.isPending}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button onClick={handleNext} disabled={!selectedBrandId}>
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleAdd} 
              disabled={
                !denomination || 
                (denomination === 'custom' && (!customAmount || parseFloat(customAmount) <= 0)) ||
                addGiftCard.isPending
              }
            >
              {addGiftCard.isPending ? "Adding..." : "Add Gift Card"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export both names for backwards compatibility during migration
export { AddGiftCardDialog as CreatePoolDialogV2 };

