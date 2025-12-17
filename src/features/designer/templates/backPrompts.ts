/**
 * Back Design Prompt Templates
 * Prompts for back-of-postcard with proper mailing format
 */

import type { DesignerContext } from '../types/context';
import type { CanvasConfig } from '../types/canvas';
import type { GiftCardBrand } from '../types/context';

type BackPromptFunction = (context: DesignerContext, config: CanvasConfig) => string;

function createBackPrompt(
  context: DesignerContext,
  config: CanvasConfig,
  options: {
    headerStyle: 'formal' | 'casual';
    accentColor: string;
    messageContent: string;
  }
): string {
  const isLandscape = config.orientation === 'landscape';
  const dimensions = isLandscape ? '6x4 inches LANDSCAPE' : '4x6 inches PORTRAIT';
  const amount = context.giftCard?.amount || 15;
  const brand = context.giftCard?.brand || 'gift card';
  const companyName = context.company.name;
  const phone = context.company.phone || '1-800-XXX-XXXX';
  
  return `Create a direct mail postcard BACK design, ${dimensions} orientation, standard mailing format.

CRITICAL LAYOUT REQUIREMENTS:
This is a MAILING PIECE with strict postal requirements.

${isLandscape ? 'LANDSCAPE LAYOUT:' : 'PORTRAIT LAYOUT:'}

LEFT SIDE (Message Area - approximately 55% width):
────────────────────────────────────────────────

HEADER AREA:
- Small ${brand} card thumbnail image
- "$${amount} VALUE" badge next to card
- ${options.headerStyle === 'casual' 
    ? `"Hey {{first_name}}! 👋" in friendly font`
    : `"Dear {{first_name}}," in professional font`}

MESSAGE BODY:
${options.messageContent}

BOTTOM OF LEFT SIDE:
- Code box with styling: "YOUR CODE: {{unique_code}}"
- Urgency element: "CALL WITHIN 7 DAYS" circular badge
- Phone number: "Call: ${phone}"
- Expiration: "EXPIRES: {{expiration_date}}"

RIGHT SIDE (Mailing Area - approximately 45% width):
────────────────────────────────────────────────

TOP RIGHT CORNER (Postal Indicia):
┌─────────────────┐
│ PRESORTED       │
│ STANDARD        │
│ U.S. POSTAGE    │
│ PAID            │
│ PERMIT NO. XXXX │
└─────────────────┘

TOP LEFT OF MAILING SECTION (Return Address):
${companyName}
{{return_address}}
{{return_city}}, {{return_state}} {{return_zip}}

CENTER (Recipient Address):
{{FULL_NAME}}
{{ADDRESS_LINE_1}}
{{CITY}}, {{STATE}} {{ZIP}}

BELOW ADDRESS:
||||||||||||||||||||||||||||||||
(Intelligent Mail Barcode placeholder)

BOTTOM RIGHT:
or current resident

DESIGN SPECIFICATIONS:
- Clear visual separation between left and right sides (subtle line or color change)
- Left side has ${options.accentColor} accent border or tint
- Right side is clean white/cream for postal readability
- All addresses in ALL CAPS for postal scanning
- IMB barcode area clear and unobstructed
- Overall: Legitimate, trustworthy direct mail appearance

TYPOGRAPHY:
- Greeting: Friendly or professional based on brand
- Body: Clean, readable sans-serif
- Code box: Bold, ticket-stub styling with border
- Address: Standard postal font (all caps)

CRITICAL POSTAL REQUIREMENTS:
- Postal indicia MUST be in top right corner
- Address block in postal-compliant position (right side, centered vertically)
- IMB barcode area (4.5" from left edge, 0.625" from bottom)
- Return address in top left of mailing area
- "or current resident" for deliverability

STYLE: Professional direct mail, legitimate and trustworthy, easy to read, clear call-to-action, proper postal compliance.`;
}

export const BACK_PROMPTS: Record<GiftCardBrand, BackPromptFunction> = {
  'jimmy-johns': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'formal',
    accentColor: "Jimmy John's red (#CC0000)",
    messageContent: `
Your vehicle's warranty protection is important — almost as important as a fresh, Freaky Fast sub delivered to your door!

Call us in the next 7 days and we'll send your FREE $${context.giftCard?.amount || 15} Jimmy John's Gift Card as a thank you for your time.

This offer is exclusively for residents of {{address_line_1}}. Don't let your neighbor claim YOUR free lunch!

Sincerely,
The ${context.company.name} Team

• FREE $${context.giftCard?.amount || 15} Jimmy John's Gift Card
• 5-minute call, that's it
• Card ships same day you call
    `
  }),

  'starbucks': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'casual',
    accentColor: 'Starbucks green (#00704A)',
    messageContent: `
Real talk: Nobody LOVES getting calls about warranties. We get it.

So here's the deal — give us literally 5 minutes to chat about keeping your ride protected, and we'll give you a $${context.giftCard?.amount || 10} Starbucks card.

That's a Venti Whatever-You-Want on us.

Your neighbors at {{address_line_1}} didn't get this offer. You did.

Use it. Enjoy it. You earned it just by being you (and also calling us).

⏰ Offer expires in 10 days. Don't ghost us!
    `
  }),

  'marcos': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'casual',
    accentColor: "Marco's red (#D4001C)",
    messageContent: `
Here's the situation, {{first_name}}:

YOUR VEHICLE: Needs protection
YOUR FAMILY: Needs pizza
OUR SOLUTION: Yes.

✓ Call us about your auto warranty
✓ Chat for 5 easy minutes
✓ We ship you a $${context.giftCard?.amount || 15} pizza gift card
✓ You become the Pizza Night Hero

That's 2 large pizzas. Or 1 pizza with ALL the toppings. Or a pizza AND wings. You're the boss.

Your kids will think you're a legend. Your spouse will appreciate you. Your stomach will thank you.

You're welcome in advance.
    `
  }),

  'dominos': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'casual',
    accentColor: "Domino's blue (#006491)",
    messageContent: `Quick call = Hot pizza delivered to your door. Free. On us. $${context.giftCard?.amount || 15} Domino's card. Easy choice.`
  }),

  'subway': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'formal',
    accentColor: 'Subway green (#00923F)',
    messageContent: `Free $${context.giftCard?.amount || 10} Subway gift card when you call. Eat Fresh on us.`
  }),

  'chilis': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'casual',
    accentColor: "Chili's red (#CE1126)",
    messageContent: `Call now. Get free $${context.giftCard?.amount || 25} Chili's gift card. Baby Back Ribs are calling your name.`
  }),

  'panera': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'formal',
    accentColor: 'Panera green (#5C8727)',
    messageContent: `Thank you for being valued at {{address_line_1}}. Call for your free $${context.giftCard?.amount || 15} Panera card.`
  }),

  'chipotle': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'casual',
    accentColor: 'Chipotle burgundy (#A6192E)',
    messageContent: `Your burrito bowl awaits. Call for free $${context.giftCard?.amount || 15} Chipotle gift card.`
  }),

  'generic-food': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'formal',
    accentColor: 'Gold (#D4AF37)',
    messageContent: `Call within 7 days to claim your FREE $${context.giftCard?.amount || 15} gift card. No purchase necessary.`
  }),

  'generic-retail': (context, config) => createBackPrompt(context, config, {
    headerStyle: 'formal',
    accentColor: 'Blue (#4A90D9)',
    messageContent: `Claim your complimentary $${context.giftCard?.amount || 15} gift card. Call today.`
  }),

  'unknown': (context, config) => {
    return BACK_PROMPTS['generic-food'](context, config);
  },
};

/**
 * Get back design prompt for current context
 */
export function getBackDesignPrompt(
  context: DesignerContext,
  config: CanvasConfig
): string {
  const brandKey = context.giftCard?.brandKey || 'generic-food';
  const promptFn = BACK_PROMPTS[brandKey] || BACK_PROMPTS['generic-food'];
  
  return promptFn(context, config);
}
