import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { useSimplifiedGiftCardSelection } from "@/hooks/useSimplifiedGiftCardSelection";
import { cn } from "@/lib/utils/utils";

interface SimpleBrandDenominationSelectorProps {
  clientId: string;
  value?: { brand_id: string; card_value: number } | null;
  onChange: (selection: { brand_id: string; card_value: number; brand_name: string }) => void;
  disabled?: boolean;
  showAvailability?: boolean;
  className?: string;
}

/**
 * SimpleBrandDenominationSelector
 * 
 * Clean two-step selector for gift card brands and denominations.
 * Hides pool complexity from clients - they only see brand + value.
 * 
 * Step 1: Select brand (shows brand logos in grid)
 * Step 2: Select denomination (shows available values for selected brand)
 */
export function SimpleBrandDenominationSelector({
  clientId,
  value,
  onChange,
  disabled = false,
  showAvailability = true,
  className,
}: SimpleBrandDenominationSelectorProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    value?.brand_id || null
  );
  const [step, setStep] = useState<'brand' | 'denomination'>(
    value?.brand_id ? 'denomination' : 'brand'
  );

  const { groupedByBrand, isLoading, error, getBrandInfo } = useSimplifiedGiftCardSelection(clientId);

  const selectedBrand = selectedBrandId ? getBrandInfo(selectedBrandId) : null;

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    setStep('denomination');
  };

  const handleDenominationSelect = (value: number) => {
    if (!selectedBrand) return;
    
    onChange({
      brand_id: selectedBrand.brand_id,
      card_value: value,
      brand_name: selectedBrand.brand_name,
    });
  };

  const handleBack = () => {
    setStep('brand');
  };

  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardContent className="p-6 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load gift card options. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!groupedByBrand || groupedByBrand.length === 0) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No gift cards available. Please add gift cards to your inventory first.
          {/* TODO: Add link to marketplace for agencies */}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={cn(
          "px-2 py-1 rounded",
          step === 'brand' ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          1. Brand
        </span>
        <span>→</span>
        <span className={cn(
          "px-2 py-1 rounded",
          step === 'denomination' ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          2. Value
        </span>
      </div>

      {/* Step 1: Brand Selection */}
      {step === 'brand' && (
        <div className="space-y-4">
          <div className="text-sm font-medium">Select Gift Card Brand</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {groupedByBrand.map((brand) => {
              const isSelected = selectedBrandId === brand.brand_id;
              const totalAvailable = brand.denominations.reduce(
                (sum, d) => sum + d.available_count,
                0
              );

              return (
                <Card
                  key={brand.brand_id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md border-2",
                    isSelected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !disabled && handleBrandSelect(brand.brand_id)}
                >
                  <CardContent className="p-4 text-center space-y-3">
                    <div className="flex justify-center">
                      <BrandLogo brand={brand} size="lg" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{brand.brand_name}</div>
                      {showAvailability && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {totalAvailable} available
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Denomination Selection */}
      {step === 'denomination' && selectedBrand && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={disabled}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="text-sm font-medium">
              Select {selectedBrand.brand_name} Value
            </div>
          </div>

          {/* Selected Brand Display */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BrandLogo brand={selectedBrand} size="md" />
                <div>
                  <div className="font-semibold">{selectedBrand.brand_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedBrand.denominations.length} denomination
                    {selectedBrand.denominations.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Denomination Options */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectedBrand.denominations
              .sort((a, b) => a.value - b.value)
              .map((denom) => {
                const isSelected = value?.brand_id === selectedBrand.brand_id && 
                                  value?.card_value === denom.value;
                const isAvailable = denom.available_count > 0;

                return (
                  <Card
                    key={denom.value}
                    className={cn(
                      "cursor-pointer transition-all border-2",
                      isSelected ? "border-primary bg-primary/5" : "border-muted",
                      !isAvailable && "opacity-50 cursor-not-allowed",
                      isAvailable && !isSelected && "hover:border-primary/50 hover:shadow-md",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !disabled && isAvailable && handleDenominationSelect(denom.value)}
                  >
                    <CardContent className="p-4 text-center space-y-2">
                      <div className="text-2xl font-bold">
                        ${denom.value.toFixed(0)}
                      </div>
                      {showAvailability && (
                        <Badge 
                          variant={isAvailable ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {denom.available_count} available
                        </Badge>
                      )}
                      {isSelected && (
                        <div className="flex justify-center pt-1">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {selectedBrand.denominations.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No denominations available for this brand.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}

