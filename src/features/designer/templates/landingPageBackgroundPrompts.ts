/**
 * Landing Page Background Prompt Templates
 * Web-focused prompts for landing page background generation
 */

import type { DesignerContext } from '../types/context';
import type { LandingPageConfig } from '../types/landingPage';

export type LandingBackgroundStyle = 
  | 'hero-gradient'
  | 'product-showcase'
  | 'testimonial-bg'
  | 'pricing-bg'
  | 'pattern-overlay'
  | 'form-bg'
  | 'footer-bg'
  | 'abstract-web';

type LandingBackgroundPromptFunction = (context: DesignerContext, config: LandingPageConfig) => string;

export const LANDING_BACKGROUND_PROMPTS: Record<LandingBackgroundStyle, LandingBackgroundPromptFunction> = {
  'hero-gradient': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#3B82F6', secondary: '#1E40AF' };
    const style = config.style || 'standard';
    
    return `Hero section background for landing page. NO TEXT, NO LOGOS, just background.

Visual composition:
- Modern, professional gradient flowing smoothly
- Primary color ${colors.primary} transitioning to ${colors.secondary}
- Subtle abstract shapes or flowing curves for visual interest
- Light overlay areas where headlines and CTAs will go
- ${style === 'minimal' ? 'Clean and minimal with lots of white space' : 'Rich and dynamic with layered gradients'}

The background should feel:
- Premium and professional
- Modern tech/SaaS aesthetic
- Inviting and trustworthy
- Ready for bold headline overlays

DO NOT include any text, logos, or specific imagery - just the beautiful gradient background.`;
  },

  'product-showcase': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#3B82F6', secondary: '#F3F4F6' };
    
    return `Product showcase section background for landing page. NO TEXT, NO LOGOS.

Visual composition:
- Clean, minimal background
- Soft neutral tones (light grays, whites)
- Subtle shadows suggesting depth
- Professional photography lighting feel
- Central negative space for product placement
- ${colors.primary} accent hints

The background should:
- Make products pop visually
- Feel premium and e-commerce ready
- Suggest professional quality
- Have subtle depth without distraction

DO NOT include text or specific products - just the clean backdrop.`;
  },

  'testimonial-bg': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#3B82F6', secondary: '#1E40AF' };
    
    return `Testimonial section background for landing page. NO TEXT, NO FACES.

Visual composition:
- Soft, warm gradient
- Light ${colors.primary} to white fade
- Subtle pattern or texture (light dots, soft waves)
- Inviting and trustworthy feel
- Space for quote cards and avatars

The background should evoke:
- Trust and credibility
- Warmth and approachability
- Professional but friendly
- Social proof energy

DO NOT include text, faces, or quotes - just the background.`;
  },

  'pricing-bg': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#3B82F6', secondary: '#F3F4F6' };
    
    return `Pricing section background for landing page. NO TEXT, NO NUMBERS.

Visual composition:
- Clean, professional gradient
- Light to white tones
- Subtle geometric patterns (thin lines, grid hints)
- Modern SaaS aesthetic
- Minimal and conversion-focused
- Light ${colors.primary} accent areas

The background should:
- Not distract from pricing information
- Feel premium and valuable
- Support comparison layouts
- Be clean and professional

DO NOT include text, numbers, or pricing elements - just the clean background.`;
  },

  'pattern-overlay': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#3B82F6' };
    
    return `Subtle pattern background for landing page sections. NO TEXT.

Visual composition:
- Geometric pattern with low opacity
- Options: dot grid, thin lines, hexagons, circles
- ${colors.primary} tinted or neutral gray
- Works as overlay on other backgrounds
- Modern, tech-forward feel
- Minimal and non-distracting

Pattern should be:
- Subtle and professional
- Repeating and seamless
- Light enough for text overlay
- Contemporary web design style

DO NOT include text - just the pattern.`;
  },

  'form-bg': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#3B82F6', secondary: '#EFF6FF' };
    
    return `Form section background for landing page. NO TEXT, NO FORM ELEMENTS.

Visual composition:
- Calming, professional gradient
- Light blues, soft greens, or neutral tones
- Clean and minimal
- Suggests trust and security
- Central focus area for form placement
- ${colors.secondary} base with subtle depth

The background should:
- Not distract from form inputs
- Create sense of security
- Feel professional and trustworthy
- Support user focus and completion

DO NOT include text or form elements - just the calming background.`;
  },

  'footer-bg': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#1F2937', secondary: '#111827' };
    
    return `Footer section background for landing page. NO TEXT, NO LOGOS.

Visual composition:
- Dark gradient from ${colors.primary} to darker/black
- Subtle texture or pattern (fine grain, subtle lines)
- Professional, finished feel
- Slight gradient variation for depth
- Modern website aesthetic

The background should:
- Clearly define the footer area
- Feel premium and professional
- Provide good contrast for light text
- Complete the page design elegantly

DO NOT include text or logos - just the dark background.`;
  },

  'abstract-web': (context, config) => {
    const colors = context.brandStyle?.colors || { primary: '#3B82F6', secondary: '#8B5CF6' };
    
    return `Abstract web design background for landing page. NO TEXT, NO LOGOS.

Visual composition:
- Flowing abstract shapes and gradients
- Dynamic movement suggested through curves
- ${colors.primary} to ${colors.secondary} color transitions
- Modern, tech-forward aesthetic
- 3D depth effects (subtle)
- Vibrant but professional

The background should feel:
- Contemporary and cutting-edge
- Dynamic and engaging
- Professional tech company vibe
- Suitable for startup/SaaS landing pages

DO NOT include text or specific imagery - just abstract visual elements.`;
  },
};

/**
 * Get landing page background prompt
 */
export function getLandingBackgroundPrompt(
  context: DesignerContext,
  config: LandingPageConfig,
  style: LandingBackgroundStyle
): string {
  const promptFn = LANDING_BACKGROUND_PROMPTS[style];
  return promptFn(context, config);
}

/**
 * Suggested background styles for different page sections
 */
export const SECTION_BACKGROUND_SUGGESTIONS: Record<string, LandingBackgroundStyle[]> = {
  hero: ['hero-gradient', 'abstract-web', 'product-showcase'],
  features: ['pattern-overlay', 'hero-gradient', 'abstract-web'],
  testimonials: ['testimonial-bg', 'pattern-overlay', 'hero-gradient'],
  pricing: ['pricing-bg', 'pattern-overlay', 'hero-gradient'],
  form: ['form-bg', 'hero-gradient', 'testimonial-bg'],
  footer: ['footer-bg'],
  cta: ['hero-gradient', 'abstract-web', 'pattern-overlay'],
};

/**
 * Get suggested backgrounds for a section type
 */
export function getSectionBackgroundSuggestions(sectionType: string): LandingBackgroundStyle[] {
  return SECTION_BACKGROUND_SUGGESTIONS[sectionType] || ['hero-gradient', 'abstract-web', 'pattern-overlay'];
}
