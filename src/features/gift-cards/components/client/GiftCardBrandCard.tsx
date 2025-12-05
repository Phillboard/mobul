/**
 * GiftCardBrandCard - Grid view card for a brand
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DenominationToggle } from "./DenominationToggle";
import type { BrandWithDenominations } from "@/hooks/useClientGiftCards";
import { CheckCircle2 } from "lucide-react";

interface GiftCardBrandCardProps {
  brand: BrandWithDenominations;
  onToggle: (brandId: string, denomination: number, currentlyEnabled: boolean, clientGiftCardId?: string) => void;
}

export function GiftCardBrandCard({ brand, onToggle }: GiftCardBrandCardProps) {
  const enabledCount = brand.denominations.filter(d => d.is_enabled).length;
  const hasAnyEnabled = enabledCount > 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Brand Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {brand.logo_url ? (
              <img 
                src={brand.logo_url} 
                alt={brand.brand_name}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">
                  {brand.brand_name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{brand.brand_name}</h3>
              {brand.category && (
                <Badge variant="outline" className="text-xs mt-1">
                  {brand.category.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
          {hasAnyEnabled && (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          )}
        </div>

        {/* Denominations */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground font-medium">
            Available denominations:
          </p>
          <div className="space-y-2">
            {brand.denominations.map((denom) => (
              <DenominationToggle
                key={denom.denomination}
                denomination={denom.denomination}
                isEnabled={denom.is_enabled}
                brandName={brand.brand_name}
                onToggle={() => onToggle(
                  brand.id,
                  denom.denomination,
                  denom.is_enabled,
                  denom.client_gift_card_id
                )}
                size="sm"
                showLabel={true}
              />
            ))}
          </div>
        </div>

        {hasAnyEnabled && (
          <div className="pt-2 border-t">
            <p className="text-xs text-green-600 font-medium">
              {enabledCount} {enabledCount === 1 ? 'denomination' : 'denominations'} active
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

