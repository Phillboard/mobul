import { cn } from "@/lib/utils/utils";

interface BrandLogoProps {
  brand: {
    brand_name: string;
    logo_url?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

/**
 * BrandLogo - Reusable brand logo component
 * 
 * Displays a gift card brand logo consistently across the system.
 * Falls back to first letter in a neutral circle if no logo available.
 * 
 * Used in: SimpleBrandDenominationSelector, BrandPoolsView, CallCenterRedemptionPanel, etc.
 */
export function BrandLogo({ brand, size = 'md', className, showName = false }: BrandLogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  };
  
  const nameSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };
  
  if (brand.logo_url) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <img 
          src={brand.logo_url} 
          alt={brand.brand_name} 
          className={cn(sizeClasses[size], 'object-contain')}
        />
        {showName && (
          <span className={cn("font-medium", nameSizeClasses[size])}>
            {brand.brand_name}
          </span>
        )}
      </div>
    );
  }
  
  // Fallback: First letter in gray circle
  const initial = brand.brand_name[0]?.toUpperCase() || '?';
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        sizeClasses[size],
        'rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold'
      )}>
        {initial}
      </div>
      {showName && (
        <span className={cn("font-medium", nameSizeClasses[size])}>
          {brand.brand_name}
        </span>
      )}
    </div>
  );
}

