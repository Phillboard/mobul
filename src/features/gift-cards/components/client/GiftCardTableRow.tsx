/**
 * GiftCardTableRow - Table view row for a brand
 */

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DenominationToggle } from "./DenominationToggle";
import type { BrandWithDenominations } from "@/hooks/useClientGiftCards";

interface GiftCardTableRowProps {
  brand: BrandWithDenominations;
  onToggle: (brandId: string, denomination: number, currentlyEnabled: boolean, clientGiftCardId?: string) => void;
}

export function GiftCardTableRow({ brand, onToggle }: GiftCardTableRowProps) {
  const enabledCount = brand.denominations.filter(d => d.is_enabled).length;

  return (
    <TableRow>
      {/* Brand Column */}
      <TableCell>
        <div className="flex items-center gap-3">
          {brand.logo_url ? (
            <img 
              src={brand.logo_url} 
              alt={brand.brand_name}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
              <span className="text-sm font-bold text-muted-foreground">
                {brand.brand_name.charAt(0)}
              </span>
            </div>
          )}
          <span className="font-medium">{brand.brand_name}</span>
        </div>
      </TableCell>

      {/* Category Column */}
      <TableCell>
        {brand.category ? (
          <Badge variant="outline" className="text-xs">
            {brand.category.replace('_', ' ')}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Denominations Column */}
      <TableCell>
        <div className="flex flex-wrap gap-2">
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
              showLabel={false}
            />
          ))}
        </div>
      </TableCell>

      {/* Status Column */}
      <TableCell>
        {enabledCount > 0 ? (
          <Badge variant="default" className="text-xs">
            {enabledCount} Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Inactive
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

