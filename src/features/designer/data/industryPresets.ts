/**
 * Industry Presets
 * Industry-specific configurations and styling
 */

import type { IndustryVertical, IndustryInfo } from '../types/context';

export const INDUSTRY_STYLES: Record<IndustryVertical, IndustryInfo> = {
  'auto_warranty': {
    vertical: 'auto_warranty',
    displayName: 'Auto Warranty',
    colors: {
      primary: '#CC0000',
      secondary: '#1a1a1a'
    },
    styleNotes: 'Premium automotive sophistication, sleek cars, trust and protection, professional but exciting'
  },
  
  'auto_service': {
    vertical: 'auto_service',
    displayName: 'Auto Service',
    colors: {
      primary: '#1E40AF',
      secondary: '#1E3A5F'
    },
    styleNotes: 'Reliable, trustworthy, quality service, modern garage aesthetic'
  },
  
  'roofing': {
    vertical: 'roofing',
    displayName: 'Roofing',
    colors: {
      primary: '#1E40AF',
      secondary: '#1E3A5F'
    },
    styleNotes: 'Home and family focused, quality craftsmanship, blue skies, beautiful homes, trust and reliability'
  },
  
  'solar': {
    vertical: 'solar',
    displayName: 'Solar',
    colors: {
      primary: '#F59E0B',
      secondary: '#059669'
    },
    styleNotes: 'Clean, modern, eco-friendly, sunshine and savings, future-focused, bright and optimistic'
  },
  
  'hvac': {
    vertical: 'hvac',
    displayName: 'HVAC',
    colors: {
      primary: '#0369A1',
      secondary: '#134E4A'
    },
    styleNotes: 'Comfort and climate control, cozy home interiors, temperature regulation, reliability'
  },
  
  'home_services': {
    vertical: 'home_services',
    displayName: 'Home Services',
    colors: {
      primary: '#16A34A',
      secondary: '#166534'
    },
    styleNotes: 'Well-maintained homes, landscaping, property care, attention to detail'
  },
  
  'insurance': {
    vertical: 'insurance',
    displayName: 'Insurance',
    colors: {
      primary: '#1D4ED8',
      secondary: '#1E3A8A'
    },
    styleNotes: 'Protection, security, peace of mind, family safety, trustworthy'
  },
  
  'real_estate': {
    vertical: 'real_estate',
    displayName: 'Real Estate',
    colors: {
      primary: '#7C3AED',
      secondary: '#4C1D95'
    },
    styleNotes: 'Beautiful properties, dream homes, SOLD energy, aspirational living'
  },
  
  'other': {
    vertical: 'other',
    displayName: 'Business',
    colors: {
      primary: '#374151',
      secondary: '#1F2937'
    },
    styleNotes: 'Professional, trustworthy, clean and modern, versatile business aesthetic'
  }
};

export const INDUSTRY_DISPLAY_NAMES: Record<IndustryVertical, string> = {
  'auto_warranty': 'Auto Warranty',
  'auto_service': 'Auto Service',
  'roofing': 'Roofing',
  'solar': 'Solar',
  'hvac': 'HVAC',
  'home_services': 'Home Services',
  'insurance': 'Insurance',
  'real_estate': 'Real Estate',
  'other': 'Business'
};

/**
 * Get industry style configuration
 */
export function getIndustryStyle(vertical: IndustryVertical): IndustryInfo {
  return INDUSTRY_STYLES[vertical];
}

/**
 * Attempt to detect industry from text (campaign name, etc.)
 */
export function detectIndustry(keywords: string): IndustryVertical {
  if (!keywords) return 'other';
  
  const normalized = keywords.toLowerCase().trim();
  
  if (normalized.includes('warranty') || normalized.includes('vehicle protection')) {
    return 'auto_warranty';
  }
  if (normalized.includes('auto') || normalized.includes('car') || normalized.includes('mechanic')) {
    return 'auto_service';
  }
  if (normalized.includes('roof') || normalized.includes('shingle')) {
    return 'roofing';
  }
  if (normalized.includes('solar') || normalized.includes('panel')) {
    return 'solar';
  }
  if (normalized.includes('hvac') || normalized.includes('heating') || normalized.includes('cooling') || normalized.includes('air conditioning')) {
    return 'hvac';
  }
  if (normalized.includes('lawn') || normalized.includes('landscape') || normalized.includes('home service')) {
    return 'home_services';
  }
  if (normalized.includes('insurance')) {
    return 'insurance';
  }
  if (normalized.includes('real estate') || normalized.includes('realtor') || normalized.includes('property')) {
    return 'real_estate';
  }
  
  return 'other';
}
