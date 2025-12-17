/**
 * Brand Detection and Presets
 * Gift card brand configurations and detection logic
 */

import type { GiftCardBrand, BrandStyle, GiftCardInfo } from '../types/context';

export const BRAND_STYLES: Record<GiftCardBrand, BrandStyle> = {
  'jimmy-johns': {
    brandKey: 'jimmy-johns',
    displayName: "Jimmy John's",
    colors: {
      primary: '#CC0000',     // JJ Red
      secondary: '#000000',   // Black
      background: 'linear-gradient(180deg, #CC0000 0%, #8B0000 100%)'
    },
    imagery: 'Fresh sub sandwiches with cheese pull, lettuce, tomatoes, premium deli meats, sesame seed bread',
    style: 'Bold, fast, energetic, "Freaky Fast" vibes, speed lines, dramatic food photography',
    foodType: 'sandwich'
  },
  
  'starbucks': {
    brandKey: 'starbucks',
    displayName: 'Starbucks',
    colors: {
      primary: '#00704A',     // Starbucks Green
      secondary: '#1E3932',   // Dark Green
      background: 'linear-gradient(180deg, #00704A 0%, #1E3932 100%)'
    },
    imagery: 'Coffee drinks, frappuccinos, iced drinks, hand holding cup, latte art, cafe atmosphere',
    style: 'Warm, lifestyle, aspirational, cozy, "Treat Yourself" vibes, bokeh lights, natural elements',
    foodType: 'coffee'
  },
  
  'marcos': {
    brandKey: 'marcos',
    displayName: "Marco's Pizza",
    colors: {
      primary: '#D4001C',     // Marco's Red
      secondary: '#FFC425',   // Gold
      background: 'linear-gradient(180deg, #D4001C 0%, #8B0000 100%)'
    },
    imagery: 'Fresh pizza with cheese pull, pepperoni, steam rising, golden crust, pizza box',
    style: 'Family celebration, "Pizza Night Hero", Italian warmth, comfort food joy',
    foodType: 'pizza'
  },
  
  'dominos': {
    brandKey: 'dominos',
    displayName: "Domino's",
    colors: {
      primary: '#006491',     // Domino's Blue
      secondary: '#E31837',   // Red
      background: 'linear-gradient(180deg, #E31837 0%, #8B0000 100%)'
    },
    imagery: 'Hot pizza, cheese pull, delivery energy, pizza box opening',
    style: 'Fast, reliable, celebration, family pizza night',
    foodType: 'pizza'
  },
  
  'subway': {
    brandKey: 'subway',
    displayName: 'Subway',
    colors: {
      primary: '#00923F',     // Subway Green
      secondary: '#FFC600',   // Yellow
      background: 'linear-gradient(180deg, #00923F 0%, #006B2D 100%)'
    },
    imagery: 'Fresh sub sandwiches, vegetables, healthy ingredients, bread texture',
    style: 'Fresh, healthy, customizable, "Eat Fresh" energy, bright and clean',
    foodType: 'sandwich'
  },
  
  'chilis': {
    brandKey: 'chilis',
    displayName: "Chili's",
    colors: {
      primary: '#CE1126',     // Chili Red
      secondary: '#FFFFFF',   // White
      background: 'linear-gradient(180deg, #CE1126 0%, #8B0000 100%)'
    },
    imagery: 'Sizzling fajitas, burgers, ribs, tex-mex food, casual dining atmosphere',
    style: 'Fun, casual, American grill, "Baby Back Ribs" energy, sizzle and smoke',
    foodType: 'restaurant'
  },
  
  'panera': {
    brandKey: 'panera',
    displayName: 'Panera Bread',
    colors: {
      primary: '#5C8727',     // Panera Green
      secondary: '#946B54',   // Brown
      background: 'linear-gradient(180deg, #5C8727 0%, #446120 100%)'
    },
    imagery: 'Artisan bread, soups, salads, bakery items, fresh ingredients, warm lighting',
    style: 'Wholesome, fresh, bakery-cafe warmth, artisanal, comfort food with quality',
    foodType: 'bakery-cafe'
  },
  
  'chipotle': {
    brandKey: 'chipotle',
    displayName: 'Chipotle',
    colors: {
      primary: '#A6192E',     // Chipotle Burgundy
      secondary: '#2C1E1E',   // Dark Brown
      background: 'linear-gradient(180deg, #A6192E 0%, #6B1119 100%)'
    },
    imagery: 'Burrito bowls, fresh ingredients, lime, cilantro, mexican food, natural wood',
    style: 'Fresh, natural, "Food with Integrity", clean and modern, ingredient-focused',
    foodType: 'mexican'
  },
  
  'generic-food': {
    brandKey: 'generic-food',
    displayName: 'Gift Card',
    colors: {
      primary: '#D4AF37',     // Gold
      secondary: '#1a1a1a',   // Black
      background: 'linear-gradient(180deg, #D4AF37 0%, #8B7500 100%)'
    },
    imagery: 'Generic appetizing food, premium gift card appearance',
    style: 'Premium, valuable, golden ticket energy',
    foodType: 'general'
  },
  
  'generic-retail': {
    brandKey: 'generic-retail',
    displayName: 'Gift Card',
    colors: {
      primary: '#4A90D9',     // Blue
      secondary: '#2C5282',   // Dark Blue
      background: 'linear-gradient(180deg, #4A90D9 0%, #2C5282 100%)'
    },
    imagery: 'Premium gift card, shopping bags, retail luxury',
    style: 'Premium, sophisticated, valuable prize',
    foodType: undefined
  },
  
  'unknown': {
    brandKey: 'unknown',
    displayName: 'Gift Card',
    colors: {
      primary: '#D4AF37',     // Gold (same as generic-food)
      secondary: '#1a1a1a',   // Black
      background: 'linear-gradient(180deg, #D4AF37 0%, #8B7500 100%)'
    },
    imagery: 'Generic appetizing food, premium gift card appearance',
    style: 'Premium, valuable, golden ticket energy',
    foodType: 'general'
  }
};

/**
 * Detect brand from gift card name
 */
export function detectBrand(brandName: string): GiftCardBrand {
  if (!brandName) return 'unknown';
  
  const normalized = brandName.toLowerCase().trim();
  
  // Check for keyword matches
  if (normalized.includes('jimmy') || normalized.includes('jj') || normalized.includes('john')) {
    return 'jimmy-johns';
  }
  if (normalized.includes('starbucks') || normalized.includes('sbux')) {
    return 'starbucks';
  }
  if (normalized.includes('marco')) {
    return 'marcos';
  }
  if (normalized.includes('domino')) {
    return 'dominos';
  }
  if (normalized.includes('subway')) {
    return 'subway';
  }
  if (normalized.includes('chili')) {
    return 'chilis';
  }
  if (normalized.includes('panera')) {
    return 'panera';
  }
  if (normalized.includes('chipotle')) {
    return 'chipotle';
  }
  
  // Check for food-related keywords
  const foodKeywords = ['pizza', 'coffee', 'sandwich', 'burger', 'food', 'restaurant', 'cafe'];
  if (foodKeywords.some(keyword => normalized.includes(keyword))) {
    return 'generic-food';
  }
  
  return 'generic-retail';
}

/**
 * Get brand style configuration
 */
export function getBrandStyle(brandKey: GiftCardBrand): BrandStyle {
  return BRAND_STYLES[brandKey];
}

/**
 * Get brand from gift card info
 */
export function getBrandFromGiftCard(giftCard: GiftCardInfo | null): BrandStyle | null {
  if (!giftCard) return null;
  
  const brandKey = detectBrand(giftCard.brand);
  return getBrandStyle(brandKey);
}
