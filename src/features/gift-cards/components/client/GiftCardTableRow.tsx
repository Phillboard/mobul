/**
 * GiftCardTableRow - Table view row for a brand
 */

import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { DenominationToggle } from "./DenominationToggle";
import { BrandLogo } from "../BrandLogo";
import type { BrandWithDenominations } from '@/features/gift-cards/hooks';

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
          <BrandLogo
            logoUrl={brand.logo_url}
            brandName={brand.brand_name}
            brandWebsite={(brand as any).website_url || null}
            size="sm"
          />
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

