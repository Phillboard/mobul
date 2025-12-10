/**
 * Brand Lookup Service
 * 
 * Provides intelligent brand lookup functionality using multiple sources:
 * 1. Popular brands database (instant)
 * 2. Clearbit Logo API (for common domains)
 * 3. Smart domain guessing
 */

import { searchPopularBrand, type PopularBrand } from './popular-brands-db';
import type { BrandLookupResult } from '@/types/giftCards';

/**
 * Common domain patterns for brand name to website conversion
 */
const DOMAIN_PATTERNS = [
  (name: string) => `${name}.com`,
  (name: string) => `${name}.net`,
  (name: string) => `${name}usa.com`,
  (name: string) => `${name}online.com`,
  (name: string) => `${name}store.com`,
  (name: string) => `${name.replace(/\s+/g, '')}.com`,
  (name: string) => `${name.replace(/'/g, '')}.com`,
  (name: string) => `${name.replace(/\s+/g, '-')}.com`,
];

/**
 * Check if a Clearbit logo URL exists and is accessible
 */
async function checkClearbitLogo(domain: string): Promise<string | null> {
  const url = `https://logo.clearbit.com/${domain}`;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return url;
    }
  } catch (error) {
    // Logo doesn't exist or network error
  }
  
  return null;
}

/**
 * Try to find a logo using domain guessing
 */
async function guessDomainAndFindLogo(brandName: string): Promise<{ website: string; logoUrl: string } | null> {
  const normalized = brandName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ''); // Remove spaces
  
  for (const pattern of DOMAIN_PATTERNS) {
    const domain = pattern(normalized);
    const logoUrl = await checkClearbitLogo(domain);
    
    if (logoUrl) {
      return { website: domain, logoUrl };
    }
  }
  
  return null;
}

/**
 * Extract domain from URL or brand name
 */
function extractDomain(input: string): string {
  // If it's already a domain (contains .com, .net, etc.)
  if (input.includes('.')) {
    try {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      return url.hostname;
    } catch {
      return input;
    }
  }
  
  // Otherwise, assume it's a brand name and try .com
  return `${input.toLowerCase().replace(/\s+/g, '')}.com`;
}

/**
 * Main brand lookup function
 * Tries multiple sources to find brand information
 */
export async function lookupBrandByName(brandName: string): Promise<BrandLookupResult> {
  // Step 1: Check popular brands database (instant)
  const popularBrand = searchPopularBrand(brandName);
  if (popularBrand) {
    return {
      found: true,
      logoUrl: popularBrand.logo_url,
      website: popularBrand.website,
      category: popularBrand.category,
      description: popularBrand.description,
      source: 'popular_db',
    };
  }
  
  // Step 2: Try Clearbit with domain guessing
  try {
    const result = await guessDomainAndFindLogo(brandName);
    if (result) {
      return {
        found: true,
        logoUrl: result.logoUrl,
        website: result.website,
        source: 'clearbit',
      };
    }
  } catch (error) {
    console.warn('Error during Clearbit lookup:', error);
  }
  
  // Step 3: Not found
  return {
    found: false,
    source: 'not_found',
  };
}

/**
 * Lookup brand logo from a known website URL
 * Useful when user provides the website directly
 */
export async function lookupLogoFromWebsite(websiteUrl: string): Promise<string | null> {
  const domain = extractDomain(websiteUrl);
  return await checkClearbitLogo(domain);
}

/**
 * Validate if a logo URL is accessible
 */
export async function validateLogoUrl(logoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(logoUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate brand code from brand name
 * Converts "Starbucks Coffee" -> "starbucks_coffee"
 */
export function generateBrandCode(brandName: string): string {
  return brandName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Suggest website URL from brand name
 * Returns most likely website URL
 */
export function suggestWebsiteUrl(brandName: string): string {
  const normalized = brandName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '');
  
  return `${normalized}.com`;
}

