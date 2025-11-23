/**
 * Currency Utilities Tests
 * 
 * Tests for currency formatting and calculation utilities
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, calculateMarkup, calculateProfit } from '../currencyUtils';

describe('currencyUtils', () => {
  describe('formatCurrency', () => {
    it('should format dollars correctly', () => {
      expect(formatCurrency(1000)).toBe('$10.00');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(99)).toBe('$0.99');
    });

    it('should handle negative values', () => {
      expect(formatCurrency(-1000)).toBe('-$10.00');
    });

    it('should handle large values', () => {
      expect(formatCurrency(100000000)).toBe('$1,000,000.00');
    });
  });

  describe('calculateMarkup', () => {
    it('should calculate markup correctly', () => {
      expect(calculateMarkup(100, 20)).toBe(120);
      expect(calculateMarkup(50, 10)).toBe(55);
    });

    it('should handle zero markup', () => {
      expect(calculateMarkup(100, 0)).toBe(100);
    });

    it('should handle 100% markup', () => {
      expect(calculateMarkup(100, 100)).toBe(200);
    });
  });

  describe('calculateProfit', () => {
    it('should calculate profit correctly', () => {
      expect(calculateProfit(120, 100, 1)).toBe(20);
      expect(calculateProfit(55, 50, 1)).toBe(5);
    });

    it('should handle multiple quantities', () => {
      expect(calculateProfit(120, 100, 10)).toBe(200);
      expect(calculateProfit(55, 50, 100)).toBe(500);
    });

    it('should handle zero profit', () => {
      expect(calculateProfit(100, 100, 1)).toBe(0);
    });

    it('should handle negative profit (loss)', () => {
      expect(calculateProfit(90, 100, 1)).toBe(-10);
    });
  });
});
