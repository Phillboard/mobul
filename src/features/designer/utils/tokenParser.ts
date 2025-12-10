/**
 * Template Token Parser
 * 
 * Utilities for working with template tokens in designs.
 * Tokens are placeholders like {{first_name}} that get replaced with actual data.
 * 
 * @see PLATFORM_DICTIONARY.md for standard token definitions
 * @see ../types/designer.ts for token types
 */

import { TEMPLATE_TOKENS, TEMPLATE_TOKEN_METADATA } from '@/shared/utils/terminology';
import type { TemplateToken, TokenContent } from '../types/designer';

// ============================================================================
// Token Detection & Extraction
// ============================================================================

/**
 * Regular expression to match template tokens
 * Matches: {{token_name}} with optional whitespace
 */
const TOKEN_REGEX = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/**
 * Extract all template tokens from a string
 * 
 * @param content - Text to search for tokens
 * @returns Array of found tokens (including braces)
 * 
 * @example
 * extractTokens("Hello {{first_name}}!") // ['{{first_name}}']
 * extractTokens("{{first_name}} {{last_name}}") // ['{{first_name}}', '{{last_name}}']
 */
export function extractTokens(content: string): string[] {
  const tokens: string[] = [];
  const matches = content.matchAll(TOKEN_REGEX);
  
  for (const match of matches) {
    tokens.push(match[0]); // Full match including braces
  }
  
  return tokens;
}

/**
 * Check if a string contains any template tokens
 * 
 * @param content - Text to check
 * @returns True if contains at least one token
 */
export function containsTokens(content: string): boolean {
  return TOKEN_REGEX.test(content);
}

/**
 * Count the number of tokens in a string
 * 
 * @param content - Text to analyze
 * @returns Number of tokens found
 */
export function countTokens(content: string): number {
  return extractTokens(content).length;
}

// ============================================================================
// Token Validation
// ============================================================================

/**
 * Get all available template token values
 * 
 * @returns Array of valid token strings
 */
export function getAvailableTokens(): string[] {
  return Object.values(TEMPLATE_TOKENS);
}

/**
 * Check if a token is valid (exists in our standard tokens)
 * 
 * @param token - Token string to validate (with or without braces)
 * @returns True if token is valid
 * 
 * @example
 * isValidToken("{{first_name}}") // true
 * isValidToken("{{invalid_token}}") // false
 */
export function isValidToken(token: string): boolean {
  // Normalize token (ensure it has braces)
  const normalizedToken = token.startsWith('{{') && token.endsWith('}}') 
    ? token 
    : `{{${token}}}`;
  
  return getAvailableTokens().includes(normalizedToken);
}

/**
 * Validate all tokens in a string
 * 
 * @param content - Text containing tokens
 * @returns Validation result with invalid tokens if any
 * 
 * @example
 * validateTokens("{{first_name}} {{invalid}}") 
 * // { valid: false, invalid: ['{{invalid}}'] }
 */
export function validateTokens(content: string): {
  valid: boolean;
  invalid: string[];
} {
  const tokens = extractTokens(content);
  const invalid = tokens.filter(token => !isValidToken(token));
  
  return {
    valid: invalid.length === 0,
    invalid,
  };
}

// ============================================================================
// Token Replacement
// ============================================================================

/**
 * Replace template tokens with actual data
 * 
 * @param content - Text containing tokens
 * @param data - Key-value pairs of token data (without braces)
 * @param options - Replacement options
 * @returns Text with tokens replaced
 * 
 * @example
 * replaceTokens("Hello {{first_name}}!", { first_name: "John" })
 * // "Hello John!"
 * 
 * replaceTokens("{{first_name}}", {}, { useFallback: true, fallback: "Guest" })
 * // "Guest"
 */
export function replaceTokens(
  content: string,
  data: Record<string, string>,
  options: {
    useFallback?: boolean;
    fallback?: string;
    preserveUnknown?: boolean;
  } = {}
): string {
  const {
    useFallback = false,
    fallback = '',
    preserveUnknown = false,
  } = options;
  
  return content.replace(TOKEN_REGEX, (match, tokenName) => {
    // Check if we have data for this token
    if (tokenName in data) {
      return data[tokenName];
    }
    
    // Use fallback if enabled
    if (useFallback) {
      // Try to get default fallback from metadata
      const tokenMetadata = Object.values(TEMPLATE_TOKEN_METADATA).find(
        meta => meta.token === match
      );
      return tokenMetadata?.fallback || fallback;
    }
    
    // Preserve token if unknown and preserveUnknown is true
    if (preserveUnknown) {
      return match;
    }
    
    // Otherwise, remove the token
    return '';
  });
}

/**
 * Replace tokens with preview/sample data
 * Useful for showing what the design will look like with real data
 * 
 * @param content - Text containing tokens
 * @returns Text with tokens replaced with sample data
 */
export function replaceTokensWithSampleData(content: string): string {
  const sampleData: Record<string, string> = {
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    unique_code: 'ABC12345',
    company_name: 'Acme Corporation',
    purl: 'https://example.com/p/ABC12345',
    qr_code: '[QR Code]',
    gift_card_amount: '$25',
  };
  
  return replaceTokens(content, sampleData);
}

// ============================================================================
// Token Metadata
// ============================================================================

/**
 * Get metadata for a specific token
 * 
 * @param token - Token string (with or without braces)
 * @returns Token metadata or undefined if not found
 */
export function getTokenMetadata(token: string) {
  // Normalize token
  const normalizedToken = token.startsWith('{{') && token.endsWith('}}') 
    ? token 
    : `{{${token}}}`;
  
  return Object.values(TEMPLATE_TOKEN_METADATA).find(
    meta => meta.token === normalizedToken
  );
}

/**
 * Get a human-readable label for a token
 * 
 * @param token - Token string
 * @returns Label (e.g., "First Name") or the token itself if not found
 */
export function getTokenLabel(token: string): string {
  const metadata = getTokenMetadata(token);
  return metadata?.label || token;
}

/**
 * Get the default fallback value for a token
 * 
 * @param token - Token string
 * @returns Fallback value or empty string
 */
export function getTokenFallback(token: string): string {
  const metadata = getTokenMetadata(token);
  return metadata?.fallback || '';
}

// ============================================================================
// Token Content Utilities
// ============================================================================

/**
 * Create a TokenContent object from a token string
 * 
 * @param token - Token string
 * @param fallback - Optional custom fallback (uses default if not provided)
 * @returns TokenContent object
 */
export function createTokenContent(
  token: string,
  fallback?: string
): TokenContent {
  const metadata = getTokenMetadata(token);
  
  return {
    token,
    fallback: fallback || metadata?.fallback || '',
    transform: 'none',
  };
}

/**
 * Apply text transformation to token content
 * 
 * @param content - Token content
 * @param value - Value to transform
 * @returns Transformed value
 */
export function applyTokenTransform(
  content: TokenContent,
  value: string
): string {
  switch (content.transform) {
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'titlecase':
      return value.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    case 'none':
    default:
      return value;
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Find all unique tokens across multiple content strings
 * 
 * @param contents - Array of content strings
 * @returns Array of unique tokens found
 */
export function findAllTokens(contents: string[]): string[] {
  const allTokens = contents.flatMap(content => extractTokens(content));
  return Array.from(new Set(allTokens));
}

/**
 * Replace tokens in multiple content strings at once
 * 
 * @param contents - Array of content strings
 * @param data - Token replacement data
 * @param options - Replacement options
 * @returns Array of replaced content
 */
export function replaceTokensInBatch(
  contents: string[],
  data: Record<string, string>,
  options?: Parameters<typeof replaceTokens>[2]
): string[] {
  return contents.map(content => replaceTokens(content, data, options));
}

// ============================================================================
// Token Highlighting (for UI)
// ============================================================================

/**
 * Split content into parts with tokens highlighted
 * Useful for rendering tokens differently in UI
 * 
 * @param content - Text containing tokens
 * @returns Array of content parts with type annotation
 * 
 * @example
 * highlightTokens("Hello {{first_name}}!")
 * // [
 * //   { type: 'text', content: 'Hello ' },
 * //   { type: 'token', content: '{{first_name}}' },
 * //   { type: 'text', content: '!' }
 * // ]
 */
export function highlightTokens(content: string): Array<{
  type: 'text' | 'token';
  content: string;
}> {
  const parts: Array<{ type: 'text' | 'token'; content: string }> = [];
  let lastIndex = 0;
  
  const matches = Array.from(content.matchAll(TOKEN_REGEX));
  
  for (const match of matches) {
    const matchIndex = match.index!;
    
    // Add text before token
    if (matchIndex > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, matchIndex),
      });
    }
    
    // Add token
    parts.push({
      type: 'token',
      content: match[0],
    });
    
    lastIndex = matchIndex + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }
  
  return parts;
}

// ============================================================================
// Export
// ============================================================================

export const tokenParser = {
  extractTokens,
  containsTokens,
  countTokens,
  getAvailableTokens,
  isValidToken,
  validateTokens,
  replaceTokens,
  replaceTokensWithSampleData,
  getTokenMetadata,
  getTokenLabel,
  getTokenFallback,
  createTokenContent,
  applyTokenTransform,
  findAllTokens,
  replaceTokensInBatch,
  highlightTokens,
};

export default tokenParser;

