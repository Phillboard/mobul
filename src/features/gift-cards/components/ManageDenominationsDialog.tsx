/**
 * ManageDenominationsDialog - Admin denomination management
 * Enable/disable denominations and set pricing for a brand
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Plus, Package, DollarSign } from "lucide-react";
import { useBrandDenominations, useToggleDenominationEnabled, useCreateDenomination } from '@/features/gift-cards/hooks';
import { PricingConfigDialog } from "./PricingConfigDialog";

interface ManageDenominationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId?: string;
  brandName?: string;
  logoUrl?: string;
}

const COMMON_DENOMINATIONS = [5, 10, 15, 20, 25, 50, 100, 250, 500];

export function ManageDenominationsDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  logoUrl,
}: ManageDenominationsDialogProps) {
  const [showAddDenom, setShowAddDenom] = useState(false);
  const [newDenom, setNewDenom] = useState("");
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedDenom, setSelectedDenom] = useState<any>(null);

  const { data: denominations, isLoading } = useBrandDenominations(brandId);
  const toggleEnabled = useToggleDenominationEnabled();
  const createDenom = useCreateDenomination();

  const existingDenoms = new Set(denominations?.map(d => d.denomination) || []);
  const availableToAdd = COMMON_DENOMINATIONS.filter(d => !existingDenoms.has(d));

  const handleToggle = async (denominationId: string, currentlyEnabled: boolean) => {
    await toggleEnabled.mutateAsync({
      denominationId,
      isEnabled: !currentlyEnabled,
    });
  };

  const handleAddDenomination = async () => {
    const denomValue = parseFloat(newDenom);
    if (!brandId || !denomValue || denomValue <= 0) return;

    await createDenom.mutateAsync({
      brandId,
      denomination: denomValue,
      isEnabled: true,
    });

    setNewDenom("");
    setShowAddDenom(false);
  };

  const handlePricingClick = (denom: any) => {
    setSelectedDenom(denom);
    setPricingDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img src={logoUrl} alt={brandName} className="h-10 w-auto object-contain" />
                )}
                <div>
                  <div>Manage Denominations</div>
                  <div className="text-sm font-normal text-muted-foreground">{brandName}</div>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Enable/disable denominations and configure pricing
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-4">
              {/* Existing Denominations */}
              {denominations && denominations.length > 0 ? (
                <div className="space-y-2">
                  {denominations.map((denom) => (
                    <Card key={denom.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-2xl font-bold">${denom.denomination}</div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={denom.is_enabled_by_admin}
                              onCheckedChange={() => handleToggle(denom.id, denom.is_enabled_by_admin)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {denom.is_enabled_by_admin ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>

                          {denom.use_custom_pricing && denom.client_price && (
                            <Badge variant="outline" className="gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${denom.client_price}
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePricingClick(denom)}
                            disabled={!denom.is_enabled_by_admin}
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pricing
                          </Button>
                        </div>
                      </div>

                      {denom.inventory_count !== undefined && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>CSV Inventory: {denom.inventory_count || 0} cards</span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No denominations configured yet</p>
                </div>
              )}

              {/* Add Denomination */}
              {!showAddDenom && availableToAdd.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowAddDenom(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Denomination
                </Button>
              )}

              {showAddDenom && (
                <Card className="p-4 bg-muted/30">
                  <div className="space-y-3">
                    <Label>Add New Denomination</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={newDenom}
                          onChange={(e) => setNewDenom(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <Button
                        onClick={handleAddDenomination}
                        disabled={!newDenom || parseFloat(newDenom) <= 0 || createDenom.isPending}
                      >
                        {createDenom.isPending ? "Adding..." : "Add"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddDenom(false);
                          setNewDenom("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>

                    {/* Quick Add Buttons */}
                    {availableToAdd.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">Quick add:</span>
                        {availableToAdd.map((denom) => (
                          <Button
                            key={denom}
                            variant="outline"
                            size="sm"
                            onClick={() => setNewDenom(denom.toString())}
                          >
                            ${denom}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      {selectedDenom && (
        <PricingConfigDialog
          open={pricingDialogOpen}
          onOpenChange={setPricingDialogOpen}
          brandId={brandId}
          brandName={brandName}
          denomination={selectedDenom.denomination}
          denominationId={selectedDenom.id}
          logoUrl={logoUrl}
        />
      )}
    </>
  );
}

