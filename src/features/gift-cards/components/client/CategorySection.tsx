/**
 * CategorySection - Category view section with collapsible brands
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { GiftCardBrandCard } from "./GiftCardBrandCard";
import type { BrandWithDenominations } from '@/features/gift-cards/hooks';

interface CategorySectionProps {
  category: string;
  categoryLabel: string;
  brands: BrandWithDenominations[];
  onToggle: (brandId: string, denomination: number, currentlyEnabled: boolean, clientGiftCardId?: string) => void;
  defaultExpanded?: boolean;
}

export function CategorySection({
  category,
  categoryLabel,
  brands,
  onToggle,
  defaultExpanded = false,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const enabledBrandsCount = brands.filter(brand => 
    brand.denominations.some(d => d.is_enabled)
  ).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <Button
        variant="ghost"
        className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          <h3 className="text-lg font-semibold">{categoryLabel}</h3>
          <Badge variant="secondary">
            {brands.length} {brands.length === 1 ? 'brand' : 'brands'}
          </Badge>
          {enabledBrandsCount > 0 && (
            <Badge variant="default">
              {enabledBrandsCount} active
            </Badge>
          )}
        </div>
      </Button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-muted/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {brands.map((brand) => (
            <GiftCardBrandCard
              key={brand.id}
              brand={brand}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

