/**
 * Brand Lookup Hook
 * 
 * React hook for intelligent brand lookup using multiple sources
 */

import { useState, useCallback } from 'react';
import { lookupBrandByName, lookupLogoFromWebsite } from '@/lib/gift-cards/brand-lookup-service';
import type { BrandLookupResult } from '@/types/giftCards';

export function useBrandLookup() {
  const [isLooking, setIsLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState<BrandLookupResult | null>(null);

  /**
   * Lookup a brand by name
   */
  const lookup = async (brandName: string): Promise<BrandLookupResult> => {
    setIsLooking(true);
    try {
      const result = await lookupBrandByName(brandName);
      setLookupResult(result);
      return result;
    } finally {
      setIsLooking(false);
    }
  };

  /**
   * Lookup logo from a website URL
   */
  const lookupFromWebsite = async (websiteUrl: string): Promise<string | null> => {
    setIsLooking(true);
    try {
      const logoUrl = await lookupLogoFromWebsite(websiteUrl);
      return logoUrl;
    } finally {
      setIsLooking(false);
    }
  };

  /**
   * Reset lookup state
   */
  const reset = useCallback(() => {
    setLookupResult(null);
    setIsLooking(false);
  }, []);

  return {
    lookup,
    lookupFromWebsite,
    isLooking,
    lookupResult,
    reset,
  };
}

