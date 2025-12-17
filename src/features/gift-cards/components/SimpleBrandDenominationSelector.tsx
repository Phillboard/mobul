/**
 * Simple Brand-Denomination Selector
 * 
 * Component for selecting a brand and denomination for campaign conditions
 * Uses new gift card system (no pools, just brand + denomination)
 */

import { useClientAvailableGiftCards, useInventoryCount } from '@/features/gift-cards/hooks';
import { useDenominationPricing } from '@/features/gift-cards/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { AlertCircle, Package, DollarSign } from 'lucide-react';

interface SimpleBrandDenominationSelectorProps {
  clientId: string;
  value?: { brand_id: string; card_value: number; brand_name?: string } | null;
  onChange: (value: { brand_id: string; card_value: number; brand_name: string } | null) => void;
  showAvailability?: boolean;
}

export function SimpleBrandDenominationSelector({
  clientId,
  value,
  onChange,
  showAvailability = false,
}: SimpleBrandDenominationSelectorProps) {
  const { data: availableGiftCards, isLoading, error } = useClientAvailableGiftCards(clientId);

  // Get inventory count for selected gift card
  const { data: inventoryCount } = useInventoryCount(
    value?.brand_id,
    value?.card_value
  );

  // Get custom pricing for selected denomination
  const { data: pricing } = useDenominationPricing(
    value?.brand_id,
    value?.card_value
  );

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        <div className="animate-pulse">Loading gift cards...</div>
      </div>
    );
  }

  // Handle database errors gracefully (tables might not exist yet)
  if (error) {
    console.error('Gift card loading error:', error);
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Gift card system needs setup</p>
            <p className="text-sm">Please run the database migrations:</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
              npm run setup:gift-cards
            </code>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!availableGiftCards || availableGiftCards.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">No gift cards available</p>
            <p className="text-sm">Ask your administrator to:</p>
            <ul className="text-sm list-disc list-inside mt-1 space-y-1">
              <li>Enable gift card brands in admin panel</li>
              <li>Assign gift cards to your client account</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Group gift cards by brand for display - filter out items with missing brand data
  const brandOptions = Array.from(
    new Map(
      availableGiftCards
        .filter((gc: any) => gc?.brand?.id) // Filter out items without valid brand data
        .map((gc: any) => [
          gc.brand.id,
          {
            id: gc.brand.id,
            name: gc.brand.brand_name || 'Unknown Brand',
            logo: gc.brand.logo_url,
          },
        ])
    ).values()
  );

  // Get denominations for selected brand - filter out items with missing brand data
  const selectedBrandDenominations = value?.brand_id
    ? availableGiftCards
        .filter((gc: any) => gc?.brand?.id === value.brand_id)
        .map((gc: any) => gc.denomination)
        .filter((denom: any) => denom != null) // Ensure denominations are valid
    : [];

  const handleBrandChange = (brandId: string) => {
    const brand = brandOptions.find((b) => b.id === brandId);
    if (!brand) {
      console.warn('[SimpleBrandDenominationSelector] Brand not found:', brandId);
      return;
    }

    // Auto-select first denomination if available
    const firstDenom = availableGiftCards.find(
      (gc: any) => gc?.brand?.id === brandId
    )?.denomination;

    if (firstDenom) {
      const newValue = {
        brand_id: brand.id,
        card_value: firstDenom,
        brand_name: brand.name,
      };
      console.log('[SimpleBrandDenominationSelector] Brand changed - calling onChange:', newValue);
      onChange(newValue);
    } else {
      console.log('[SimpleBrandDenominationSelector] No denominations for brand, calling onChange(null)');
      onChange(null);
    }
  };

  const handleDenominationChange = (denomination: string) => {
    if (!value?.brand_id) {
      console.warn('[SimpleBrandDenominationSelector] No brand_id in value, cannot change denomination');
      return;
    }

    const brand = brandOptions.find((b) => b.id === value.brand_id);
    if (!brand) {
      console.warn('[SimpleBrandDenominationSelector] Brand not found for denomination change');
      return;
    }

    const newValue = {
      brand_id: value.brand_id,
      card_value: parseFloat(denomination),
      brand_name: brand.name,
    };
    console.log('[SimpleBrandDenominationSelector] Denomination changed - calling onChange:', newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Brand</label>
          <Select value={value?.brand_id || ''} onValueChange={handleBrandChange}>
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
            value={value?.card_value?.toString() || ''}
            onValueChange={handleDenominationChange}
            disabled={!value?.brand_id}
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

      {value && (
        <div className="space-y-2">
          {/* Pricing Display */}
          {pricing && pricing.use_custom_pricing && pricing.client_price && (
            <div className="flex items-center gap-2 text-sm p-2 bg-primary/5 rounded-md border border-primary/20">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Client Price:</span>
              <Badge variant="default">
                ${pricing.client_price.toFixed(2)}
              </Badge>
              {pricing.client_price !== value.card_value && (
                <span className="text-xs text-muted-foreground">
                  (Face value: ${value.card_value})
                </span>
              )}
            </div>
          )}

          {/* Inventory Status */}
          {showAvailability && inventoryCount !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">CSV Inventory:</span>
              <Badge variant={inventoryCount > 50 ? 'default' : inventoryCount > 0 ? 'secondary' : 'destructive'}>
                {inventoryCount} cards
              </Badge>
              {inventoryCount === 0 && (
                <span className="text-xs text-muted-foreground">(Will purchase from Tillo API)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
