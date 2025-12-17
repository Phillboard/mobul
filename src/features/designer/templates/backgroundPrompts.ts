/**
 * Background Prompt Templates
 * Prompts for background-only generation
 */

import type { DesignerContext } from '../types/context';
import type { CanvasConfig } from '../types/canvas';
import type { GiftCardBrand } from '../types/context';

export type BackgroundStyle = 
  | 'gift-card-reveal'
  | 'food-hero'
  | 'celebration'
  | 'lifestyle'
  | 'industry'
  | 'clean-gradient';

type BackgroundPromptFunction = (context: DesignerContext, config: CanvasConfig) => string;

export const BACKGROUND_PROMPTS: Record<BackgroundStyle, BackgroundPromptFunction> = {
  'gift-card-reveal': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#D4AF37', secondary: '#8B7500' };
    
    return `Background only template for postcard, ${config.orientation} orientation. NO TEXT, NO LOGOS, just background.

Visual composition:
- A generic premium gift card (metallic gold/silver) floating at dynamic angle in upper portion
- DRAMATIC golden light rays emanating from behind the card
- Sparkle particles and subtle confetti floating around
- Rich gradient from ${colors.primary} at top to ${colors.secondary}/darker at bottom
- Spotlight effect illuminating the card area
- Lower ${config.orientation === 'landscape' ? '40%' : '50%'} is cleaner gradient, ready for text overlay

The card should look valuable like a GOLDEN TICKET or lottery prize.
Premium advertising quality.
Celebration energy - recipient feels they've WON something.

DO NOT include any text, brand names, or specific logos - just the beautiful background.`;
  },

  'food-hero': (context, config) => {
    const food = context.brandStyle?.foodType || 'appetizing food';
    const imagery = context.brandStyle?.imagery || 'premium food photography';
    
    return `Background only template for postcard, ${config.orientation} orientation. NO TEXT, NO LOGOS.

Visual composition:
- Hero food imagery: ${imagery}
- ${food === 'sandwich' ? 'Fresh sub sandwich with visible layers, cheese, fresh vegetables' : ''}
- ${food === 'coffee' ? 'Beautiful coffee drink with steam, latte art, cozy atmosphere' : ''}
- ${food === 'pizza' ? 'Perfect pizza with epic cheese pull, steam rising, golden crust' : ''}
- Premium food photography lighting
- Dramatic but appetizing presentation
- Space in ${config.orientation === 'landscape' ? 'lower third' : 'upper or lower area'} for text overlay

The food should look IRRESISTIBLE - makes viewer immediately hungry.
Premium advertising photography quality.
Warm, appetizing color tones.

DO NOT include any text - just beautiful food imagery.`;
  },

  'celebration': (context, config) => {
    const colors = context.brandStyle?.colors || context.industry.colors;
    
    return `Background only template for postcard, ${config.orientation} orientation. NO TEXT.

Visual composition:
- Celebration confetti and streamers throughout
- Golden sparkle effects scattered
- Rich gradient background from ${colors.primary} to darker
- Winner energy, jackpot celebration feeling
- Subtle light rays suggesting prize reveal
- Clean areas for gift card and text overlay

Prize-winner atmosphere - like winning a gameshow.
Premium, exciting, celebration energy.

DO NOT include text or logos.`;
  },

  'lifestyle': (context, config) => {
    const style = context.brandStyle?.style || 'Premium lifestyle energy';
    
    return `Background only template for postcard, ${config.orientation} orientation. NO TEXT.

Visual composition:
- Aspirational lifestyle imagery
- ${style}
- Warm, inviting atmosphere
- Bokeh lights and natural elements
- Space for overlays

Premium lifestyle photography. Makes viewer feel special.

DO NOT include text.`;
  },

  'industry': (context, config) => {
    const styleNotes = context.industry.styleNotes;
    const colors = context.industry.colors;
    
    return `Background only for ${config.orientation} postcard. ${styleNotes}. Colors: ${colors.primary}, ${colors.secondary}. Professional, industry-appropriate. NO TEXT.`;
  },

  'clean-gradient': (context, config) => {
    const colors = context.brandStyle?.colors || context.industry.colors;
    
    return `Background only template for postcard, ${config.orientation} orientation. NO TEXT, NO IMAGERY.

Visual composition:
- Clean professional gradient
- From ${colors.primary} at top
- To ${colors.secondary || 'darker shade'} at bottom
- Subtle texture or noise for depth
- Professional, versatile, ready for any content overlay

Minimal, professional, high-quality gradient background.
Ready for text and element overlays.`;
  },
};

export const BRAND_BACKGROUND_SUGGESTIONS: Record<GiftCardBrand, BackgroundStyle[]> = {
  'jimmy-johns': ['gift-card-reveal', 'food-hero', 'celebration'],
  'starbucks': ['lifestyle', 'food-hero', 'clean-gradient'],
  'marcos': ['gift-card-reveal', 'food-hero', 'celebration'],
  'dominos': ['food-hero', 'celebration', 'gift-card-reveal'],
  'subway': ['food-hero', 'clean-gradient', 'celebration'],
  'chilis': ['food-hero', 'celebration', 'gift-card-reveal'],
  'panera': ['food-hero', 'lifestyle', 'clean-gradient'],
  'chipotle': ['food-hero', 'celebration', 'clean-gradient'],
  'generic-food': ['gift-card-reveal', 'celebration', 'clean-gradient'],
  'generic-retail': ['gift-card-reveal', 'clean-gradient', 'celebration'],
  'unknown': ['gift-card-reveal', 'clean-gradient', 'celebration'],
};

/**
 * Get background prompt
 */
export function getBackgroundPrompt(
  context: DesignerContext,
  config: CanvasConfig,
  style: BackgroundStyle
): string {
  const promptFn = BACKGROUND_PROMPTS[style];
  return promptFn(context, config);
}

/**
 * Get suggested backgrounds for brand
 */
export function getBrandBackgroundSuggestions(context: DesignerContext): BackgroundStyle[] {
  const brandKey = context.giftCard?.brandKey || 'unknown';
  return BRAND_BACKGROUND_SUGGESTIONS[brandKey] || BRAND_BACKGROUND_SUGGESTIONS['unknown'];
}
