/**
 * Token Management System
 * 
 * Comprehensive system for managing template tokens.
 * Defines all available tokens, categories, validation, and utilities.
 */

// ============================================================================
// Types
// ============================================================================

export type TokenCategory = 'personalization' | 'tracking' | 'address' | 'campaign';

export interface TokenDefinition {
  token: string;           // "{{first_name}}"
  name: string;            // "First Name"
  description: string;     // "Recipient's first name"
  category: TokenCategory;
  previewValue: string;    // "John"
  required: boolean;
  format?: string;         // Optional formatting hint
}

// ============================================================================
// Token Definitions
// ============================================================================

/**
 * All available template tokens
 */
export const TOKEN_DEFINITIONS: TokenDefinition[] = [
  // Personalization tokens
  {
    token: '{{first_name}}',
    name: 'First Name',
    description: "Recipient's first name",
    category: 'personalization',
    previewValue: 'John',
    required: true,
  },
  {
    token: '{{last_name}}',
    name: 'Last Name',
    description: "Recipient's last name",
    category: 'personalization',
    previewValue: 'Smith',
    required: false,
  },
  {
    token: '{{full_name}}',
    name: 'Full Name',
    description: "Recipient's full name",
    category: 'personalization',
    previewValue: 'John Smith',
    required: false,
  },
  
  // Tracking tokens
  {
    token: '{{unique_code}}',
    name: 'Unique Code',
    description: 'Unique tracking code for this mail piece',
    category: 'tracking',
    previewValue: 'PIZZA-KING-42',
    required: true,
  },
  {
    token: '{{purl}}',
    name: 'Personal URL',
    description: 'Personalized URL for tracking',
    category: 'tracking',
    previewValue: 'acme.com/claim/ABC123',
    required: false,
  },
  
  // Address tokens
  {
    token: '{{address_line_1}}',
    name: 'Street Address',
    description: "Recipient's street address",
    category: 'address',
    previewValue: '123 Main Street',
    required: true,
  },
  {
    token: '{{address_line_2}}',
    name: 'Address Line 2',
    description: 'Apartment, suite, etc.',
    category: 'address',
    previewValue: 'Apt 4B',
    required: false,
  },
  {
    token: '{{city}}',
    name: 'City',
    description: "Recipient's city",
    category: 'address',
    previewValue: 'Anytown',
    required: true,
  },
  {
    token: '{{state}}',
    name: 'State',
    description: "Recipient's state",
    category: 'address',
    previewValue: 'TX',
    required: true,
  },
  {
    token: '{{zip}}',
    name: 'ZIP Code',
    description: "Recipient's ZIP code",
    category: 'address',
    previewValue: '75001',
    required: true,
  },
  
  // Campaign tokens
  {
    token: '{{company_name}}',
    name: 'Company Name',
    description: "Your company's name",
    category: 'campaign',
    previewValue: 'Acme Marketing',
    required: false,
  },
  {
    token: '{{gift_card_amount}}',
    name: 'Gift Card Amount',
    description: 'Gift card value',
    category: 'campaign',
    previewValue: '$15',
    required: false,
  },
  {
    token: '{{expiration_date}}',
    name: 'Expiration Date',
    description: 'Offer expiration date',
    category: 'campaign',
    previewValue: 'December 31, 2025',
    required: false,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all tokens
 */
export function getAllTokens(): TokenDefinition[] {
  return TOKEN_DEFINITIONS;
}

/**
 * Get tokens by category
 */
export function getTokensByCategory(category: TokenCategory): TokenDefinition[] {
  return TOKEN_DEFINITIONS.filter(t => t.category === category);
}

/**
 * Get token definition by token string
 */
export function getTokenDefinition(token: string): TokenDefinition | undefined {
  return TOKEN_DEFINITIONS.find(t => t.token === token);
}

/**
 * Get all tokens grouped by category
 */
export function getTokensByCategories(): Record<TokenCategory, TokenDefinition[]> {
  return {
    personalization: getTokensByCategory('personalization'),
    tracking: getTokensByCategory('tracking'),
    address: getTokensByCategory('address'),
    campaign: getTokensByCategory('campaign'),
  };
}

/**
 * Get required tokens
 */
export function getRequiredTokens(): TokenDefinition[] {
  return TOKEN_DEFINITIONS.filter(t => t.required);
}

/**
 * Replace tokens with preview values
 */
export function replaceTokensWithPreview(text: string): string {
  let result = text;
  for (const def of TOKEN_DEFINITIONS) {
    const regex = new RegExp(def.token.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, def.previewValue);
  }
  return result;
}

/**
 * Check if text contains tokens
 */
export function containsTokens(text: string): boolean {
  return /{{[^}]+}}/.test(text);
}

/**
 * Extract all tokens from text
 */
export function extractTokens(text: string): string[] {
  const matches = text.match(/{{[^}]+}}/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Validate that all tokens in text are valid
 */
export function validateTokens(text: string): { valid: boolean; unknownTokens: string[] } {
  const usedTokens = extractTokens(text);
  const validTokenStrings = TOKEN_DEFINITIONS.map(t => t.token);
  const unknownTokens = usedTokens.filter(t => !validTokenStrings.includes(t));
  
  return {
    valid: unknownTokens.length === 0,
    unknownTokens,
  };
}

/**
 * Check if text is missing required tokens
 */
export function checkRequiredTokens(text: string): { missing: TokenDefinition[] } {
  const usedTokens = extractTokens(text);
  const requiredTokens = getRequiredTokens();
  const missing = requiredTokens.filter(t => !usedTokens.includes(t.token));
  
  return { missing };
}

/**
 * Format token for display
 */
export function formatTokenDisplay(token: string): string {
  const def = getTokenDefinition(token);
  return def ? `${def.name} (${token})` : token;
}

/**
 * Get suggestion for similar tokens (typo correction)
 */
export function suggestSimilarToken(invalidToken: string): TokenDefinition | null {
  // Simple similarity check - look for tokens with similar content
  const cleaned = invalidToken.toLowerCase().replace(/[{}]/g, '');
  
  for (const def of TOKEN_DEFINITIONS) {
    const defCleaned = def.token.toLowerCase().replace(/[{}]/g, '');
    if (defCleaned.includes(cleaned) || cleaned.includes(defCleaned)) {
      return def;
    }
  }
  
  return null;
}

// ============================================================================
// Token Templates
// ============================================================================

/**
 * Common token patterns for quick insertion
 */
export const TOKEN_TEMPLATES = {
  greeting: 'Hey {{first_name}}!',
  fullGreeting: 'Dear {{first_name}} {{last_name}},',
  address: '{{address_line_1}}\n{{city}}, {{state}} {{zip}}',
  codeDisplay: 'YOUR CODE: {{unique_code}}',
  giftAmount: 'Claim your ${{gift_card_amount}} gift card!',
  expiration: 'Expires: {{expiration_date}}',
};

/**
 * Get template by key
 */
export function getTokenTemplate(key: keyof typeof TOKEN_TEMPLATES): string {
  return TOKEN_TEMPLATES[key];
}

