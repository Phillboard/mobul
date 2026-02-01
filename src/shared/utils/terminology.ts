/**
 * PLATFORM TERMINOLOGY CONSTANTS
 * 
 * Source of truth for all terminology used across the Mobul platform.
 * Based on PLATFORM_DICTIONARY.md
 * 
 * @see PLATFORM_DICTIONARY.md for complete definitions and business context
 */

// ============================================================================
// Organization Types
// ============================================================================

/**
 * Organization hierarchy types
 * Platform → Agency → Client
 */
export const ORGANIZATION_TYPES = {
  /** Mobul itself - the top-level entity */
  PLATFORM: 'platform',
  
  /** Marketing agency or reseller that uses Mobul to serve their clients */
  AGENCY: 'agency',
  
  /** Business that the Agency serves. The end customer of the Agency. */
  CLIENT: 'client',
} as const;

export type OrganizationType = typeof ORGANIZATION_TYPES[keyof typeof ORGANIZATION_TYPES];

// ============================================================================
// User Roles
// ============================================================================

/**
 * User roles in the Mobul platform
 * Each role has specific permissions and access levels
 */
export const USER_ROLES = {
  /** Mobul staff with full system access */
  ADMIN: 'admin',
  
  /** Mobul support staff - can view all data, assist users, cannot delete */
  TECH_SUPPORT: 'tech_support',
  
  /** Owner/admin of an Agency account - manages all clients under their agency */
  AGENCY_OWNER: 'agency_owner',
  
  /** Owner/admin of a Client account - manages their company's campaigns, contacts, users */
  CLIENT_OWNER: 'company_owner', // Note: uses 'company_owner' for DB compatibility
  
  /** Call center user who processes redemptions. NOT an AI agent or software agent. */
  AGENT: 'call_center', // Note: uses 'call_center' for DB compatibility
  
  /** API user with programmatic access */
  DEVELOPER: 'developer',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ============================================================================
// Template Tokens (Personalization Variables)
// ============================================================================

/**
 * Standard template tokens for mail, landing pages, and emails
 * These are placeholder variables replaced with recipient data
 * 
 * PREFERRED TERM: "template_token" (not merge_field, placeholder, or variable)
 */
export const TEMPLATE_TOKENS = {
  /** Recipient's first name */
  FIRST_NAME: '{{first_name}}',
  
  /** Recipient's last name */
  LAST_NAME: '{{last_name}}',
  
  /** Recipient's full name (first + last) */
  FULL_NAME: '{{full_name}}',
  
  /** Recipient's unique tracking/redemption code */
  UNIQUE_CODE: '{{unique_code}}',
  
  /** Client's company name */
  COMPANY_NAME: '{{company_name}}',
  
  /** Personal URL for this recipient */
  PURL: '{{purl}}',
  
  /** QR code image */
  QR_CODE: '{{qr_code}}',
  
  /** Gift card value/amount */
  GIFT_CARD_AMOUNT: '{{gift_card_amount}}',
} as const;

/**
 * Metadata for each template token including labels and fallbacks
 */
export const TEMPLATE_TOKEN_METADATA = {
  [TEMPLATE_TOKENS.FIRST_NAME]: {
    token: TEMPLATE_TOKENS.FIRST_NAME,
    label: 'First Name',
    fallback: 'Valued Customer',
    description: "Recipient's first name",
  },
  [TEMPLATE_TOKENS.LAST_NAME]: {
    token: TEMPLATE_TOKENS.LAST_NAME,
    label: 'Last Name',
    fallback: '',
    description: "Recipient's last name",
  },
  [TEMPLATE_TOKENS.FULL_NAME]: {
    token: TEMPLATE_TOKENS.FULL_NAME,
    label: 'Full Name',
    fallback: 'Valued Customer',
    description: "Recipient's full name (first + last)",
  },
  [TEMPLATE_TOKENS.UNIQUE_CODE]: {
    token: TEMPLATE_TOKENS.UNIQUE_CODE,
    label: 'Unique Code',
    fallback: 'XXXXXX',
    description: "Recipient's unique tracking/redemption code",
  },
  [TEMPLATE_TOKENS.COMPANY_NAME]: {
    token: TEMPLATE_TOKENS.COMPANY_NAME,
    label: 'Company Name',
    fallback: '',
    description: "Client's company name",
  },
  [TEMPLATE_TOKENS.PURL]: {
    token: TEMPLATE_TOKENS.PURL,
    label: 'Personal URL',
    fallback: 'example.com/p/code',
    description: 'Personal landing page URL for this recipient',
  },
  [TEMPLATE_TOKENS.QR_CODE]: {
    token: TEMPLATE_TOKENS.QR_CODE,
    label: 'QR Code',
    fallback: '[QR]',
    description: 'QR code image linking to personal URL',
  },
  [TEMPLATE_TOKENS.GIFT_CARD_AMOUNT]: {
    token: TEMPLATE_TOKENS.GIFT_CARD_AMOUNT,
    label: 'Gift Card Amount',
    fallback: '$XX',
    description: 'Dollar value of the gift card reward',
  },
} as const;

// ============================================================================
// Code Field Names
// ============================================================================

/**
 * Field names for unique tracking codes
 * 
 * PREFERRED TERM: "unique_code"
 * Database columns may still use "customer_code" or "redemption_code" for backward compatibility
 */
export const CODE_FIELD_NAMES = {
  /** Preferred term in code and UI */
  UNIQUE_CODE: 'unique_code',
  
  /** Legacy database column name (contacts table) */
  CUSTOMER_CODE: 'customer_code',
  
  /** Legacy database column name (some redemption contexts) */
  REDEMPTION_CODE: 'redemption_code',
} as const;

// ============================================================================
// Campaign Concepts
// ============================================================================

/**
 * Campaign lifecycle states
 */
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS];

/**
 * Landing page modes
 */
export const LANDING_PAGE_MODES = {
  /** Bridge page - intermediate step before final destination */
  BRIDGE: 'bridge',
  
  /** PURL - personalized URL unique to recipient */
  PURL: 'purl',
  
  /** Direct link - no personalization */
  DIRECT: 'direct',
} as const;

export type LandingPageMode = typeof LANDING_PAGE_MODES[keyof typeof LANDING_PAGE_MODES];

// ============================================================================
// Credit System
// ============================================================================

/**
 * Account types in the credit hierarchy
 * Platform → Agency → Client → Campaign
 */
export const ACCOUNT_TYPES = {
  PLATFORM: 'platform',
  AGENCY: 'agency',
  CLIENT: 'client',
  CAMPAIGN: 'campaign',
} as const;

export type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES];

/**
 * Credit transaction types
 */
export const TRANSACTION_TYPES = {
  /** External money coming in */
  PURCHASE: 'purchase',
  
  /** Parent allocating to child */
  ALLOCATION_OUT: 'allocation_out',
  
  /** Child receiving from parent */
  ALLOCATION_IN: 'allocation_in',
  
  /** Gift card provisioned (deduction) */
  REDEMPTION: 'redemption',
  
  /** Money returned */
  REFUND: 'refund',
  
  /** Admin correction */
  ADJUSTMENT: 'adjustment',
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

// ============================================================================
// Terms to AVOID
// ============================================================================

/**
 * Ambiguous terms that should NOT be used alone.
 * Always be specific about context.
 * 
 * @see PLATFORM_DICTIONARY.md for replacement terms
 */
export const AMBIGUOUS_TERMS = {
  // Instead of "user" alone, specify: "agent", "client owner", "admin", etc.
  USER: 'user',
  
  // Instead of "customer" for Client, use "client" (business) or "customer" (mail recipient)
  CUSTOMER: 'customer',
  
  // Instead of "code" alone, use "unique_code", "api_key", etc.
  CODE: 'code',
  
  // Instead of "template" alone, use "mail_template", "email_template", etc.
  TEMPLATE: 'template',
  
  // Instead of "card" alone, use "gift_card" or "credit_card"
  CARD: 'card',
  
  // Instead of "pool" alone, use "gift_card_pool" or "credit_pool"
  POOL: 'pool',
  
  // Instead of "account" alone, use "user_account", "credit_account", "organization"
  ACCOUNT: 'account',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all template token values as an array
 */
export function getAllTemplateTokens(): string[] {
  return Object.values(TEMPLATE_TOKENS);
}

/**
 * Check if a string contains any template tokens
 */
export function containsTemplateTokens(text: string): boolean {
  return getAllTemplateTokens().some(token => text.includes(token));
}

/**
 * Extract all template tokens from a string
 */
export function extractTemplateTokens(text: string): string[] {
  const tokens = getAllTemplateTokens();
  return tokens.filter(token => text.includes(token));
}

/**
 * Validate if a string is a valid template token
 */
export function isValidTemplateToken(token: string): boolean {
  return getAllTemplateTokens().includes(token);
}

/**
 * Get token metadata by token value
 */
export function getTokenMetadata(token: string) {
  return TEMPLATE_TOKEN_METADATA[token as keyof typeof TEMPLATE_TOKEN_METADATA];
}

// ============================================================================
// Export All
// ============================================================================

export default {
  ORGANIZATION_TYPES,
  USER_ROLES,
  TEMPLATE_TOKENS,
  TEMPLATE_TOKEN_METADATA,
  CODE_FIELD_NAMES,
  CAMPAIGN_STATUS,
  LANDING_PAGE_MODES,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  AMBIGUOUS_TERMS,
  getAllTemplateTokens,
  containsTemplateTokens,
  extractTemplateTokens,
  isValidTemplateToken,
  getTokenMetadata,
};

