/**
 * Gift Card Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  maskCardCode,
  calculateProfit,
  calculateProfitMargin,
  validatePoolQuantity,
  isPoolLowStock,
  formatCheckFrequency,
} from '../campaign/giftCardUtils';

describe('maskCardCode', () => {
  it('should mask long codes showing only last 4 digits', () => {
    expect(maskCardCode('1234567890123456')).toBe('••••••••••••3456');
  });

  it('should not mask codes 4 chars or less', () => {
    expect(maskCardCode('1234')).toBe('1234');
  });

  it('should handle empty strings', () => {
    expect(maskCardCode('')).toBe('');
  });
});

describe('calculateProfit', () => {
  it('should calculate profit correctly', () => {
    expect(calculateProfit(25, 20, 100)).toBe(500);
  });

  it('should handle zero quantity', () => {
    expect(calculateProfit(25, 20, 0)).toBe(0);
  });

  it('should handle negative margins', () => {
    expect(calculateProfit(15, 20, 100)).toBe(-500);
  });
});

describe('calculateProfitMargin', () => {
  it('should calculate margin as percentage', () => {
    expect(calculateProfitMargin(25, 20)).toBe(20);
  });

  it('should handle zero sale price', () => {
    expect(calculateProfitMargin(0, 20)).toBe(0);
  });

  it('should handle 100% markup', () => {
    expect(calculateProfitMargin(40, 20)).toBe(50);
  });
});

describe('validatePoolQuantity', () => {
  const pool = {
    id: '1',
    available_cards: 100,
    min_purchase_quantity: 10,
  } as any;

  it('should validate sufficient quantity', () => {
    const result = validatePoolQuantity(pool, 50);
    expect(result.isValid).toBe(true);
  });

  it('should reject zero or negative quantity', () => {
    const result = validatePoolQuantity(pool, 0);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('greater than 0');
  });

  it('should reject quantity exceeding available', () => {
    const result = validatePoolQuantity(pool, 150);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Only 100 cards available');
  });

  it('should enforce minimum purchase quantity', () => {
    const result = validatePoolQuantity(pool, 5);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Minimum purchase quantity is 10');
  });
});

describe('isPoolLowStock', () => {
  it('should return true when below threshold', () => {
    const pool = { available_cards: 5, low_stock_threshold: 10 } as any;
    expect(isPoolLowStock(pool)).toBe(true);
  });

  it('should return false when above threshold', () => {
    const pool = { available_cards: 20, low_stock_threshold: 10 } as any;
    expect(isPoolLowStock(pool)).toBe(false);
  });

  it('should use default threshold of 10', () => {
    const pool = { available_cards: 8 } as any;
    expect(isPoolLowStock(pool)).toBe(true);
  });
});

describe('formatCheckFrequency', () => {
  it('should format daily frequency', () => {
    expect(formatCheckFrequency(24)).toBe('Daily');
  });

  it('should format weekly frequency', () => {
    expect(formatCheckFrequency(168)).toBe('Weekly');
  });

  it('should format monthly frequency', () => {
    expect(formatCheckFrequency(720)).toBe('Monthly');
  });

  it('should format custom day frequency', () => {
    expect(formatCheckFrequency(72)).toBe('Every 3 days');
  });

  it('should format hour frequency', () => {
    expect(formatCheckFrequency(6)).toBe('Every 6 hours');
  });
});
