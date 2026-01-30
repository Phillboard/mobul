/**
 * Server-Side A2P (Application-to-Person) SMS Compliance Validation
 * 
 * Enforces TCPA and carrier requirements for SMS messaging.
 * This is the Deno-compatible version for Edge Functions.
 * 
 * There are only 3 SMS message types in this system:
 * 1. Opt-In Request - Sent to request SMS consent
 * 2. Opt-In Confirmation - Sent when user replies YES
 * 3. Gift Card Delivery - Sent when gift card is provisioned
 */

export interface A2PValidationResult {
  isValid: boolean;
  errors: string[];      // Blocking errors - cannot save/send
  warnings: string[];    // Non-blocking recommendations
}

// SMS Template Types - Only 3 types exist in this system
export type SmsTemplateType = 
  | 'opt_in_request'
  | 'opt_in_confirmation'
  | 'gift_card_delivery';

// System default templates (TCPA/A2P compliant)
export const SYSTEM_DEFAULT_TEMPLATES: Record<SmsTemplateType, string> = {
  opt_in_request: "This is {company}. Reply YES to receive your gift card and messages for 30 days. Reply STOP to opt out. Msg & data rates may apply.",
  opt_in_confirmation: "Thanks! You're all set to receive your gift card.",
  gift_card_delivery: "Congratulations {first_name}! You've earned a ${value} {brand} gift card. Your code: {code}. Thank you for your business!",
};

/**
 * Validate an opt-in request template for A2P compliance.
 * This is the strictest validation - TCPA requires specific disclosures.
 */
export function validateOptInTemplate(template: string): A2PValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // REQUIRED: Company identifier
  if (!/{company}|{client_name}/i.test(template)) {
    errors.push('Must include company name ({company} or {client_name})');
  }

  // REQUIRED: Opt-out instructions
  if (!/STOP|opt.?out|unsubscribe/i.test(template)) {
    errors.push('Must include opt-out instructions (e.g., "Reply STOP to opt out")');
  }

  // RECOMMENDED: Message frequency
  if (!/\d+\s*(day|week|month|message)/i.test(template)) {
    warnings.push('Consider including message frequency (e.g., "for 30 days")');
  }

  // RECOMMENDED: Data rates disclaimer
  if (!/msg.*rate|data.*rate|standard.*rate/i.test(template)) {
    warnings.push('Consider adding "Msg & data rates may apply"');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an opt-in confirmation template for A2P compliance.
 * This is a simple transactional message - looser requirements.
 */
export function validateOptInConfirmationTemplate(template: string): A2PValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // For confirmation, we just need some identifiable context
  const hasContext = /thank|set|ready|confirmed|receive|gift/i.test(template) ||
    /{company}|{first_name}/i.test(template);
  
  if (!hasContext) {
    errors.push('Confirmation message should have clear context');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a gift card delivery template for A2P compliance.
 */
export function validateDeliveryTemplate(template: string): A2PValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // REQUIRED: Company or brand identifier
  const hasIdentifier = /{company}|{brand}|{client_name}/i.test(template) ||
    /congratulations|thank you|gift card/i.test(template);
  
  if (!hasIdentifier) {
    errors.push('Must include company or brand identifier');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate any SMS template based on its type.
 */
export function validateSmsTemplate(
  template: string,
  type: SmsTemplateType
): A2PValidationResult {
  switch (type) {
    case 'opt_in_request':
      return validateOptInTemplate(template);
    case 'opt_in_confirmation':
      return validateOptInConfirmationTemplate(template);
    case 'gift_card_delivery':
      return validateDeliveryTemplate(template);
    default:
      return validateDeliveryTemplate(template);
  }
}

/**
 * Render an SMS template with variable substitution
 */
export function renderSmsTemplate(
  template: string,
  variables: {
    first_name?: string;
    last_name?: string;
    value?: number | string;
    brand?: string;
    code?: string;
    link?: string;
    company?: string;
    client_name?: string;
  }
): string {
  let result = template;
  
  // Replace variables (case-insensitive)
  const replacements: [RegExp, string][] = [
    [/\{first_name\}/gi, variables.first_name || ''],
    [/\{last_name\}/gi, variables.last_name || ''],
    [/\{value\}/gi, String(variables.value || '')],
    [/\$\{value\}/gi, `$${variables.value || ''}`],
    [/\{brand\}/gi, variables.brand || ''],
    [/\{provider\}/gi, variables.brand || ''], // Alias
    [/\{code\}/gi, variables.code || ''],
    [/\{link\}/gi, variables.link || variables.code || ''],
    [/\{company\}/gi, variables.company || variables.client_name || ''],
    [/\{client_name\}/gi, variables.client_name || variables.company || ''],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Clean up any remaining empty placeholders and extra spaces
  result = result.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Check SMS character length and segment count
 */
export function checkSmsLength(template: string): {
  length: number;
  limit: number;
  isUnicode: boolean;
  segments: number;
} {
  // Check for non-GSM characters (unicode)
  const gsmChars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜẞ§¿a-zäöñüà\[\]{}\\~^|€]*$/;
  const isUnicode = !gsmChars.test(template);
  
  const limit = isUnicode ? 70 : 160;
  const multipartLimit = isUnicode ? 67 : 153;
  
  let segments = 1;
  if (template.length > limit) {
    segments = Math.ceil(template.length / multipartLimit);
  }
  
  return {
    length: template.length,
    limit,
    isUnicode,
    segments,
  };
}
