/**
 * Token Utilities
 * 
 * Utilities for handling template tokens like {{first_name}}, {{unique_code}}, etc.
 */

// ============================================================================
// Token Preview Values
// ============================================================================

/**
 * Preview values for template tokens
 * Used when preview mode is enabled
 */
export const TOKEN_PREVIEW_VALUES: Record<string, string> = {
  '{{first_name}}': 'John',
  '{{last_name}}': 'Smith',
  '{{full_name}}': 'John Smith',
  '{{unique_code}}': 'PIZZA-KING-42',
  '{{address_line_1}}': '123 Main Street',
  '{{address_line_2}}': 'Apt 4B',
  '{{city}}': 'Anytown',
  '{{state}}': 'TX',
  '{{zip}}': '75001',
  '{{expiration_date}}': 'December 31, 2025',
  '{{company_name}}': 'Acme Marketing',
  '{{purl}}': 'acme.com/claim',
  '{{gift_card_amount}}': '$15',
};

// ============================================================================
// Token Functions
// ============================================================================

/**
 * Replace all tokens in text with preview values
 */
export function replaceTokensWithPreview(text: string): string {
  let result = text;
  for (const [token, value] of Object.entries(TOKEN_PREVIEW_VALUES)) {
    // Escape special regex characters in token
    const escapedToken = token.replace(/[{}]/g, '\\$&');
    result = result.replace(new RegExp(escapedToken, 'g'), value);
  }
  return result;
}

/**
 * Check if text contains any tokens
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
 * Get the preview value for a specific token
 */
export function getTokenPreviewValue(token: string): string {
  return TOKEN_PREVIEW_VALUES[token] || token;
}

