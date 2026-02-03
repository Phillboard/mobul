/**
 * BrandCard Component
 * 
 * Visual card display for gift card brands.
 * Shows brand logo, name, denominations, and status indicators.
 * Used in discovery panel for adding new brands.
 */

import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Plus, Check, Package, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandCardProps {
  id?: string;
  brandName: string;
  brandCode?: string;
  tilloBrandCode?: string;
  logoUrl?: string;
  denominations?: number[];
  inventoryCount?: number;
  source: 'local' | 'tillo' | 'both';
  isEnabled?: boolean;
  onAdd?: () => void;
  onManage?: () => void;
  isAdding?: boolean;
  isAdded?: boolean;
  className?: string;
}

export function BrandCard({
  brandName,
  logoUrl,
  denominations = [],
  inventoryCount = 0,
  source,
  isEnabled = false,
  onAdd,
  onManage,
  isAdding = false,
  isAdded = false,
  className,
}: BrandCardProps) {
  const getSourceBadge = () => {
    switch (source) {
      case 'local':
        return <Badge variant="secondary" className="text-xs">In System</Badge>;
      case 'tillo':
        return <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">Tillo Available</Badge>;
      case 'both':
        return <Badge variant="default" className="text-xs">In System + Tillo</Badge>;
    }
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden",
      isAdded && "ring-2 ring-green-500",
      className
    )}>
      {isAdded && (
        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Brand Logo */}
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={brandName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{brandName}</h3>
            
            {/* Source Badge */}
            <div className="mt-1">
              {getSourceBadge()}
            </div>

            {/* Denominations */}
            {denominations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {denominations.slice(0, 4).map((denom) => (
                  <Badge key={denom} variant="outline" className="text-xs font-normal">
                    ${denom}
                  </Badge>
                ))}
                {denominations.length > 4 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    +{denominations.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Inventory Count (for local brands) */}
            {source !== 'tillo' && inventoryCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {inventoryCount} cards in inventory
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex gap-2">
          {source === 'tillo' && !isAdded && onAdd && (
            <Button
              size="sm"
              className="w-full"
              onClick={onAdd}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Brand
                </>
              )}
            </Button>
          )}
          
          {(source === 'local' || source === 'both' || isAdded) && onManage && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onManage}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Manage
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for BrandCard
 */
export function BrandCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="flex gap-1">
              <div className="h-5 bg-muted rounded w-10" />
              <div className="h-5 bg-muted rounded w-10" />
              <div className="h-5 bg-muted rounded w-10" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="h-8 bg-muted rounded w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
