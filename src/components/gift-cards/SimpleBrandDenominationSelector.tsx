/**
 * Simple Brand-Denomination Selector
 * 
 * Component for selecting a brand and denomination for campaign conditions
 * Uses new gift card system (no pools, just brand + denomination)
 */

import { useClientAvailableGiftCards, useInventoryCount } from '@/hooks/useGiftCardProvisioning';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package } from 'lucide-react';

interface SimpleBrandDenominationSelectorProps {
  clientId: string;
  value?: { brandId: string; denomination: number; brandName?: string };
  onChange: (value: { brandId: string; denomination: number; brandName: string } | null) => void;
}

export function SimpleBrandDenominationSelector({
  clientId,
  value,
  onChange,
}: SimpleBrandDenominationSelectorProps) {
  const { data: availableGiftCards, isLoading, error } = useClientAvailableGiftCards(clientId);

  // Get inventory count for selected gift card
  const { data: inventoryCount } = useInventoryCount(
    value?.brandId,
    value?.denomination
  );

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading gift cards...</div>;
  }

  // Handle database errors gracefully (tables might not exist yet)
  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Gift card system is being configured. Please run migrations first.
        </AlertDescription>
      </Alert>
    );
  }

  if (!availableGiftCards || availableGiftCards.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No gift cards available. Configure gift cards in client settings first.
        </AlertDescription>
      </Alert>
    );
  }

  // Group gift cards by brand for display
  const brandOptions = Array.from(
    new Map(
      availableGiftCards.map((gc: any) => [
        gc.gift_card_brands.id,
        {
          id: gc.gift_card_brands.id,
          name: gc.gift_card_brands.brand_name,
          logo: gc.gift_card_brands.logo_url,
        },
      ])
    ).values()
  );

  // Get denominations for selected brand
  const selectedBrandDenominations = value?.brandId
    ? availableGiftCards
        .filter((gc: any) => gc.gift_card_brands.id === value.brandId)
        .map((gc: any) => gc.denomination)
    : [];

  const handleBrandChange = (brandId: string) => {
    const brand = brandOptions.find((b) => b.id === brandId);
    if (!brand) return;

    // Auto-select first denomination if available
    const firstDenom = availableGiftCards.find(
      (gc: any) => gc.gift_card_brands.id === brandId
    )?.denomination;

    if (firstDenom) {
      onChange({
        brandId: brand.id,
        denomination: firstDenom,
        brandName: brand.name,
      });
    } else {
      onChange(null);
    }
  };

  const handleDenominationChange = (denomination: string) => {
    if (!value?.brandId) return;

    const brand = brandOptions.find((b) => b.id === value.brandId);
    if (!brand) return;

    onChange({
      brandId: value.brandId,
      denomination: parseFloat(denomination),
      brandName: brand.name,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Brand</label>
          <Select value={value?.brandId || ''} onValueChange={handleBrandChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select brand..." />
            </SelectTrigger>
            <SelectContent>
              {brandOptions.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  <div className="flex items-center gap-2">
                    {brand.logo && (
                      <img src={brand.logo} alt={brand.name} className="w-5 h-5 object-contain" />
                    )}
                    <span>{brand.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Denomination</label>
          <Select
            value={value?.denomination?.toString() || ''}
            onValueChange={handleDenominationChange}
            disabled={!value?.brandId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              {selectedBrandDenominations.map((denom) => (
                <SelectItem key={denom} value={denom.toString()}>
                  ${denom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {value && inventoryCount !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Available in inventory:</span>
          <Badge variant={inventoryCount > 50 ? 'default' : inventoryCount > 0 ? 'secondary' : 'destructive'}>
            {inventoryCount} cards
          </Badge>
          {inventoryCount === 0 && (
            <span className="text-xs text-muted-foreground">(Will purchase from Tillo API)</span>
          )}
        </div>
      )}
    </div>
  );
}
