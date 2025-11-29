/**
 * Centralized Zod Validation Schemas
 * All validation logic should use these schemas for consistency
 */
import { z } from 'zod';

// Gift Card Code Validation
export const giftCardCodeSchema = z.string()
  .min(4, "Code must be at least 4 characters")
  .max(20, "Code must be less than 20 characters")
  .regex(/^[A-Za-z0-9]+$/, "Only letters and numbers allowed");

// Phone Number Validation
export const phoneSchema = z.string()
  .regex(
    /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
    "Invalid phone number format"
  )
  .transform((val) => {
    // Format to (XXX) XXX-XXXX
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return val;
  });

export const phoneSchemaOptional = z.string()
  .optional()
  .refine((val) => {
    if (!val) return true;
    return /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(val);
  }, "Invalid phone number format");

// Email Validation
export const emailSchema = z.string()
  .email("Invalid email address")
  .toLowerCase();

export const emailSchemaOptional = z.string()
  .email("Invalid email address")
  .toLowerCase()
  .optional();

// Name Validation
export const nameSchema = z.string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .trim();

export const nameSchemaOptional = z.string()
  .max(100, "Name must be less than 100 characters")
  .trim()
  .optional();

// URL Validation
export const urlSchema = z.string()
  .url("Invalid URL format")
  .or(z.literal(''));

export const urlSchemaOptional = z.string()
  .url("Invalid URL format")
  .optional()
  .or(z.literal(''));

// Customer Code Validation
export const customerCodeSchema = z.string()
  .min(4, "Code must be at least 4 characters")
  .max(50, "Code must be less than 50 characters")
  .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, hyphens and underscores");

// Address Validation
export const addressSchema = z.object({
  address: z.string().max(200).optional(),
  address2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zip: z.string()
    .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code")
    .optional()
    .or(z.literal('')),
  country: z.string().max(100).optional(),
});

// Text Field Validation (generic)
export const shortTextSchema = z.string()
  .max(255, "Text must be less than 255 characters")
  .trim();

export const longTextSchema = z.string()
  .max(5000, "Text must be less than 5000 characters")
  .trim();

// Number Validation
export const positiveNumberSchema = z.number()
  .positive("Must be a positive number")
  .finite("Must be a finite number");

export const nonNegativeNumberSchema = z.number()
  .nonnegative("Must be zero or positive")
  .finite("Must be a finite number");

// Currency Validation (in cents)
export const currencySchema = z.number()
  .int("Currency must be in whole cents")
  .nonnegative("Amount cannot be negative");

// Percentage Validation
export const percentageSchema = z.number()
  .min(0, "Percentage must be at least 0")
  .max(100, "Percentage cannot exceed 100");

// Date Validation
export const dateSchema = z.string()
  .refine((val) => !isNaN(Date.parse(val)), "Invalid date format")
  .transform((val) => new Date(val));

export const futureDateSchema = z.string()
  .refine((val) => !isNaN(Date.parse(val)), "Invalid date format")
  .refine((val) => new Date(val) > new Date(), "Date must be in the future")
  .transform((val) => new Date(val));

// Reusable validation functions
export function validateGiftCardCode(code: string): boolean {
  return giftCardCodeSchema.safeParse(code).success;
}

export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return value;
}

export function sanitizeInput(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}
