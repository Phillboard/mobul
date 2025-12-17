/**
 * Front Design Prompt Templates
 * Premium quality prompts for front-of-postcard designs
 */

import type { DesignerContext } from '../types/context';
import type { CanvasConfig } from '../types/canvas';
import type { GiftCardBrand } from '../types/context';

type FrontPromptFunction = (context: DesignerContext, config: CanvasConfig) => string;

export const FRONT_PROMPTS: Record<GiftCardBrand, FrontPromptFunction> = {
  'jimmy-johns': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 15;
    const companyName = context.company.name;
    const phone = context.company.phone || '1-800-XXX-XXXX';
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

THE HERO SHOT - GIFT CARD:
- A Jimmy John's gift card floating at a dramatic 15-degree angle
- Card shows "$${amount}" prominently with the JJ logo
- DRAMATIC golden glow emanating from behind the card
- Soft light rays spreading outward like a prize being revealed
- Tiny golden sparkle particles floating around the card
- The card should look like a GOLDEN TICKET - valuable and desirable

THE FOOD - SANDWICH:
- ${isLandscape ? 'Below/beside' : 'Below'} the card: A PERFECT Jimmy John's sub sandwich
- Signature French bread with sesame seeds catching the light
- Visible layers: fresh lettuce, ripe tomatoes, premium deli meats with texture
- Epic cheese or mayo drip for visual appeal
- Premium food photography lighting - appetizing and irresistible

BACKGROUND:
- Rich gradient from Jimmy John's red (#CC0000) at top to deeper crimson (#8B0000) at bottom
- Subtle diagonal speed lines suggesting "Freaky Fast" energy
- Professional studio lighting with soft shadows
- Warm, appetizing atmosphere

TEXT ELEMENTS (use template tokens - do NOT write actual names):
- Top area: "{{first_name}}, YOUR FREE GIFT IS HERE!" in bold white with subtle shadow
- Below: "${companyName} appreciates your business" in cream/white
- Optional tagline: "One quick call = FREE lunch on us"

BOTTOM SECTION (clear call-to-action area):
- Large phone number "${phone}" in bold white banner
- QR code on white square background
- Ticket-stub style box: "YOUR VIP CODE: {{unique_code}}" in bold on cream
- Small urgency: "Call by {{date}} - Don't let it get cold!"

CRITICAL REQUIREMENTS:
- Gift card is the DOMINANT visual element with DRAMATIC lighting
- Food looks DELICIOUS - premium photography quality
- "Prize-winner" energy throughout
- Text is readable with high contrast
- ${isLandscape ? 'LANDSCAPE orientation - wider than tall' : 'PORTRAIT orientation - taller than wide'}

STYLE: Premium advertising campaign, prize-winner energy, makes the gift card look like a lottery win, food photography that makes you hungry, professional direct mail that DEMANDS attention.`;
  },

  'starbucks': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 10;
    const companyName = context.company.name;
    const phone = context.company.phone || '1-888-XXX-XXXX';
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

THE HERO SHOT - GIFT CARD:
- A Starbucks gift card being held elegantly or floating prominently
- Card shows "$${amount}" with the Starbucks siren logo
- Soft GREEN GLOW around the card - ethereal, premium feeling
- Subtle sparkle particles and confetti suggesting celebration
- Card tilted at an appealing, dynamic angle

THE LIFESTYLE IMAGERY:
- Hand holding a beautiful Starbucks drink (iced coffee, frappuccino, or refresher)
- Perfect condensation droplets on the cup
- Creamy whipped cream or beautiful latte art visible
- Fresh, vibrant, refreshing energy
- Natural lighting, lifestyle photography feel
- Bokeh lights in background suggesting cozy cafe atmosphere

BACKGROUND:
- Gradient incorporating Starbucks green (#00704A) 
- Warm, inviting, cafe atmosphere
- Soft bokeh lights (golden/warm tones)
- Natural plant elements subtly in frame
- Bright, optimistic, "treat yourself" energy

TEXT ELEMENTS (use template tokens):
- Top: "{{first_name}}" in elegant script font
- Main headline: "TREAT YOURSELF!" in large, bold, playful text
- Below: "Free $${amount} Starbucks Gift Card" in clean font
- Subtext: "when you call about your vehicle warranty"
- Personal touch: "Because you deserve nice things 💚"

BOTTOM SECTION:
- Phone number "${phone}" in Starbucks green banner
- QR code on clean white background
- "CODE: {{unique_code}}" in styled box
- "${companyName}" subtle but present

CRITICAL REQUIREMENTS:
- Starbucks green is the dominant accent color
- Feeling is WARM, ASPIRATIONAL, LIFESTYLE
- Not aggressive sales - more "treat yourself" vibes
- The drink looks DELICIOUS and refreshing
- Gift card is prominent but naturally integrated
- ${isLandscape ? 'LANDSCAPE orientation' : 'PORTRAIT orientation'}

STYLE: Aspirational lifestyle advertising, warm and inviting, premium coffee shop energy, makes the recipient feel special and deserving, authentic Starbucks brand aesthetic.`;
  },

  'marcos': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 15;
    const companyName = context.company.name;
    const phone = context.company.phone || '1-800-XXX-XXXX';
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

THE HERO SHOT - GIFT CARD:
- Marco's Pizza gift card floating at dynamic angle
- Card shows "$${amount}" prominently with Marco's branding
- GOLDEN GLOW radiating from behind the card
- Celebration sparkles and light rays
- Prize-winner energy - looks like winning a jackpot

THE FOOD - PIZZA:
- EPIC cheese pull from a fresh Marco's pizza
- Perfect pepperoni curling at edges
- Steam rising from hot pizza
- Golden, crispy crust with texture
- Premium pizza photography - makes viewer immediately hungry
- Pizza box opening or slice being lifted

BACKGROUND:
- Rich gradient from Marco's red (#D4001C) to deeper crimson
- Gold accents (#FFC425) catching light
- Warm, celebratory atmosphere
- Family-friendly, comforting energy

TEXT ELEMENTS (use template tokens):
- Top: "{{first_name}}, YOU'RE THE PIZZA NIGHT HERO!" in bold
- Subheading: "FREE $${amount} Marco's Pizza Gift Card"
- Below: "${companyName} wants to treat your family"
- Tagline: "One call = Pizza party on us!"

BOTTOM SECTION:
- Large phone "${phone}" in white/gold banner
- QR code on white background
- Ticket box: "YOUR CODE: {{unique_code}}"
- Urgency: "Call today - Feed the family tonight!"

CRITICAL REQUIREMENTS:
- Gift card DOMINANT with dramatic lighting
- Cheese pull is EPIC and appetizing
- Family celebration energy
- Prize-winner atmosphere
- ${isLandscape ? 'LANDSCAPE orientation' : 'PORTRAIT orientation'}

STYLE: Family celebration, Pizza Night Hero energy, Italian warmth, comfort food joy, makes the gift card feel like winning dinner for the family.`;
  },

  'dominos': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 15;
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

Gift card with dramatic lighting, hot Domino's pizza with cheese pull, delivery energy, celebration vibes.
$${amount} card is the hero. Red and blue Domino's colors. Fast, reliable, family pizza night.
${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'} orientation.`;
  },

  'subway': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 10;
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

Subway gift card ($${amount}) with golden glow, fresh sub sandwich with vegetables, healthy energy.
Green and yellow Subway colors. Eat Fresh vibes. ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}.`;
  },

  'chilis': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 25;
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

Chili's gift card ($${amount}) with prize lighting, sizzling fajitas or ribs, casual dining fun.
Red Chili's branding. Baby Back Ribs energy. ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}.`;
  },

  'panera': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 15;
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

Panera gift card ($${amount}) with warm glow, artisan bread and fresh soup, bakery-cafe warmth.
Green/brown Panera colors. Fresh, wholesome vibes. ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}.`;
  },

  'chipotle': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 15;
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

Chipotle gift card ($${amount}) with celebration energy, burrito bowl with fresh ingredients.
Burgundy Chipotle colors. Food with Integrity. ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}.`;
  },

  'generic-food': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 15;
    const companyName = context.company.name;
    const phone = context.company.phone || '1-800-XXX-XXXX';
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

THE HERO - GIFT CARD:
- Generic premium gift card floating at angle showing "$${amount}"
- DRAMATIC golden glow and light rays
- Metallic gold/silver appearance - looks VALUABLE
- Sparkles and celebration energy
- Golden ticket / lottery win feeling

FOOD IMAGERY:
- Appetizing generic food in background
- Premium food photography quality
- Makes viewer hungry
- Fresh, delicious, irresistible

BACKGROUND:
- Rich gold gradient (#D4AF37 to #8B7500)
- Premium, luxurious atmosphere
- Celebration and prize-winner energy

TEXT & CTA:
- "{{first_name}}, CLAIM YOUR FREE GIFT!" 
- "$${amount} Gift Card - Yours FREE"
- Phone: "${phone}"
- Code: "{{unique_code}}"

${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'} orientation. Prize-winner energy throughout.`;
  },

  'generic-retail': (context, config) => {
    const isLandscape = config.orientation === 'landscape';
    const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
    const amount = context.giftCard?.amount || 15;
    
    return `Create a premium direct mail postcard FRONT design, ${dimensions} orientation.

Premium retail gift card ($${amount}) with sophisticated blue gradient, shopping luxury vibes.
Prize presentation with dramatic lighting. ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}.`;
  },

  'unknown': (context, config) => {
    return FRONT_PROMPTS['generic-food'](context, config);
  },
};

/**
 * Get front design prompt for current context
 */
export function getFrontDesignPrompt(
  context: DesignerContext,
  config: CanvasConfig
): string {
  const brandKey = context.giftCard?.brandKey || 'generic-food';
  const promptFn = FRONT_PROMPTS[brandKey] || FRONT_PROMPTS['generic-food'];
  
  return promptFn(context, config);
}
