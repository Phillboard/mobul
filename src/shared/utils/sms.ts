/**
 * Shared SMS Template Rendering Utility
 * 
 * Standardized template variable replacement for all SMS messages.
 * Variables use the format: {variable_name} or ${value} for currency.
 */

/**
 * Twilio automatically shortens URLs in SMS messages.
 * Shortened URLs look like: https://link.scaledbyai.com/dweuihd
 * This is approximately 35 characters.
 */
export const TWILIO_SHORTENED_URL_LENGTH = 35;

/**
 * Regex to match URLs in text
 */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Estimates the character count after Twilio's URL shortening.
 * Twilio shortens all URLs to approximately 35 characters.
 * 
 * @param text - The message text
 * @returns Object with original length, estimated length after shortening, and URL count
 */
export function estimateShortenedLength(text: string): {
  originalLength: number;
  estimatedLength: number;
  urlCount: number;
  urlsSaved: number;
} {
  const urls = text.match(URL_REGEX) || [];
  const urlCount = urls.length;
  
  if (urlCount === 0) {
    return {
      originalLength: text.length,
      estimatedLength: text.length,
      urlCount: 0,
      urlsSaved: 0,
    };
  }
  
  // Calculate total characters saved by URL shortening
  let urlsSaved = 0;
  urls.forEach(url => {
    if (url.length > TWILIO_SHORTENED_URL_LENGTH) {
      urlsSaved += url.length - TWILIO_SHORTENED_URL_LENGTH;
    }
  });
  
  return {
    originalLength: text.length,
    estimatedLength: text.length - urlsSaved,
    urlCount,
    urlsSaved,
  };
}

export interface SMSTemplateVariables {
  first_name?: string;
  last_name?: string;
  value?: number | string;
  provider?: string;
  brand?: string;
  company?: string;
  client_name?: string;
  link?: string;
  code?: string;
}

/**
 * Default opt-in message template (TCPA compliant)
 */
export const DEFAULT_OPT_IN_MESSAGE = 
  "To send your activation code, we'll text you a link and a few related messages over the next 30 days from {company}. Msg & data rates may apply. Reply STOP to stop at any time.";

/**
 * Default gift card delivery message template
 */
export const DEFAULT_DELIVERY_MESSAGE = 
  "Hi {first_name}! Your ${value} {provider} gift card: {link}";

/**
 * Renders an SMS template by replacing variables with actual values.
 * Supports both {variable} and ${value} syntax for currency values.
 * 
 * @param template - The SMS template string
 * @param variables - Object containing variable values
 * @returns The rendered message string
 */
export function renderSMSTemplate(
  template: string,
  variables: SMSTemplateVariables
): string {
  if (!template) return '';
  
  let result = template;
  
  // Replace all supported variables (case-insensitive)
  const replacements: Record<string, string | undefined> = {
    // Name variables
    first_name: variables.first_name || '',
    last_name: variables.last_name || '',
    
    // Value/currency - handle ${value} and {value} formats
    value: variables.value?.toString() || '',
    
    // Brand/provider - can use either
    provider: variables.provider || variables.brand || 'Gift Card',
    brand: variables.brand || variables.provider || 'Gift Card',
    
    // Company/client name - can use either
    company: variables.company || variables.client_name || 'us',
    client_name: variables.client_name || variables.company || 'us',
    
    // Link/code - can use either
    link: variables.link || variables.code || '',
    code: variables.code || variables.link || '',
  };
  
  // Replace ${value} format for currency
  result = result.replace(/\$\{value\}/gi, `$${replacements.value}`);
  
  // Replace all {variable} placeholders
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(regex, value || '');
  }
  
  // Clean up any remaining empty placeholders
  result = result.replace(/\{[a-z_]+\}/gi, '');
  
  return result.trim();
}

/**
 * Validates an SMS template for required variables.
 * 
 * @param template - The template string to validate
 * @param requiredVars - Array of required variable names
 * @returns Object with isValid flag and missing variables
 */
export function validateSMSTemplate(
  template: string,
  requiredVars: (keyof SMSTemplateVariables)[] = []
): { isValid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    const hasVar = 
      template.includes(`{${varName}}`) || 
      (varName === 'value' && template.includes('${value}'));
    
    if (!hasVar) {
      missingVars.push(varName);
    }
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

/**
 * Gets the character count of a rendered template.
 * SMS messages are typically limited to 160 characters for single segment.
 * 
 * @param template - The template string
 * @param variables - Sample variables for estimation
 * @returns Character count
 */
export function getSMSCharacterCount(
  template: string,
  variables?: Partial<SMSTemplateVariables>
): number {
  // Use typical placeholder values for estimation
  const sampleVars: SMSTemplateVariables = {
    first_name: variables?.first_name || 'Customer',
    last_name: variables?.last_name || 'Smith',
    value: variables?.value || '25',
    provider: variables?.provider || 'Amazon',
    company: variables?.company || 'Your Company',
    link: variables?.link || 'https://gift.example.com/abc123',
    ...variables,
  };
  
  const rendered = renderSMSTemplate(template, sampleVars);
  return rendered.length;
}

/**
 * Returns information about SMS segment count based on character length.
 * Standard SMS: 160 chars (single), 153 chars per segment (multi)
 * Unicode SMS: 70 chars (single), 67 chars per segment (multi)
 */
export function getSMSSegmentInfo(charCount: number): {
  segments: number;
  isMultipart: boolean;
  charLimit: number;
} {
  if (charCount <= 160) {
    return { segments: 1, isMultipart: false, charLimit: 160 };
  }
  
  // Multi-part SMS uses 153 chars per segment
  const segments = Math.ceil(charCount / 153);
  return { segments, isMultipart: true, charLimit: 153 };
}

