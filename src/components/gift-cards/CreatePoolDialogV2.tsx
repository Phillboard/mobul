import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { BrandSelector } from "./BrandSelector";
import { useGiftCardBrands } from "@/hooks/useGiftCardBrands";
import { useGiftCardPools } from "@/hooks/useGiftCardPools";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

interface CreatePoolDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMasterPool?: boolean;
}

export function CreatePoolDialogV2({ open, onOpenChange, isMasterPool = false }: CreatePoolDialogV2Props) {
  const [step, setStep] = useState(1);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [poolName, setPoolName] = useState("");
  const [cardValue, setCardValue] = useState("");
  const { currentClient } = useTenant();
  const { createPool } = useGiftCardPools(isMasterPool ? undefined : currentClient?.id);
  const { data: brands = [] } = useGiftCardBrands();
  const { toast } = useToast();

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      setPoolName(`${brand.brand_name} Pool`);
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedBrandId) {
      setStep(2);
    }
  };

  const handleCreate = async () => {
    if (!selectedBrandId || !poolName || !cardValue) return;
    if (!isMasterPool && !currentClient?.id) {
      toast({
        title: "Error",
        description: "No client selected",
        variant: "destructive",
      });
      return;
    }

    await createPool.mutateAsync({
      client_id: isMasterPool ? null : currentClient!.id,
      brand_id: selectedBrandId,
      pool_name: poolName,
      card_value: parseFloat(cardValue),
      provider: "tillo",
      is_master_pool: isMasterPool,
      available_for_purchase: false,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedBrandId("");
    setPoolName("");
    setCardValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Select Gift Card Brand' : 'Configure Pool'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Choose the gift card brand for this pool' 
              : 'Set up your pool details'
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
          <div className="space-y-4">
            <Card className="p-3 bg-muted/50">
              <div className="flex items-center gap-3">
                {selectedBrand?.logo_url && (
                  <img 
                    src={selectedBrand.logo_url} 
                    alt={selectedBrand.brand_name}
                    className="h-8 w-auto object-contain"
                  />
                )}
                <div>
                  <p className="font-semibold">{selectedBrand?.brand_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedBrand?.category?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="pool-name">Pool Name</Label>
              <Input
                id="pool-name"
                placeholder="e.g., Starbucks $5 Rewards"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-value">Card Value ($)</Label>
              <Select value={cardValue} onValueChange={setCardValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedBrand?.typical_denominations as number[] || [5, 10, 25, 50]).map((amount) => (
                    <SelectItem key={amount} value={amount.toString()}>
                      ${amount.toFixed(2)}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Amount</SelectItem>
                </SelectContent>
              </Select>
              {cardValue === 'custom' && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter custom amount"
                  onChange={(e) => setCardValue(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button onClick={handleNext} disabled={!selectedBrandId}>
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!poolName || !cardValue}>
              Create Pool
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}