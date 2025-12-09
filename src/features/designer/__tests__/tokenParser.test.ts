/**
 * Token Parser Tests
 * 
 * Unit tests for template token parsing utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  extractTokens,
  containsTokens,
  countTokens,
  isValidToken,
  validateTokens,
  replaceTokens,
  replaceTokensWithSampleData,
  highlightTokens,
} from '../utils/tokenParser';

describe('tokenParser', () => {
  describe('extractTokens', () => {
    it('should extract single token', () => {
      const result = extractTokens('Hello {{first_name}}!');
      expect(result).toEqual(['{{first_name}}']);
    });

    it('should extract multiple tokens', () => {
      const result = extractTokens('{{first_name}} {{last_name}}');
      expect(result).toEqual(['{{first_name}}', '{{last_name}}']);
    });

    it('should return empty array when no tokens', () => {
      const result = extractTokens('Hello world');
      expect(result).toEqual([]);
    });

    it('should handle tokens with whitespace', () => {
      const result = extractTokens('{{ first_name }}');
      expect(result).toEqual(['{{ first_name }}']);
    });
  });

  describe('containsTokens', () => {
    it('should return true when tokens present', () => {
      expect(containsTokens('Hello {{first_name}}')).toBe(true);
    });

    it('should return false when no tokens', () => {
      expect(containsTokens('Hello world')).toBe(false);
    });
  });

  describe('countTokens', () => {
    it('should count tokens correctly', () => {
      expect(countTokens('{{first_name}}')).toBe(1);
      expect(countTokens('{{first_name}} {{last_name}}')).toBe(2);
      expect(countTokens('No tokens here')).toBe(0);
    });
  });

  describe('isValidToken', () => {
    it('should validate standard tokens', () => {
      expect(isValidToken('{{first_name}}')).toBe(true);
      expect(isValidToken('{{unique_code}}')).toBe(true);
    });

    it('should reject invalid tokens', () => {
      expect(isValidToken('{{invalid_token}}')).toBe(false);
    });

    it('should handle tokens without braces', () => {
      expect(isValidToken('first_name')).toBe(true);
      expect(isValidToken('invalid_token')).toBe(false);
    });
  });

  describe('validateTokens', () => {
    it('should pass with all valid tokens', () => {
      const result = validateTokens('{{first_name}} {{last_name}}');
      expect(result.valid).toBe(true);
      expect(result.invalid).toEqual([]);
    });

    it('should fail with invalid tokens', () => {
      const result = validateTokens('{{first_name}} {{invalid}}');
      expect(result.valid).toBe(false);
      expect(result.invalid).toContain('{{invalid}}');
    });
  });

  describe('replaceTokens', () => {
    it('should replace tokens with data', () => {
      const result = replaceTokens('Hello {{first_name}}!', {
        first_name: 'John',
      });
      expect(result).toBe('Hello John!');
    });

    it('should replace multiple tokens', () => {
      const result = replaceTokens('{{first_name}} {{last_name}}', {
        first_name: 'John',
        last_name: 'Doe',
      });
      expect(result).toBe('John Doe');
    });

    it('should use fallback when useFallback=true', () => {
      const result = replaceTokens('Hello {{first_name}}!', {}, {
        useFallback: true,
        fallback: 'Guest',
      });
      expect(result).toBe('Hello Guest!');
    });

    it('should preserve unknown tokens when preserveUnknown=true', () => {
      const result = replaceTokens('{{first_name}}', {}, {
        preserveUnknown: true,
      });
      expect(result).toBe('{{first_name}}');
    });
  });

  describe('replaceTokensWithSampleData', () => {
    it('should replace with sample data', () => {
      const result = replaceTokensWithSampleData('Hello {{first_name}}!');
      expect(result).toBe('Hello John!');
    });
  });

  describe('highlightTokens', () => {
    it('should split content into text and token parts', () => {
      const result = highlightTokens('Hello {{first_name}}!');
      expect(result).toEqual([
        { type: 'text', content: 'Hello ' },
        { type: 'token', content: '{{first_name}}' },
        { type: 'text', content: '!' },
      ]);
    });

    it('should handle content with no tokens', () => {
      const result = highlightTokens('Hello world');
      expect(result).toEqual([
        { type: 'text', content: 'Hello world' },
      ]);
    });

    it('should handle content with only token', () => {
      const result = highlightTokens('{{first_name}}');
      expect(result).toEqual([
        { type: 'token', content: '{{first_name}}' },
      ]);
    });
  });
});

