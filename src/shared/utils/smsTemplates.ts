/**
 * Shared SMS Template Rendering Utility
 * 
 * Standardized template variable replacement for all SMS messages.
 * Variables use the format: {variable_name} or ${value} for currency.
 * 
 * Supports:
 * - Recipient info: {first_name}, {last_name}, {email}, {phone}, {recipient_company}
 * - Address: {address1}, {address2}, {city}, {state}, {zip}
 * - Gift card: {code}, {value}, {brand}, {provider}, {link}
 * - Client: {client_name}, {company} (backward compat for client name)
 * - Custom fields: {custom.field_name}
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
  // Recipient identity
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  recipient_company?: string;
  
  // Address
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Gift card
  value?: number | string;
  brand?: string;
  provider?: string; // Alias for brand
  code?: string;
  link?: string;
  
  // Client/business
  client_name?: string;
  company?: string; // Backward compat alias for client_name
  
  // Custom fields from recipient
  custom?: Record<string, any>;
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
 * Also supports custom fields with {custom.field_name} syntax.
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
  
  // Build replacements map (case-insensitive matching)
  const replacements: Record<string, string | undefined> = {
    // Recipient identity
    first_name: variables.first_name || '',
    last_name: variables.last_name || '',
    email: variables.email || '',
    phone: variables.phone || '',
    recipient_company: variables.recipient_company || '',
    
    // Address
    address1: variables.address1 || '',
    address2: variables.address2 || '',
    city: variables.city || '',
    state: variables.state || '',
    zip: variables.zip || '',
    
    // Value/currency - handle ${value} and {value} formats
    value: variables.value?.toString() || '',
    
    // Brand/provider - can use either
    provider: variables.provider || variables.brand || 'Gift Card',
    brand: variables.brand || variables.provider || 'Gift Card',
    
    // Link/code - can use either
    link: variables.link || variables.code || '',
    code: variables.code || variables.link || '',
    
    // Company/client name
    // {client_name} is the new preferred variable for the client/business
    // {company} is kept for backward compatibility (maps to client name)
    client_name: variables.client_name || variables.company || 'us',
    company: variables.company || variables.client_name || 'us',
  };
  
  // Replace ${value} format for currency
  result = result.replace(/\$\{value\}/gi, `$${replacements.value}`);
  
  // Replace all standard {variable} placeholders
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(regex, value || '');
  }
  
  // Handle custom fields: {custom.car_type} → value from custom.car_type
  if (variables.custom && typeof variables.custom === 'object') {
    result = result.replace(/\{custom\.([^}]+)\}/gi, (_match, fieldName) => {
      const value = variables.custom?.[fieldName];
      if (value === null || value === undefined) return '';
      return String(value);
    });
  }
  
  // Clean up any remaining empty placeholders
  result = result.replace(/\{[a-z_.]+\}/gi, '');
  
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
    email: variables?.email || 'customer@example.com',
    phone: variables?.phone || '+15551234567',
    recipient_company: variables?.recipient_company || 'ABC Company',
    address1: variables?.address1 || '123 Main St',
    city: variables?.city || 'Austin',
    state: variables?.state || 'TX',
    zip: variables?.zip || '78701',
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

/**
 * List of all supported SMS variables for documentation/UI
 */
export const SMS_VARIABLE_LIST = {
  recipient: [
    { name: 'first_name', description: 'Recipient first name' },
    { name: 'last_name', description: 'Recipient last name' },
    { name: 'email', description: 'Recipient email address' },
    { name: 'phone', description: 'Recipient phone number' },
    { name: 'recipient_company', description: 'Recipient company name' },
  ],
  address: [
    { name: 'address1', description: 'Street address line 1' },
    { name: 'address2', description: 'Street address line 2' },
    { name: 'city', description: 'City' },
    { name: 'state', description: 'State' },
    { name: 'zip', description: 'ZIP code' },
  ],
  gift_card: [
    { name: 'code', description: 'Gift card code' },
    { name: 'value', description: 'Gift card value (use ${value} for dollar sign)' },
    { name: 'brand', description: 'Gift card brand/provider' },
    { name: 'link', description: 'Gift card redemption link' },
  ],
  client: [
    { name: 'client_name', description: 'Client/business company name' },
    { name: 'company', description: 'Alias for client_name (backward compat)' },
  ],
  custom: [
    { name: 'custom.*', description: 'Any custom field (e.g., {custom.car_type})' },
  ],
};
