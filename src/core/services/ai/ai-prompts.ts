/**
 * AI Prompt Engineering for Landing Page Generation
 * Structured prompts for different page types and industries
 */

export type PageType = 'product' | 'lead_gen' | 'thank_you' | 'event' | 'gift_card' | 'generic';
export type Industry = 'real_estate' | 'automotive' | 'healthcare' | 'retail' | 'restaurant' | 'service' | 'generic';

export interface PromptContext {
  pageType: PageType;
  industry: Industry;
  brandColors?: string[];
  brandFonts?: string[];
  targetAudience?: string;
  keyMessage?: string;
  callToAction?: string;
  includeForm?: boolean;
  includeTestimonials?: boolean;
  mobileFirst?: boolean;
}

/**
 * Base system prompt for landing page generation
 */
export const BASE_SYSTEM_PROMPT = `You are an expert web designer specializing in high-converting landing pages.

CORE PRINCIPLES:
1. Generate complete, production-ready HTML with inline Tailwind CSS classes
2. Create mobile-first, responsive designs that work on all devices
3. Use semantic HTML5 elements for accessibility
4. Include ARIA labels and alt text
5. Ensure WCAG 2.1 AA compliance
6. Optimize for page speed (no external dependencies)
7. Use clear visual hierarchy with compelling headlines
8. Include strong, action-oriented CTAs

TECHNICAL REQUIREMENTS:
- Output pure HTML with inline Tailwind CSS classes
- No external CSS files or JavaScript dependencies
- Use Tailwind CDN link in the <head>
- Ensure color contrast ratios meet WCAG standards
- Include meta tags for SEO and social sharing
- Use system fonts or Google Fonts (with proper loading)

DESIGN BEST PRACTICES:
- Clear visual hierarchy (F-pattern or Z-pattern layouts)
- White space for breathing room
- Consistent color palette (max 3-4 colors)
- Typography scale (heading sizes: 3xl, 2xl, xl, lg)
- Button hierarchy (primary, secondary, ghost)
- Social proof placement (testimonials, reviews, logos)
- Trust signals (security badges, guarantees)

CONVERSION OPTIMIZATION:
- Above-the-fold hero with clear value proposition
- Single, focused call-to-action
- Benefit-driven copy (not feature-driven)
- Urgency/scarcity elements (when appropriate)
- Risk reversal (money-back guarantee, free trial)
- Exit intent considerations

ACCESSIBILITY:
- Semantic HTML structure
- ARIA labels for interactive elements
- Alt text for all images
- Keyboard navigation support
- Screen reader compatibility
- Color contrast minimum 4.5:1`;

/**
 * Generate page type specific instructions
 */
export function getPageTypeInstructions(pageType: PageType): string {
  const instructions: Record<PageType, string> = {
    product: `
PRODUCT PAGE SPECIFICS:
- Hero section with product image and compelling headline
- Feature/benefit grid (3-4 key benefits)
- Product showcase with high-quality images
- Pricing section with clear value proposition
- Testimonials section with photos
- FAQ accordion
- Strong CTA buttons throughout
- Trust badges (money-back guarantee, secure payment)`,
    
    lead_gen: `
LEAD GENERATION PAGE SPECIFICS:
- Attention-grabbing headline with subheadline
- Lead magnet description (ebook, checklist, guide)
- Short form (3-5 fields max: name, email, optional phone)
- Bullet points highlighting lead magnet benefits
- Social proof (number of downloads, testimonials)
- Privacy assurance ("We'll never spam you")
- Thank you confirmation
- Optional exit-intent popup`,
    
    thank_you: `
THANK YOU PAGE SPECIFICS:
- Confirmation headline ("Success!", "Thank You!")
- Clear next steps instructions
- Download button or access link
- Social sharing buttons
- Additional resources or upsell
- Contact information
- Video welcome message (optional)`,
    
    event: `
EVENT PAGE SPECIFICS:
- Event title and date prominently displayed
- Hero image of venue or past event
- Event details (date, time, location, map)
- Agenda/schedule timeline
- Speaker bios with photos
- Registration form
- Countdown timer
- Social proof (attendee count, testimonials)
- Venue information and directions`,
    
    gift_card: `
GIFT CARD REDEMPTION PAGE SPECIFICS:
- Celebratory hero section (confetti, vibrant colors)
- Gift card value prominently displayed
- Redemption form with clear instructions
- Benefits grid (fast, secure, easy)
- Redemption code input field
- Progress indicator for multi-step redemption
- Brand logos of available gift cards
- FAQ section for common questions
- Customer support contact`,
    
    generic: `
GENERIC PAGE SPECIFICS:
- Clean, professional layout
- Clear headline and subheadline
- Well-organized content sections
- Appropriate CTAs based on purpose
- Contact information or form
- Footer with links`,
  };
  
  return instructions[pageType] || instructions.generic;
}

/**
 * Generate industry-specific instructions
 */
export function getIndustryInstructions(industry: Industry): string {
  const instructions: Record<Industry, string> = {
    real_estate: `
REAL ESTATE INDUSTRY GUIDELINES:
- Large, high-quality property images
- Virtual tour or 3D walkthrough option
- Property details grid (beds, baths, sqft, price)
- Neighborhood highlights
- Map integration
- Agent contact form
- Schedule showing CTA
- Mortgage calculator
- Trust signals (MLS, realtor.com logos)
Color palette: Professional blues, warm neutrals`,
    
    automotive: `
AUTOMOTIVE INDUSTRY GUIDELINES:
- Vehicle showcase with image gallery
- Key specs prominently displayed (MPG, horsepower, features)
- Financing options and calculator
- Comparison tool
- Schedule test drive CTA
- Inventory search
- Trade-in value estimator
- Service department info
- Manufacturer warranties
Color palette: Bold, energetic (reds, blues, blacks)`,
    
    healthcare: `
HEALTHCARE INDUSTRY GUIDELINES:
- Trust and professionalism emphasized
- Provider credentials and certifications
- Patient testimonials
- Insurance accepted
- Appointment booking form
- Telehealth options
- HIPAA compliance mentions
- Accessibility features
- Clear contact information
Color palette: Calming blues, clean whites, professional greens`,
    
    retail: `
RETAIL INDUSTRY GUIDELINES:
- Product showcase with pricing
- Limited-time offers and promotions
- Size/color selection
- Add to cart button
- Customer reviews and ratings
- Shipping information
- Return policy
- Related products
- Shopping cart integration
Color palette: Brand-appropriate, energetic`,
    
    restaurant: `
RESTAURANT INDUSTRY GUIDELINES:
- Mouthwatering food photography
- Menu highlights or signature dishes
- Reservation form or booking widget
- Location and hours
- Online ordering CTA
- Chef bio or restaurant story
- Reviews and ratings
- Special dietary options
- Catering services
Color palette: Warm, appetite-stimulating (reds, oranges, yellows)`,
    
    service: `
SERVICE INDUSTRY GUIDELINES:
- Clear service offerings
- Process explanation (how it works)
- Before/after examples
- Client testimonials
- Service area map
- Free consultation/quote form
- Credentials and certifications
- Satisfaction guarantee
- Emergency contact option
Color palette: Professional, trustworthy (blues, greens)`,
    
    generic: `
GENERAL INDUSTRY GUIDELINES:
- Professional, clean design
- Clear value proposition
- Service/product benefits
- Social proof
- Contact options
Color palette: Brand-appropriate`,
  };
  
  return instructions[industry] || instructions.generic;
}

/**
 * Generate complete prompt from context
 */
export function generatePrompt(userPrompt: string, context?: Partial<PromptContext>): string {
  const ctx: PromptContext = {
    pageType: 'generic',
    industry: 'generic',
    mobileFirst: true,
    ...context,
  };
  
  let prompt = BASE_SYSTEM_PROMPT;
  
  // Add page type instructions
  prompt += '\n\n' + getPageTypeInstructions(ctx.pageType);
  
  // Add industry instructions
  prompt += '\n\n' + getIndustryInstructions(ctx.industry);
  
  // Add brand customization
  if (ctx.brandColors && ctx.brandColors.length > 0) {
    prompt += `\n\nBRAND COLORS: Use these colors in the design: ${ctx.brandColors.join(', ')}`;
  }
  
  if (ctx.brandFonts && ctx.brandFonts.length > 0) {
    prompt += `\n\nBRAND FONTS: Use these fonts: ${ctx.brandFonts.join(', ')}`;
  }
  
  // Add target audience
  if (ctx.targetAudience) {
    prompt += `\n\nTARGET AUDIENCE: ${ctx.targetAudience}`;
  }
  
  // Add key message
  if (ctx.keyMessage) {
    prompt += `\n\nKEY MESSAGE: ${ctx.keyMessage}`;
  }
  
  // Add CTA
  if (ctx.callToAction) {
    prompt += `\n\nCALL TO ACTION: ${ctx.callToAction}`;
  }
  
  // Add component requirements
  if (ctx.includeForm) {
    prompt += '\n\nINCLUDE: Contact or lead generation form';
  }
  
  if (ctx.includeTestimonials) {
    prompt += '\n\nINCLUDE: Testimonials section with 2-3 reviews';
  }
  
  // Add user prompt
  prompt += `\n\n===== USER REQUEST =====\n${userPrompt}`;
  
  prompt += `\n\n===== OUTPUT FORMAT =====
Generate a complete HTML page following all the guidelines above. The HTML should:
1. Include <!DOCTYPE html> declaration
2. Include Tailwind CSS CDN in <head>
3. Use semantic HTML5 elements
4. Be mobile-responsive using Tailwind's responsive classes
5. Include proper meta tags for SEO
6. Be production-ready (no placeholders)`;
  
  return prompt;
}

/**
 * Chat-based editing prompt
 */
export function generateChatPrompt(userMessage: string, currentHtml: string): string {
  return `You are helping a user refine their landing page design through conversation.

CURRENT HTML:
\`\`\`html
${currentHtml}
\`\`\`

USER REQUEST: ${userMessage}

Respond with:
1. updatedHtml: The complete updated HTML with all changes applied
2. explanation: A friendly explanation of what you changed and why
3. changesMade: An array of specific changes (e.g., ["Changed hero background to blue", "Increased button size"])

Maintain all existing functionality and design elements unless specifically asked to change them.
Keep the HTML semantic, accessible, and mobile-responsive.`;
}

/**
 * Image analysis prompt for mailer conversion
 */
export function generateImageAnalysisPrompt(): string {
  return `Analyze this direct mail piece image and extract:

1. **Layout Structure**: Identify sections (hero, body, CTA, etc.)
2. **Color Palette**: Extract primary and secondary colors
3. **Typography**: Note font styles, sizes, hierarchy
4. **Key Messages**: Extract headlines, taglines, body copy
5. **Imagery**: Describe images and their placement
6. **Call to Action**: Identify CTA text and styling
7. **Brand Elements**: Logo, brand colors, style

Based on this analysis, create a landing page that:
- Matches the visual style and branding
- Converts the print layout to web-optimized design
- Maintains message consistency
- Enhances with web-specific features (forms, animations)
- Ensures mobile responsiveness

Output the complete HTML with inline Tailwind CSS.`;
}

/**
 * Link analysis prompt for competitive research
 */
export function generateLinkAnalysisPrompt(extractedData: {
  title?: string;
  description?: string;
  colors?: string[];
  fonts?: string[];
  structure?: string;
}): string {
  return `Create a landing page inspired by this website analysis:

EXTRACTED DATA:
- Title: ${extractedData.title || 'N/A'}
- Description: ${extractedData.description || 'N/A'}
- Colors: ${extractedData.colors?.join(', ') || 'N/A'}
- Fonts: ${extractedData.fonts?.join(', ') || 'N/A'}
- Structure: ${extractedData.structure || 'N/A'}

Create a unique landing page that:
1. Uses a similar visual style but with original content
2. Improves upon the original design
3. Focuses on conversion optimization
4. Maintains brand consistency
5. Is fully responsive

Do NOT copy content directly. Instead, create original, compelling copy that matches the style and purpose.`;
}

