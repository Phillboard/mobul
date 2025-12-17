/**
 * Prompt Builder Utilities for Nano Banana Pro
 * 
 * Builds structured prompts for generating design backgrounds.
 * Prompts are crafted to:
 * 1. Include gift cards with brand and amount
 * 2. Include appropriate food/lifestyle imagery
 * 3. Render static headlines
 * 4. Leave space for personalization layers (phone, QR, unique codes)
 * 5. Explicitly exclude placeholders and dynamic content
 */

// ============================================================================
// Types
// ============================================================================

export interface PromptContext {
  giftCard: {
    brand: string;      // "Jimmy John's"
    amount: number;     // 15
    foodType?: string;  // "sandwich", "pizza", "coffee", etc.
  } | null;
  company: {
    name: string;
    industry: string;
  };
  brandStyle: {
    primaryColor: string;
    secondaryColor: string;
    imagery: string;    // Description of appropriate imagery
  } | null;
}

export interface PromptConfig {
  type: 'front' | 'back' | 'background-only';
  orientation: 'landscape' | 'portrait';
  size: string; // '6x4', '6x9', etc.
}

// ============================================================================
// Food Imagery Descriptions
// ============================================================================

/**
 * Get food imagery description based on food type
 */
function getFoodImageryDescription(foodType?: string): string {
  const descriptions: Record<string, string> = {
    'sandwich': `- Below the gift card: A perfect fresh sub sandwich
- French bread with sesame seeds catching the light
- Visible layers: crisp lettuce, red tomatoes, premium deli meats
- Slight steam or freshness effect
- Premium food photography lighting`,
    
    'pizza': `- Below the gift card: Delicious pizza with epic cheese pull
- Pepperoni glistening with oil, steam rising
- Golden-brown crust with perfect char
- Herbs and toppings in sharp detail
- Dramatic Italian food photography`,
    
    'burger': `- Below the gift card: Gourmet burger with perfect layers
- Sesame seed bun toasted golden
- Fresh lettuce, tomato, melted cheese
- Juicy patty with perfect grill marks
- Professional burger photography style`,
    
    'coffee': `- Beside the gift card: Beautiful artisan coffee drink
- Latte art or layered frappuccino
- Condensation droplets on iced drinks
- Warm steam for hot drinks
- Cozy cafe atmosphere with bokeh lights in background`,
    
    'steak': `- Below the gift card: Premium steak perfectly cooked
- Beautiful sear marks and caramelization
- Slight pink center visible on cut
- Garnished with herbs
- Upscale steakhouse photography`,
    
    'sushi': `- Below the gift card: Artful sushi arrangement
- Fresh fish glistening
- Colorful rolls with precision cuts
- Garnished with ginger and wasabi
- Japanese restaurant aesthetic`,
    
    'tacos': `- Below the gift card: Vibrant fresh tacos
- Colorful ingredients visible
- Fresh cilantro and lime
- Warm tortillas
- Mexican restaurant style photography`,
    
    'dessert': `- Below the gift card: Decadent dessert
- Rich chocolate or creamy layers
- Artistic plating
- Garnished beautifully
- Upscale bakery photography`,
    
    'default': `- Below the gift card: Appetizing food imagery
- Premium photography quality
- Warm, inviting lighting
- Professional culinary presentation`,
  };
  
  return descriptions[foodType || 'default'] || descriptions['default'];
}

// ============================================================================
// Brand Color Helpers
// ============================================================================

/**
 * Get brand colors from well-known brands
 */
export function getBrandColors(brandName: string): { primary: string; secondary: string } | null {
  const brandColors: Record<string, { primary: string; secondary: string }> = {
    "jimmy john's": { primary: '#CC0000', secondary: '#FFD700' },
    "subway": { primary: '#008C15', secondary: '#FFC600' },
    "starbucks": { primary: '#00704A', secondary: '#FFFFFF' },
    "dunkin'": { primary: '#FF6600', secondary: '#DA1884' },
    "chipotle": { primary: '#A81612', secondary: '#EBE7E1' },
    "panera": { primary: '#6E933D', secondary: '#F4EAD5' },
    "chick-fil-a": { primary: '#E51636', secondary: '#FFFFFF' },
    "taco bell": { primary: '#702082', secondary: '#FFBC0D' },
    "olive garden": { primary: '#7A942E', secondary: '#FFFFFF' },
    "red lobster": { primary: '#CC0000', secondary: '#FFFFFF' },
  };
  
  const key = brandName.toLowerCase();
  return brandColors[key] || null;
}

// ============================================================================
// Prompt Builders
// ============================================================================

/**
 * Build prompt for front side of mail piece
 */
export function buildFrontPrompt(context: PromptContext, config: PromptConfig): string {
  const aspectRatio = config.orientation === 'landscape' ? '3:2 horizontal' : '2:3 vertical';
  const gc = context.giftCard;
  const style = context.brandStyle;
  
  // Get brand colors or use defaults
  const brandColors = gc?.brand ? getBrandColors(gc.brand) : null;
  const primaryColor = brandColors?.primary || style?.primaryColor || '#CC0000';
  const secondaryColor = brandColors?.secondary || style?.secondaryColor || '#FFD700';
  
  // Build food imagery description based on brand
  const foodImagery = getFoodImageryDescription(gc?.foodType);
  
  const brand = gc?.brand || 'Gift Card';
  const amount = gc?.amount || 15;
  
  return `Create a premium direct mail postcard design, ${aspectRatio} aspect ratio.

TOP SECTION (upper 40%):
- A premium gift card floating at a 15-degree angle
- Card prominently displays: "$${amount}" in large bold text
- Card shows brand name: "${brand}" in clear text
- Card has a glossy, premium appearance with ${secondaryColor} accents
- DRAMATIC golden glow emanating from behind the card
- Sparkle particles and light rays creating prize-reveal energy
- The gift card is the HERO element - make it pop

MIDDLE SECTION (40%):
${foodImagery}

HEADLINE TEXT (render this text CLEARLY and LEGIBLY):
- Large bold text: "YOUR FREE LUNCH IS WAITING"
- Position: Below the food imagery, above center
- White text with subtle drop shadow for perfect readability
- Font should be bold, modern, attention-grabbing
- This text must be CRYSTAL CLEAR and easy to read

BACKGROUND:
- Rich gradient from ${primaryColor} to darker shade
- Warm, celebratory atmosphere with prize-winner energy
- Professional advertising quality
- High-end food marketing aesthetic

BOTTOM 20%:
- Keep clean and simple - gradient continuation
- Solid background without text or graphics
- This area reserved for phone number, QR code, and tracking code overlays

Style: Premium food advertising photography, prize-winner excitement, direct mail that demands attention and drives action.

CRITICAL REQUIREMENTS - DO NOT INCLUDE:
- Any phone numbers
- Any QR codes  
- Any email addresses
- Any text like {{first_name}}, {{last_name}}, or placeholder variables
- Any "Call Now" or similar CTA text
- Any personalization fields
The bottom area MUST be clean for text overlays.`;
}

/**
 * Build prompt for back side of mail piece
 */
export function buildBackPrompt(context: PromptContext, config: PromptConfig): string {
  const style = context.brandStyle;
  const gc = context.giftCard;
  
  const brandColors = gc?.brand ? getBrandColors(gc.brand) : null;
  const primaryColor = brandColors?.primary || style?.primaryColor || '#CC0000';
  
  const amount = gc?.amount || 15;
  
  return `Create a direct mail postcard BACK design, standard USPS mailing format.

This is a TEMPLATE design with clean areas for text overlays.

LEFT HALF (55% of width):
- Clean white background
- Thin accent stripe at top in ${primaryColor}
- Small gift card graphic in upper left corner with "$${amount}" badge
- Gift card graphic should be small (about 1 inch square)
- REST OF THIS AREA SHOULD BE EMPTY AND CLEAN
- Text content (offer details, terms) will be overlaid separately

RIGHT HALF (45% of width):
- Clean white background
- Small box outline in upper right for postal indicia
- Tiny text "PRESORTED STANDARD" in the postal box
- CENTER AREA: completely empty for address block
- BOTTOM AREA: empty horizontal space for postal barcode
- Professional mailing format

DESIGN ELEMENTS:
- Subtle vertical line or whitespace separating the two halves
- Professional, trustworthy direct mail appearance
- Clean, minimal template structure
- Modern business aesthetic

COLOR SCHEME:
- Primarily white background
- ${primaryColor} accent stripe and borders
- Professional and clean

DO NOT INCLUDE:
- Any recipient names or addresses
- Any phone numbers
- Any message body text
- Any promotional copy
- Any personalization fields
Just the structural design elements - this is a template.`;
}

/**
 * Build prompt for background-only (no text)
 */
export function buildBackgroundPrompt(context: PromptContext, config: PromptConfig): string {
  const aspectRatio = config.orientation === 'landscape' ? '3:2 horizontal' : '2:3 vertical';
  const gc = context.giftCard;
  const style = context.brandStyle;
  
  const brandColors = gc?.brand ? getBrandColors(gc.brand) : null;
  const primaryColor = brandColors?.primary || style?.primaryColor || '#CC0000';
  const secondaryColor = brandColors?.secondary || style?.secondaryColor || '#FFD700';
  
  const foodImagery = getFoodImageryDescription(gc?.foodType);
  const brand = gc?.brand || 'Gift Card';
  const amount = gc?.amount || 15;
  
  return `Create a premium background image for direct mail, ${aspectRatio} aspect ratio.

COMPOSITION:
- Premium ${brand} gift card floating in upper portion at slight angle
- Card shows "$${amount}" prominently
- Dramatic golden glow behind the gift card
- ${foodImagery}
- Rich gradient background from ${primaryColor} to darker shade
- Professional food advertising photography style

ATMOSPHERE:
- Prize-winner energy and excitement
- Warm, appetizing lighting
- High-end marketing quality
- Celebration and reward feeling

IMPORTANT:
- NO text or headlines
- NO phone numbers
- NO QR codes
- NO personalization placeholders
- Just the visual elements - pure background imagery
All text will be added as separate layers.`;
}

/**
 * Main prompt builder - dispatches to appropriate builder
 */
export function buildDesignPrompt(context: PromptContext, config: PromptConfig): string {
  switch (config.type) {
    case 'front':
      return buildFrontPrompt(context, config);
    case 'back':
      return buildBackPrompt(context, config);
    case 'background-only':
      return buildBackgroundPrompt(context, config);
    default:
      throw new Error(`Unknown prompt type: ${config.type}`);
  }
}

// ============================================================================
// Preset Contexts
// ============================================================================

/**
 * Create a sample context for testing/preview
 */
export function createSampleContext(): PromptContext {
  return {
    giftCard: {
      brand: "Jimmy John's",
      amount: 15,
      foodType: 'sandwich',
    },
    company: {
      name: 'Acme Marketing',
      industry: 'automotive',
    },
    brandStyle: {
      primaryColor: '#CC0000',
      secondaryColor: '#FFD700',
      imagery: 'Fresh sandwiches and premium ingredients',
    },
  };
}

/**
 * Create context from campaign data
 */
export function contextFromCampaign(campaignData: {
  giftCardBrand?: string;
  giftCardAmount?: number;
  clientName?: string;
  industry?: string;
}): PromptContext {
  // Infer food type from brand name
  const brand = campaignData.giftCardBrand || '';
  let foodType: string | undefined;
  
  const brandLower = brand.toLowerCase();
  if (brandLower.includes('sandwich') || brandLower.includes('sub') || brandLower.includes('jimmy')) {
    foodType = 'sandwich';
  } else if (brandLower.includes('pizza')) {
    foodType = 'pizza';
  } else if (brandLower.includes('coffee') || brandLower.includes('starbucks') || brandLower.includes('dunkin')) {
    foodType = 'coffee';
  } else if (brandLower.includes('burger') || brandLower.includes('grill')) {
    foodType = 'burger';
  } else if (brandLower.includes('taco') || brandLower.includes('burrito')) {
    foodType = 'tacos';
  } else if (brandLower.includes('steak') || brandLower.includes('lobster')) {
    foodType = 'steak';
  }
  
  return {
    giftCard: campaignData.giftCardBrand ? {
      brand: campaignData.giftCardBrand,
      amount: campaignData.giftCardAmount || 15,
      foodType,
    } : null,
    company: {
      name: campaignData.clientName || 'Client',
      industry: campaignData.industry || 'general',
    },
    brandStyle: null, // Will use brand colors from getBrandColors
  };
}

