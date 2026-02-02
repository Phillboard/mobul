/**
 * Common Validation Helpers
 * 
 * Simple validation functions that throw descriptive errors.
 * Use these for quick field validation without a full schema library.
 */

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Email regex pattern (simple but effective)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone regex pattern (E.164 format with optional leading +)
 */
const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

/**
 * Validation Error class for structured error handling
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a value is a valid UUID v4
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if not a valid UUID
 * 
 * @example
 * validateUUID(body.campaignId, 'campaignId');
 */
export function validateUUID(value: string, fieldName: string): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  if (!UUID_REGEX.test(value)) {
    throw new ValidationError(
      `${fieldName} must be a valid UUID`,
      fieldName,
      'INVALID_UUID'
    );
  }
}

/**
 * Validate that a value is a valid email address
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages (default: 'email')
 * @throws ValidationError if not a valid email
 * 
 * @example
 * validateEmail(body.email);
 * validateEmail(body.contactEmail, 'contactEmail');
 */
export function validateEmail(value: string, fieldName: string = 'email'): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  if (!EMAIL_REGEX.test(value)) {
    throw new ValidationError(
      `${fieldName} must be a valid email address`,
      fieldName,
      'INVALID_EMAIL'
    );
  }
}

/**
 * Validate that a value is a valid phone number (E.164 format)
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages (default: 'phone')
 * @throws ValidationError if not a valid phone number
 * 
 * @example
 * validatePhone(body.phone);
 * validatePhone(body.mobileNumber, 'mobileNumber');
 */
export function validatePhone(value: string, fieldName: string = 'phone'): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  // Strip common formatting characters before validation
  const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
  
  if (!PHONE_REGEX.test(cleaned)) {
    throw new ValidationError(
      `${fieldName} must be a valid phone number (E.164 format)`,
      fieldName,
      'INVALID_PHONE'
    );
  }
}

/**
 * Validate that a value is present and not empty
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if value is null, undefined, or empty string
 * 
 * @example
 * validateRequired(body.name, 'name');
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName, 'REQUIRED_FIELD');
  }
  
  if (typeof value === 'string' && value.trim() === '') {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName, 'EMPTY_FIELD');
  }
}

/**
 * Validate that a value is one of the allowed options
 * 
 * @param value - The value to validate
 * @param options - Array of allowed values
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if value is not in options
 * 
 * @example
 * validateOneOf(body.status, ['pending', 'active', 'completed'], 'status');
 */
export function validateOneOf<T extends string>(
  value: string,
  options: readonly T[],
  fieldName: string
): asserts value is T {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  if (!options.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${options.join(', ')}`,
      fieldName,
      'INVALID_OPTION'
    );
  }
}

/**
 * Validate that a value is a positive number
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param allowZero - Whether to allow zero (default: false)
 * @throws ValidationError if not a positive number
 * 
 * @example
 * validatePositiveNumber(body.amount, 'amount');
 * validatePositiveNumber(body.quantity, 'quantity', true); // allow 0
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string,
  allowZero: boolean = false
): void {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (typeof num !== 'number' || isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName, 'INVALID_NUMBER');
  }
  
  if (allowZero ? num < 0 : num <= 0) {
    throw new ValidationError(
      `${fieldName} must be ${allowZero ? 'a non-negative' : 'a positive'} number`,
      fieldName,
      'INVALID_NUMBER'
    );
  }
}

/**
 * Validate that a value is a valid URL
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages (default: 'url')
 * @throws ValidationError if not a valid URL
 * 
 * @example
 * validateURL(body.webhookUrl, 'webhookUrl');
 */
export function validateURL(value: string, fieldName: string = 'url'): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  try {
    new URL(value);
  } catch {
    throw new ValidationError(
      `${fieldName} must be a valid URL`,
      fieldName,
      'INVALID_URL'
    );
  }
}

/**
 * Validate that a string has a minimum length
 * 
 * @param value - The value to validate
 * @param minLength - Minimum required length
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if string is too short
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string
): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName,
      'TOO_SHORT'
    );
  }
}

/**
 * Validate that a string does not exceed a maximum length
 * 
 * @param value - The value to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if string is too long
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string
): void {
  if (value && typeof value === 'string' && value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`,
      fieldName,
      'TOO_LONG'
    );
  }
}

/**
 * Validate an array has items
 * 
 * @param value - The array to validate
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum required items (default: 1)
 * @throws ValidationError if array is empty or too short
 */
export function validateArray(
  value: unknown,
  fieldName: string,
  minLength: number = 1
): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName, 'NOT_ARRAY');
  }
  
  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${minLength} item(s)`,
      fieldName,
      'ARRAY_TOO_SHORT'
    );
  }
}

/**
 * Validate a value is a valid ISO date string
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if not a valid date
 */
export function validateDate(value: string, fieldName: string): void {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    throw new ValidationError(
      `${fieldName} must be a valid date`,
      fieldName,
      'INVALID_DATE'
    );
  }
}

/**
 * Run multiple validations and collect all errors
 * 
 * @param validations - Array of validation functions to run
 * @returns Array of error messages (empty if all valid)
 * 
 * @example
 * const errors = collectValidationErrors([
 *   () => validateRequired(body.name, 'name'),
 *   () => validateEmail(body.email),
 *   () => validateUUID(body.campaignId, 'campaignId'),
 * ]);
 * if (errors.length > 0) {
 *   throw new ValidationError(errors.join(', '));
 * }
 */
export function collectValidationErrors(
  validations: Array<() => void>
): string[] {
  const errors: string[] = [];
  
  for (const validate of validations) {
    try {
      validate();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message);
      } else if (error instanceof Error) {
        errors.push(error.message);
      }
    }
  }
  
  return errors;
}
