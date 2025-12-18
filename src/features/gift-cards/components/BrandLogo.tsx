/**
 * BrandLogo Component
 * 
 * Displays a gift card brand logo with proper fallback handling.
 * Uses multiple logo sources with automatic fallback.
 * Shows brand initials when all image sources fail.
 */

import { useState, useEffect } from 'react';
import { cn } from '@shared/utils/cn';

interface BrandLogoProps {
  logoUrl?: string | null;
  brandName: string;
  brandWebsite?: string | null;
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

/**
 * Extract domain from URL or generate from brand name
 */
function extractDomain(url: string | null | undefined, brandName: string): string {
  if (!url) {
    // Generate domain from brand name
    return brandName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      + '.com';
  }
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.replace('www.', '');
  }
}

/**
 * Generate fallback logo URLs from different services
 * Uses only free, no-auth services for reliability
 */
function getLogoFallbackSources(primaryUrl: string | null | undefined, domain: string): string[] {
  const sources: string[] = [];
  
  // 1. Use primary URL if provided and not from known failing sources
  if (primaryUrl && !primaryUrl.includes('logo.clearbit.com')) {
    sources.push(primaryUrl);
  }
  
  // 2. Try Google Favicon API (free, reliable, high quality)
  sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  
  // 3. Try Favicon.io (free service)
  sources.push(`https://favicons.githubusercontent.com/${domain}`);
  
  // 4. Try direct website favicon
  sources.push(`https://${domain}/favicon.ico`);
  
  // 5. Try Clearbit if primary URL was Clearbit (for backwards compatibility)
  if (primaryUrl?.includes('logo.clearbit.com')) {
    sources.push(primaryUrl);
  }
  
  return sources;
}

export function BrandLogo({ 
  logoUrl, 
  brandName,
  brandWebsite,
  size = 'md',
  className 
}: BrandLogoProps) {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [allSourcesFailed, setAllSourcesFailed] = useState(false);

  const domain = extractDomain(brandWebsite || logoUrl, brandName);
  const logoSources = getLogoFallbackSources(logoUrl, domain);
  const currentSource = logoSources[currentSourceIndex];

  const initials = brandName
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Reset state when logo URL changes
  useEffect(() => {
    setCurrentSourceIndex(0);
    setImageLoaded(false);
    setAllSourcesFailed(false);
  }, [logoUrl, brandName]);

  const handleImageError = () => {
    setImageLoaded(false);
    
    // Try next source
    if (currentSourceIndex < logoSources.length - 1) {
      setCurrentSourceIndex(prev => prev + 1);
    } else {
      // All sources failed
      setAllSourcesFailed(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setAllSourcesFailed(false);
  };

  const showFallback = allSourcesFailed || !currentSource;

  return (
    <div 
      className={cn(
        'relative flex items-center justify-center rounded bg-gradient-to-br from-muted to-muted/80 overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {/* Fallback initials - always rendered, shown when all images fail */}
      <span 
        className={cn(
          'font-bold text-muted-foreground select-none transition-opacity',
          showFallback ? 'opacity-100' : 'opacity-0'
        )}
      >
        {initials}
      </span>

      {/* Actual image - try sources in order */}
      {!allSourcesFailed && currentSource && (
        <img
          key={currentSource}
          src={currentSource}
          alt={brandName}
          className={cn(
            'absolute inset-0 w-full h-full object-contain p-1',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            'transition-opacity duration-200'
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}
    </div>
  );
}

export default BrandLogo;
