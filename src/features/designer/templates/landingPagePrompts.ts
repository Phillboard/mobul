/**
 * Landing Page Prompt Templates
 * Prompts for landing page generation
 */

import type { DesignerContext } from '../types/context';
import type { LandingPageConfig } from '../types/landingPage';

export function getLandingPagePrompt(context: DesignerContext, config: LandingPageConfig): string {
  const amount = context.giftCard?.amount || 15;
  const brand = context.giftCard?.brand || 'Gift Card';
  const companyName = context.company.name;
  const primaryColor = context.brandStyle?.colors.primary || '#8B5CF6';
  const imagery = context.brandStyle?.imagery || 'premium gift card';
  const style = context.brandStyle?.style || 'Professional and trustworthy';
  
  return `Design a high-converting landing page for a gift card promotion.

CONTEXT:
- Gift Card: $${amount} ${brand}
- Company: ${companyName}
- Industry: ${context.industry.displayName}

PAGE STRUCTURE:

1. HERO SECTION:
   - Headline: "Claim Your FREE $${amount} ${brand} Gift Card"
   - Subheadline: "Complete the form below — your card ships today!"
   - Hero image: ${imagery}
   - ${primaryColor} as accent color
   - Warm, inviting, valuable feeling

2. FORM SECTION:
   - Clean, minimal form design
   - Fields: ${config.form.fields.map(f => f.label).join(', ')}
   - Large CTA button: "${config.form.submitLabel}"
   - Button color: ${primaryColor}
   - Privacy note: "We respect your privacy"
   - Minimal friction design

3. GIFT CARD SHOWCASE:
   - Large, beautiful gift card image
   - "$${amount} VALUE" badge
   - ${brand} branding
   - "Ships within 24 hours" messaging
   - ${imagery}

4. TRUST SECTION:
   - Why this offer is legitimate
   - ${companyName} information
   - Secure payment/data badges (if applicable)
   - Contact information

5. FOOTER:
   - Company name and address
   - Privacy policy link
   - Terms link
   - Simple, clean

DESIGN PRINCIPLES:
- Mobile-first responsive design
- High contrast CTA button
- Gift card prominently featured
- Trust signals throughout
- Minimal distractions
- Fast-loading design
- ${style}

COLOR PALETTE:
- Primary: ${primaryColor}
- Secondary: ${context.brandStyle?.colors.secondary || '#1F2937'}
- Background: White or light gray
- Text: Dark gray (#1F2937)
- CTA: Primary color with hover state

The page should feel valuable, trustworthy, and make the visitor want to claim their free gift card immediately.`;
}

export function getLandingHeroPrompt(context: DesignerContext, config: LandingPageConfig): string {
  const amount = context.giftCard?.amount || 15;
  const brand = context.giftCard?.brand || 'Gift Card';
  const primaryColor = context.brandStyle?.colors.primary || '#8B5CF6';
  
  return `Design a landing page HERO SECTION for gift card promotion.

- Headline with {{first_name}} personalization if available
- "$${amount} ${brand}" gift card showcase with dramatic presentation
- Subheadline explaining the offer
- ${primaryColor} accent color
- Prize-winner energy

The hero should immediately communicate VALUE and TRUST.`;
}

export function getLandingFormPrompt(context: DesignerContext, config: LandingPageConfig): string {
  return `Design a FORM SECTION for lead capture.

- Clean, minimal form
- Fields: ${config.form.fields.map(f => f.label).join(', ')}
- Large, prominent CTA button
- Trust/privacy messaging
- Easy to complete on mobile

Minimize friction while collecting necessary information.`;
}
