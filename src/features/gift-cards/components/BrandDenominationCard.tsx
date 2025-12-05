/**
 * BrandDenominationCard - Display brand with nested denominations
 * Shows inventory counts, pricing, and provides quick actions
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, Settings, DollarSign, Package, AlertCircle } from "lucide-react";
import { useState } from "react";
import { PricingConfigDialog } from "./PricingConfigDialog";

interface Denomination {
  id: string;
  denomination: number;
  is_enabled_by_admin: boolean;
  use_custom_pricing?: boolean;
  client_price?: number;
  inventory_count?: number;
}

interface BrandDenominationCardProps {
  brandId: string;
  brandName: string;
  brandCode: string;
  logoUrl?: string;
  isEnabled: boolean;
  denominations: Denomination[];
  onToggleBrand: (enabled: boolean) => void;
  onToggleDenomination: (denominationId: string, enabled: boolean) => void;
  onUpload: (brandId: string, denomination: number) => void;
  onManage?: (brandId: string) => void;
}

export function BrandDenominationCard({
  brandId,
  brandName,
  brandCode,
  logoUrl,
  isEnabled,
  denominations,
  onToggleBrand,
  onToggleDenomination,
  onUpload,
  onManage,
}: BrandDenominationCardProps) {
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedDenom, setSelectedDenom] = useState<Denomination | null>(null);

  const totalInventory = denominations.reduce((sum, d) => sum + (d.inventory_count || 0), 0);
  const enabledDenoms = denominations.filter(d => d.is_enabled_by_admin);
  const lowStockDenoms = denominations.filter(d => d.is_enabled_by_admin && (d.inventory_count || 0) < 10);

  const handlePricingClick = (denom: Denomination) => {
    setSelectedDenom(denom);
    setPricingDialogOpen(true);
  };

  return (
    <>
      <Card className={!isEnabled ? "opacity-60" : ""}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {logoUrl && (
                <img src={logoUrl} alt={brandName} className="h-12 w-auto object-contain" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{brandName}</h3>
                  {!isEnabled && <Badge variant="secondary">Disabled</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-muted-foreground">{brandCode}</p>
                  <Badge variant="outline">
                    {enabledDenoms.length}/{denominations.length} active
                  </Badge>
                  {totalInventory > 0 && (
                    <Badge variant="default" className="gap-1">
                      <Package className="h-3 w-3" />
                      {totalInventory} in CSV
                    </Badge>
                  )}
                  {lowStockDenoms.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {lowStockDenoms.length} low stock
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggleBrand}
              />
              {onManage && (
                <Button variant="ghost" size="sm" onClick={() => onManage(brandId)}>
                  <Settings className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {denominations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No denominations configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {denominations.map((denom) => {
                const hasInventory = (denom.inventory_count || 0) > 0;
                const isLowStock = denom.is_enabled_by_admin && (denom.inventory_count || 0) < 10;
                const customPrice = denom.use_custom_pricing && denom.client_price;

                return (
                  <Card
                    key={denom.id}
                    className={`p-4 transition-all ${
                      !denom.is_enabled_by_admin ? "opacity-50" : ""
                    } ${isLowStock ? "border-destructive" : ""}`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">${denom.denomination}</div>
                          {customPrice && (
                            <div className="text-xs text-muted-foreground">
                              Client: ${customPrice.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <Switch
                          checked={denom.is_enabled_by_admin}
                          onCheckedChange={(checked) => onToggleDenomination(denom.id, checked)}
                          disabled={!isEnabled}
                        />
                      </div>

                      {/* Inventory Status */}
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            hasInventory 
                              ? isLowStock 
                                ? "destructive" 
                                : "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {denom.inventory_count || 0} CSV
                        </Badge>
                        {denom.use_custom_pricing && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Custom
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => onUpload(brandId, denom.denomination)}
                          disabled={!isEnabled || !denom.is_enabled_by_admin}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handlePricingClick(denom)}
                          disabled={!isEnabled || !denom.is_enabled_by_admin}
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Price
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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

