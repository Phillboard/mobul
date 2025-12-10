/**
 * AI Design Prompts
 * 
 * Prompt templates for AI-powered design generation.
 * Used with OpenAI GPT-4o to parse user requests into design actions.
 * Supports DALL-E 3 for image generation.
 * 
 * CRITICAL: AI generates ONLY backgrounds and static design elements.
 * All personalized data (names, addresses, codes) must use template tokens.
 */

import type { CanvasState, DesignerType } from '../types/designer';

/**
 * CRITICAL RULES - Never violated by AI
 * 
 * These rules ensure AI never generates personalized content in images.
 * Personalization must ALWAYS use template tokens filled by mail house.
 */
const CRITICAL_RULES = `
════════════════════════════════════════════════════════════════
⚠️  CRITICAL RULES - NEVER VIOLATE ⚠️
════════════════════════════════════════════════════════════════

1. AI GENERATES ONLY:
   ✅ Background images (lifestyle, products, abstract, scenery)
   ✅ Static design elements (decorative shapes, borders)
   ✅ Color schemes and layout suggestions
   ✅ Placeholder positions for personalized content

2. AI NEVER GENERATES:
   ❌ Names (first, last, or full names)
   ❌ Addresses (street, city, state, zip)
   ❌ Phone numbers
   ❌ QR codes with actual data
   ❌ Unique codes or tracking numbers
   ❌ Any text that should be personalized

3. FOR PERSONALIZATION, ALWAYS USE TEMPLATE TOKENS:
   When user asks for personalization, add TEMPLATE TOKEN ELEMENTS:
   - {{first_name}} - Recipient's first name
   - {{last_name}} - Recipient's last name
   - {{full_name}} - Recipient's full name
   - {{unique_code}} - Unique tracking code
   - {{company_name}} - Client's company name
   - {{purl}} - Personal URL
   - {{qr_code}} - QR code placeholder
   - {{gift_card_amount}} - Gift card value

4. CORRECT VS WRONG:
   User: "Add the customer's name"
   ✅ CORRECT: Add text element with content "{{first_name}}"
   ❌ WRONG: Generate text saying "John"

   User: "Generate a background with happy family"
   ✅ CORRECT: Generate lifestyle image via generate-background action
   ❌ WRONG: Generate image containing any text

   User: "Add a QR code"
   ✅ CORRECT: Add qr-code element with data "{{purl}}"
   ❌ WRONG: Generate image of a QR code

════════════════════════════════════════════════════════════════
`;

/**
 * System prompt for the design assistant
 */
export function getSystemPrompt(designerType: DesignerType): string {
  const typeContext = {
    mail: 'direct mail piece (postcard or letter) for print',
    'landing-page': 'landing page for web display',
    email: 'email template for email campaigns',
  };

  return `${CRITICAL_RULES}

You are an expert design assistant helping users create ${typeContext[designerType]} designs.

Your role is to understand natural language design requests and convert them into specific design actions.

Available actions you can perform:
- add-element: Add text, images, shapes, QR codes, or template tokens
- update-element: Modify existing elements (color, size, position, content)
- delete-element: Remove elements
- move-element: Reposition elements
- resize-element: Change element dimensions
- set-background: Set background image URL or color
- generate-background: Generate AI background image (NO TEXT in generated images!)
- clear-canvas: Clear all elements

generate-background action format:
{
  "type": "generate-background",
  "prompt": "Professional lifestyle photo, bright sunny day",
  "size": "1792x1024",
  "style": "natural"
}

Available sizes for generate-background:
- "1024x1024" - Square
- "1024x1792" - Portrait (vertical postcards)
- "1792x1024" - Landscape (horizontal postcards)

Available template tokens (for personalization):
- {{first_name}} - Recipient's first name
- {{last_name}} - Recipient's last name
- {{full_name}} - Recipient's full name
- {{unique_code}} - Unique tracking code
- {{company_name}} - Client's company name
- {{purl}} - Personal URL
- {{qr_code}} - QR code
- {{gift_card_amount}} - Gift card value

Design best practices:
- Keep text readable (minimum 12pt font)
- Use high contrast between text and background
- Follow visual hierarchy principles
- Leave adequate white space
- For mail: Ensure critical info is visible (not too close to edges)
- For landing pages: Mobile-responsive layouts
- For emails: Email-safe HTML, inline styles

When responding to user requests:
1. Acknowledge what they want to do
2. Provide the design actions as JSON
3. Explain why you made those choices
4. Offer additional suggestions if helpful

IMPORTANT: When user asks for personalized content (names, addresses, codes), 
ALWAYS use template tokens, NEVER generate actual data.

Response format:
{
  "actions": [
    {
      "type": "add-element",
      "element": {
        "type": "text",
        "content": "Your headline here",
        "x": 100,
        "y": 50,
        "width": 600,
        "height": 60,
        "styles": {
          "fontSize": 32,
          "fontWeight": "bold",
          "color": "#000000"
        }
      }
    }
  ],
  "explanation": "I've added a bold headline at the top of your design."
}`;
}

/**
 * Generate a prompt for understanding user design request
 */
export function createDesignRequestPrompt(
  userRequest: string,
  currentState: CanvasState,
  designerType: DesignerType
): string {
  const elementSummary = currentState.elements.map(el => ({
    id: el.id,
    type: el.type,
    content: 'content' in el ? el.content : undefined,
    position: { x: el.x, y: el.y },
    size: { width: el.width, height: el.height },
  }));

  return `Current canvas state:
- Canvas size: ${currentState.width}x${currentState.height}px
- Background: ${currentState.backgroundImage ? 'Image set' : currentState.backgroundColor}
- Elements: ${currentState.elements.length} element(s)

${elementSummary.length > 0 ? `Existing elements:
${JSON.stringify(elementSummary, null, 2)}` : 'Canvas is empty.'}

User request: "${userRequest}"

Please provide design actions to fulfill this request. Consider the current state and make intelligent positioning choices to avoid overlapping existing elements.`;
}

/**
 * Example prompts to guide users
 */
export const EXAMPLE_PROMPTS = {
  mail: [
    'Add a headline that says "You\'re Invited!" at the top',
    'Add a QR code in the bottom right corner',
    'Insert the customer\'s first name in a greeting',
    'Add the company logo in the top left',
    'Make the headline blue and larger',
    'Add a call-to-action button saying "Claim Your Offer"',
  ],
  'landing-page': [
    'Create a hero section with headline and subheading',
    'Add a contact form with name, email, and phone fields',
    'Insert the company name in the header',
    'Add a pricing section with three columns',
    'Create a testimonial section',
    'Add a footer with social media links',
  ],
  email: [
    'Create an email header with company logo',
    'Add a greeting with the customer\'s name',
    'Add a button linking to claim a $25 gift card',
    'Insert the gift card amount in the message',
    'Add a footer with unsubscribe link',
    'Create a promotional banner at the top',
  ],
};

/**
 * Prompt for layout suggestions
 */
export function createLayoutSuggestionPrompt(
  designerType: DesignerType,
  canvasSize: { width: number; height: number }
): string {
  return `I need layout suggestions for a ${designerType} design.

Canvas size: ${canvasSize.width}x${canvasSize.height}px

Please suggest 3 different layout structures with element placements. Consider:
- Visual hierarchy
- White space
- Readability
- Common design patterns for ${designerType}

For each layout, describe:
1. Overall structure (header, body, footer, columns, etc.)
2. Element placement and sizing
3. What this layout is best suited for

Respond with structured JSON.`;
}

/**
 * Prompt for improving existing design
 */
export function createDesignCritiquePrompt(
  currentState: CanvasState,
  designerType: DesignerType
): string {
  return `Please critique this ${designerType} design and suggest improvements.

Current design:
- Canvas: ${currentState.width}x${currentState.height}px
- Elements: ${currentState.elements.length}
- Background: ${currentState.backgroundImage ? 'Has image' : currentState.backgroundColor}

Element details:
${JSON.stringify(currentState.elements.map(el => ({
  type: el.type,
  position: { x: el.x, y: el.y },
  size: { width: el.width, height: el.height },
  content: 'content' in el ? el.content : undefined,
})), null, 2)}

Evaluate:
1. Visual hierarchy - Is there a clear focal point?
2. White space - Is there enough breathing room?
3. Alignment - Are elements properly aligned?
4. Color contrast - Is text readable?
5. Overall composition - Does it look professional?

Provide specific, actionable suggestions for improvement.`;
}

/**
 * Prompt for token insertion help
 */
export function createTokenInsertionPrompt(
  userRequest: string,
  availableTokens: string[]
): string {
  return `The user wants to add personalization to their design: "${userRequest}"

Available template tokens:
${availableTokens.map(token => `- ${token}`).join('\n')}

Which token(s) should be used and where should they be placed? Provide design actions to add template token elements.`;
}

/**
 * Prompt for responsive design
 */
export function createResponsiveDesignPrompt(
  currentState: CanvasState,
  breakpoints: Array<{ name: string; width: number; height: number }>
): string {
  return `Convert this design to be responsive across different screen sizes.

Current design (desktop):
- Size: ${currentState.width}x${currentState.height}px
- Elements: ${currentState.elements.length}

Target breakpoints:
${breakpoints.map(bp => `- ${bp.name}: ${bp.width}x${bp.height}px`).join('\n')}

For each breakpoint, suggest:
1. How elements should resize or reflow
2. Which elements might stack vertically
3. Font size adjustments
4. Any elements that should hide on smaller screens

Provide responsive design rules.`;
}

/**
 * Prompt for color scheme suggestions
 */
export function createColorSchemePrompt(
  brandColors?: { primary?: string; secondary?: string }
): string {
  const brandContext = brandColors?.primary
    ? `\nBrand colors to incorporate:\n- Primary: ${brandColors.primary}\n- Secondary: ${brandColors.secondary || 'Not specified'}`
    : '';

  return `Suggest 5 professional color schemes for this design.${brandContext}

For each scheme, provide:
1. Name (e.g., "Professional Blue", "Warm Autumn")
2. Primary color (hex)
3. Secondary color (hex)
4. Accent color (hex)
5. Background color (hex)
6. Text color (hex)
7. When to use this scheme

Ensure good contrast ratios for accessibility (WCAG AA compliant).`;
}

/**
 * Prompt for accessibility check
 */
export function createAccessibilityCheckPrompt(
  currentState: CanvasState
): string {
  return `Check this design for accessibility issues.

Design elements:
${JSON.stringify(currentState.elements.map(el => ({
  type: el.type,
  content: 'content' in el ? el.content : undefined,
  styles: el.styles,
})), null, 2)}

Check for:
1. Color contrast ratios (text vs background)
2. Font sizes (minimum 12pt for body text)
3. Alt text for images
4. Logical reading order
5. Interactive element sizes (minimum 44x44px for touch)

Provide specific issues found and how to fix them.`;
}

/**
 * Parse AI response into design actions
 * Handles both structured JSON and natural language responses
 */
export function parseAIResponse(response: string): {
  actions: any[];
  explanation: string;
} {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response);
    return {
      actions: parsed.actions || [],
      explanation: parsed.explanation || 'Applied AI suggestions',
    };
  } catch {
    // If not valid JSON, try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          actions: parsed.actions || [],
          explanation: parsed.explanation || response,
        };
      } catch {
        // Fall through to default
      }
    }

    // Return empty actions with the response as explanation
    return {
      actions: [],
      explanation: response,
    };
  }
}

/**
 * Validate design actions before applying
 */
export function validateDesignActions(actions: any[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  actions.forEach((action, index) => {
    if (!action.type) {
      errors.push(`Action ${index}: Missing 'type' field`);
      return;
    }

    const validTypes = [
      'add-element',
      'update-element',
      'delete-element',
      'move-element',
      'resize-element',
      'set-background',
      'generate-background',  // NEW: AI background generation
      'clear-canvas',
    ];

    if (!validTypes.includes(action.type)) {
      errors.push(`Action ${index}: Invalid type '${action.type}'`);
    }

    // Validate specific action requirements
    if (action.type === 'add-element' && !action.element) {
      errors.push(`Action ${index}: 'add-element' requires 'element' field`);
    }

    if (action.type === 'update-element' && !action.id) {
      errors.push(`Action ${index}: 'update-element' requires 'id' field`);
    }

    if (action.type === 'delete-element' && !action.id) {
      errors.push(`Action ${index}: 'delete-element' requires 'id' field`);
    }

    // Validate generate-background action
    if (action.type === 'generate-background') {
      if (!action.prompt) {
        errors.push(`Action ${index}: 'generate-background' requires 'prompt' field`);
      }
      const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
      if (action.size && !validSizes.includes(action.size)) {
        errors.push(`Action ${index}: Invalid size '${action.size}'. Valid: ${validSizes.join(', ')}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

