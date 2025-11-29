import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Check } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { cn } from '@/lib/utils/utils';

type GiftCardBrand = Tables<"gift_card_brands">;

interface BrandSelectorProps {
  brands: GiftCardBrand[];
  selectedBrandId?: string;
  onSelectBrand: (brandId: string) => void;
}

export function BrandSelector({ brands, selectedBrandId, onSelectBrand }: BrandSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {brands.map((brand) => {
        const denominations = brand.typical_denominations as number[] || [];
        const isSelected = selectedBrandId === brand.id;
        const supportsApi = brand.provider !== 'csv_only';
        
        return (
          <Card
            key={brand.id}
            className={cn(
              "relative cursor-pointer transition-all hover:shadow-md",
              isSelected && "ring-2 ring-primary"
            )}
            onClick={() => onSelectBrand(brand.id)}
          >
            {isSelected && (
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-center h-16">
                {brand.logo_url ? (
                  <img 
                    src={brand.logo_url} 
                    alt={brand.brand_name}
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Gift className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="font-semibold">{brand.brand_name}</h3>
                {brand.category && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {brand.category.replace('_', ' ')}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 justify-center">
                {denominations.slice(0, 4).map((amount) => (
                  <Badge key={amount} variant="secondary" className="text-xs">
                    ${amount}
                  </Badge>
                ))}
              </div>
              
              {supportsApi && (
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    API Supported
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
