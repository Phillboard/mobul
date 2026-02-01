/**
 * A2P (Application-to-Person) SMS Compliance Validation
 * 
 * Enforces TCPA and carrier requirements for SMS messaging.
 * These validations are NON-BYPASSABLE - users cannot save non-compliant templates.
 * 
 * There are only 3 SMS message types in this system:
 * 1. Opt-In Request - Sent to request SMS consent
 * 2. Opt-In Confirmation - Sent when user replies YES
 * 3. Gift Card Delivery - Sent when gift card is provisioned
 */

export interface A2PValidationResult {
  isValid: boolean;
  errors: string[];      // Blocking errors - cannot save
  warnings: string[];    // Non-blocking recommendations
  checks: A2PCheckResult[];
}

export interface A2PCheckResult {
  name: string;
  passed: boolean;
  required: boolean;
  message: string;
}

// SMS Template Types - Only 3 types exist in this system
export type SmsTemplateType = 
  | 'opt_in_request'
  | 'opt_in_confirmation'
  | 'gift_card_delivery';

// Template type metadata
export const SMS_TEMPLATE_TYPES: Record<SmsTemplateType, {
  label: string;
  description: string;
  variables: string[];
  defaultTemplate: string;
  canBeDisabled?: boolean;
}> = {
  opt_in_request: {
    label: 'Opt-In Request',
    description: 'Sent when requesting SMS consent from recipients (TCPA required)',
    variables: ['{company}', '{client_name}', '{first_name}'],
    defaultTemplate: 'This is {company}. Reply YES to receive your gift card and messages for 30 days. Reply STOP to opt out. Msg & data rates may apply.',
  },
  opt_in_confirmation: {
    label: 'Opt-In Confirmation',
    description: 'Sent when recipient replies YES to opt-in request',
    variables: ['{company}', '{client_name}', '{first_name}'],
    defaultTemplate: "Thanks! You're all set to receive your gift card.",
    canBeDisabled: true,
  },
  gift_card_delivery: {
    label: 'Gift Card Delivery',
    description: 'Sent when delivering gift card codes to recipients',
    // All supported variables for gift card delivery (URLs in message can contain any of these)
    variables: [
      // Recipient identity
      '{first_name}', '{last_name}', '{email}', '{phone}', '{recipient_company}',
      // Address
      '{address1}', '{address2}', '{city}', '{state}', '{zip}',
      // Gift card
      '{code}', '{value}', '{brand}', '{link}',
      // Client
      '{client_name}', '{company}',
      // Custom (documented separately)
      '{custom.*}',
    ],
    defaultTemplate: 'Congratulations {first_name}! You\'ve earned a ${value} {brand} gift card. Your code: {code}. Thank you for your business!',
  },
};

/**
 * Validate an opt-in request template for A2P compliance.
 * This is the strictest validation - TCPA requires specific disclosures.
 */
export function validateOptInTemplate(template: string): A2PValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: A2PCheckResult[] = [];

  // REQUIRED: Company identifier
  const hasCompany = /{company}|{client_name}/i.test(template);
  checks.push({
    name: 'Company Name',
    passed: hasCompany,
    required: true,
    message: hasCompany 
      ? 'Company name included' 
      : 'Must include {company} or {client_name}',
  });
  if (!hasCompany) {
    errors.push('Must include company name ({company} or {client_name})');
  }

  // REQUIRED: Opt-out instructions
  const hasOptOut = /STOP|opt.?out|unsubscribe/i.test(template);
  checks.push({
    name: 'Opt-Out Instructions',
    passed: hasOptOut,
    required: true,
    message: hasOptOut
      ? 'Opt-out instructions included'
      : 'Must include opt-out instructions (e.g., "Reply STOP")',
  });
  if (!hasOptOut) {
    errors.push('Must include opt-out instructions (e.g., "Reply STOP to opt out")');
  }

  // RECOMMENDED: Message frequency
  const hasFrequency = /\d+\s*(day|week|month|message)/i.test(template);
  checks.push({
    name: 'Message Frequency',
    passed: hasFrequency,
    required: false,
    message: hasFrequency
      ? 'Message frequency disclosed'
      : 'Consider adding message frequency (e.g., "for 30 days")',
  });
  if (!hasFrequency) {
    warnings.push('Consider including message frequency (e.g., "for 30 days")');
  }

  // RECOMMENDED: Data rates disclaimer
  const hasRates = /msg.*rate|data.*rate|standard.*rate/i.test(template);
  checks.push({
    name: 'Data Rates Disclosure',
    passed: hasRates,
    required: false,
    message: hasRates
      ? 'Data rates disclosed'
      : 'Consider adding "Msg & data rates may apply"',
  });
  if (!hasRates) {
    warnings.push('Consider adding "Msg & data rates may apply"');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    checks,
  };
}

/**
 * Validate an opt-in confirmation template for A2P compliance.
 * This is a simple transactional message - looser requirements.
 */
export function validateOptInConfirmationTemplate(template: string): A2PValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: A2PCheckResult[] = [];

  // For confirmation, we just need some identifiable context
  // The message itself implies the context (response to YES)
  const hasContext = /thank|set|ready|confirmed|receive|gift/i.test(template) ||
    /{company}|{first_name}/i.test(template);
  
  checks.push({
    name: 'Clear Context',
    passed: hasContext,
    required: true,
    message: hasContext
      ? 'Message has clear context'
      : 'Message should indicate what was confirmed',
  });
  
  if (!hasContext) {
    errors.push('Confirmation message should have clear context (e.g., mention gift card or thank the user)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    checks,
  };
}

/**
 * Validate a gift card delivery template for A2P compliance.
 */
export function validateDeliveryTemplate(template: string): A2PValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks: A2PCheckResult[] = [];

  // REQUIRED: Company or brand identifier
  const hasIdentifier = /{company}|{brand}|{client_name}/i.test(template) ||
    /congratulations|thank you|gift card/i.test(template);
  checks.push({
    name: 'Business Identifier',
    passed: hasIdentifier,
    required: true,
    message: hasIdentifier
      ? 'Business identifier included'
      : 'Must include company or brand identifier',
  });
  if (!hasIdentifier) {
    errors.push('Must include company or brand identifier ({company}, {brand}, or recognizable business reference)');
  }

  // RECOMMENDED: Include gift card value
  const hasValue = /{value}|\$\{value\}|\${value}/i.test(template);
  checks.push({
    name: 'Gift Card Value',
    passed: hasValue,
    required: false,
    message: hasValue
      ? 'Gift card value included'
      : 'Consider including the gift card value ({value})',
  });

  // RECOMMENDED: Include code or link
  const hasCodeOrLink = /{code}|{link}/i.test(template);
  checks.push({
    name: 'Code or Link',
    passed: hasCodeOrLink,
    required: false,
    message: hasCodeOrLink
      ? 'Code or link included'
      : 'Consider including {code} or {link} for redemption',
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    checks,
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
 * Check if a template exceeds SMS character limits.
 * Standard SMS: 160 chars (GSM-7 encoding)
 * Unicode SMS: 70 chars
 * 
 * When accountForUrlShortening is true, estimates the length after
 * Twilio's automatic URL shortening (URLs become ~35 chars).
 */
export function checkSmsLength(template: string, accountForUrlShortening: boolean = true): {
  length: number;
  estimatedLength: number;
  limit: number;
  isUnicode: boolean;
  segments: number;
  warning: string | null;
  urlInfo: {
    urlCount: number;
    charactersSaved: number;
  };
} {
  // Check for non-GSM characters (unicode)
  // GSM character set regex - includes control characters for newline, carriage return, and escape
  // eslint-disable-next-line no-control-regex
  const gsmChars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜẞ§¿a-zäöñüà[\]{}\\~^|€]*$/;
  const isUnicode = !gsmChars.test(template);
  
  const limit = isUnicode ? 70 : 160;
  const multipartLimit = isUnicode ? 67 : 153; // Headers reduce capacity in multipart
  
  // Estimate length after Twilio URL shortening
  // Twilio shortens URLs to approximately 35 characters
  const TWILIO_SHORTENED_URL_LENGTH = 35;
  const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = template.match(URL_REGEX) || [];
  
  let charactersSaved = 0;
  if (accountForUrlShortening) {
    urls.forEach(url => {
      if (url.length > TWILIO_SHORTENED_URL_LENGTH) {
        charactersSaved += url.length - TWILIO_SHORTENED_URL_LENGTH;
      }
    });
  }
  
  const estimatedLength = template.length - charactersSaved;
  const lengthForSegments = accountForUrlShortening ? estimatedLength : template.length;
  
  let segments = 1;
  if (lengthForSegments > limit) {
    segments = Math.ceil(lengthForSegments / multipartLimit);
  }
  
  let warning: string | null = null;
  if (lengthForSegments > limit) {
    warning = `Message will be sent as ${segments} SMS segment${segments > 1 ? 's' : ''}`;
  } else if (lengthForSegments > limit * 0.9) {
    warning = 'Approaching character limit';
  }
  
  return {
    length: template.length,
    estimatedLength,
    limit,
    isUnicode,
    segments,
    warning,
    urlInfo: {
      urlCount: urls.length,
      charactersSaved,
    },
  };
}
