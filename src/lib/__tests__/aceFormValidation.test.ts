/**
 * ACE Form Validation Tests
 * 
 * Tests for form field validation utilities
 */

import { describe, it, expect } from 'vitest';
import { 
  validateEmail, 
  validatePhone, 
  validateRequired, 
  validateUrl,
  validateZipCode 
} from '../aceFormValidation';

describe('aceFormValidation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate US phone numbers', () => {
      expect(validatePhone('(555) 123-4567')).toBe(true);
      expect(validatePhone('555-123-4567')).toBe(true);
      expect(validatePhone('5551234567')).toBe(true);
      expect(validatePhone('+1 555 123 4567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc-def-ghij')).toBe(false);
      expect(validatePhone('')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired('0')).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  describe('validateZipCode', () => {
    it('should validate US zip codes', () => {
      expect(validateZipCode('12345')).toBe(true);
      expect(validateZipCode('12345-6789')).toBe(true);
    });

    it('should reject invalid zip codes', () => {
      expect(validateZipCode('1234')).toBe(false);
      expect(validateZipCode('abcde')).toBe(false);
      expect(validateZipCode('')).toBe(false);
    });
  });
});
