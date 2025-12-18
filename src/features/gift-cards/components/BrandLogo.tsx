/**
 * BrandLogo Component
 * 
 * Displays a gift card brand logo with proper fallback handling.
 * Shows brand initials when the image fails to load.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  logoUrl?: string | null;
  brandName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function BrandLogo({ 
  logoUrl, 
  brandName, 
  size = 'md',
  className 
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const initials = brandName
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const showFallback = !logoUrl || imageError;

  return (
    <div 
      className={cn(
        'relative flex items-center justify-center rounded bg-muted overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {/* Fallback initials - always rendered, shown when image fails */}
      <span 
        className={cn(
          'font-bold text-muted-foreground select-none',
          !showFallback && 'hidden'
        )}
      >
        {initials}
      </span>

      {/* Actual image - hidden if error or not loaded */}
      {logoUrl && !imageError && (
        <img
          src={logoUrl}
          alt={brandName}
          className={cn(
            'absolute inset-0 w-full h-full object-contain bg-white rounded',
            !imageLoaded && 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      )}
    </div>
  );
}

export default BrandLogo;
