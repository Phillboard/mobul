/**
 * Phone Number Formatting Utilities
 * 
 * Formats phone numbers for display in a consistent, readable format.
 */

/**
 * Formats a phone number for display.
 * Converts various formats to: (XXX) XXX-XXXX
 * 
 * @param phone - The phone number string (can include +1, dashes, spaces, etc.)
 * @returns Formatted phone number or original if can't format
 * 
 * @example
 * formatPhoneNumber("+16264938910") // "(626) 493-8910"
 * formatPhoneNumber("6264938910") // "(626) 493-8910"
 * formatPhoneNumber("626-493-8910") // "(626) 493-8910"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Strip to digits only
  const digits = phone.replace(/\D/g, '');
  
  // Handle US numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Handle standard US numbers (10 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Handle 7-digit local numbers
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  
  // Return original if can't format (international numbers, etc.)
  return phone;
}

/**
 * Formats a phone number for E.164 format (for APIs/storage).
 * Ensures the number starts with +1 for US numbers.
 * 
 * @param phone - The phone number string
 * @returns E.164 formatted number (+1XXXXXXXXXX) or original if invalid
 */
export function toE164(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Strip to digits only
  const digits = phone.replace(/\D/g, '');
  
  // Already has country code
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }
  
  // Add US country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Return original if can't normalize
  return phone;
}

/**
 * Checks if a phone number looks valid (basic validation).
 * 
 * @param phone - The phone number string
 * @returns True if the number appears to be a valid US phone number
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const digits = phone.replace(/\D/g, '');
  
  // Valid US numbers are 10 or 11 digits (with country code)
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}
