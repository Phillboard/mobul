/**
 * Gift Card Provisioning Utils Tests
 * 
 * Tests for gift card formatting, validation, and utility functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatCardCode,
  validateCardCode,
  formatCurrency,
  formatDenomination,
  calculateProfitMargin,
  formatProfitMargin,
  isInventoryLow,
  getInventoryStatusColor,
  formatBrandDenomination,
  generateUploadBatchId,
  groupTransactionsByDate,
  getSourceBadgeColor,
  formatSource,
} from '@/features/gift-cards/lib/provisioning-utils';

describe('formatCardCode', () => {
  it('should format code with spaces by default', () => {
    expect(formatCardCode('ABCD1234EFGH')).toBe('ABCD 1234 EFGH');
  });

  it('should format code with dashes when specified', () => {
    expect(formatCardCode('ABCD1234EFGH', 'dashes')).toBe('ABCD-1234-EFGH');
  });

  it('should handle already formatted codes', () => {
    expect(formatCardCode('ABCD 1234 EFGH')).toBe('ABCD 1234 EFGH');
  });

  it('should return empty string for empty input', () => {
    expect(formatCardCode('')).toBe('');
  });

  it('should handle short codes', () => {
    expect(formatCardCode('ABC')).toBe('ABC');
  });
});

describe('validateCardCode', () => {
  it('should validate correct alphanumeric codes', () => {
    expect(validateCardCode('ABCD1234EFGH')).toBe(true);
  });

  it('should validate codes with spaces', () => {
    expect(validateCardCode('ABCD 1234 EFGH')).toBe(true);
  });

  it('should validate codes with dashes', () => {
    expect(validateCardCode('ABCD-1234-EFGH')).toBe(true);
  });

  it('should reject empty codes', () => {
    expect(validateCardCode('')).toBe(false);
  });

  it('should reject too short codes', () => {
    expect(validateCardCode('ABC')).toBe(false);
  });

  it('should reject too long codes', () => {
    expect(validateCardCode('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(false);
  });
});

describe('formatCurrency', () => {
  it('should format USD currency correctly', () => {
    expect(formatCurrency(25)).toBe('$25.00');
  });

  it('should format with decimals', () => {
    expect(formatCurrency(25.50)).toBe('$25.50');
  });

  it('should format large amounts', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatDenomination', () => {
  it('should format whole numbers', () => {
    expect(formatDenomination(25)).toBe('$25.00');
  });

  it('should format decimal values', () => {
    expect(formatDenomination(25.50)).toBe('$25.50');
  });
});

describe('calculateProfitMargin', () => {
  it('should calculate profit margin correctly', () => {
    expect(calculateProfitMargin(100, 80)).toBe(20);
  });

  it('should return 0 for zero revenue', () => {
    expect(calculateProfitMargin(0, 50)).toBe(0);
  });

  it('should handle negative margin', () => {
    expect(calculateProfitMargin(100, 120)).toBe(-20);
  });
});

describe('formatProfitMargin', () => {
  it('should format profit margin with percentage', () => {
    expect(formatProfitMargin(100, 80)).toBe('20.0%');
  });
});

describe('isInventoryLow', () => {
  it('should return true when inventory is at threshold', () => {
    expect(isInventoryLow(10)).toBe(true);
  });

  it('should return true when inventory is below threshold', () => {
    expect(isInventoryLow(5)).toBe(true);
  });

  it('should return false when inventory is above threshold', () => {
    expect(isInventoryLow(50)).toBe(false);
  });

  it('should use custom threshold', () => {
    expect(isInventoryLow(15, 20)).toBe(true);
    expect(isInventoryLow(25, 20)).toBe(false);
  });

  it('should return true for zero inventory', () => {
    expect(isInventoryLow(0)).toBe(true);
  });
});

describe('getInventoryStatusColor', () => {
  it('should return red for zero inventory', () => {
    expect(getInventoryStatusColor(0)).toBe('red');
  });

  it('should return yellow for low inventory (1-10)', () => {
    expect(getInventoryStatusColor(5)).toBe('yellow');
    expect(getInventoryStatusColor(10)).toBe('yellow');
  });

  it('should return orange for medium inventory (11-50)', () => {
    expect(getInventoryStatusColor(25)).toBe('orange');
    expect(getInventoryStatusColor(50)).toBe('orange');
  });

  it('should return green for high inventory (51+)', () => {
    expect(getInventoryStatusColor(51)).toBe('green');
    expect(getInventoryStatusColor(100)).toBe('green');
  });
});

describe('formatBrandDenomination', () => {
  it('should combine brand name and denomination', () => {
    expect(formatBrandDenomination('Amazon', 25)).toBe('Amazon - $25.00');
  });
});

describe('generateUploadBatchId', () => {
  it('should generate a UUID format', () => {
    const batchId = generateUploadBatchId();
    // UUID format: 8-4-4-4-12
    expect(batchId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should generate unique IDs', () => {
    const id1 = generateUploadBatchId();
    const id2 = generateUploadBatchId();
    expect(id1).not.toBe(id2);
  });
});

describe('groupTransactionsByDate', () => {
  it('should group transactions by date', () => {
    const transactions = [
      { billed_at: '2024-12-18T10:00:00Z', amount_billed: 25 },
      { billed_at: '2024-12-18T14:00:00Z', amount_billed: 50 },
      { billed_at: '2024-12-17T10:00:00Z', amount_billed: 30 },
    ];

    const result = groupTransactionsByDate(transactions);

    expect(result).toHaveLength(2);
    expect(result.find(g => g.date === '2024-12-18')).toEqual({
      date: '2024-12-18',
      total: 75,
      count: 2,
    });
    expect(result.find(g => g.date === '2024-12-17')).toEqual({
      date: '2024-12-17',
      total: 30,
      count: 1,
    });
  });

  it('should handle empty array', () => {
    expect(groupTransactionsByDate([])).toEqual([]);
  });

  it('should sort by date ascending', () => {
    const transactions = [
      { billed_at: '2024-12-20T10:00:00Z', amount_billed: 25 },
      { billed_at: '2024-12-18T10:00:00Z', amount_billed: 50 },
    ];

    const result = groupTransactionsByDate(transactions);

    expect(result[0].date).toBe('2024-12-18');
    expect(result[1].date).toBe('2024-12-20');
  });
});

describe('getSourceBadgeColor', () => {
  it('should return blue for inventory source', () => {
    expect(getSourceBadgeColor('inventory')).toBe('blue');
  });

  it('should return purple for tillo source', () => {
    expect(getSourceBadgeColor('tillo')).toBe('purple');
  });
});

describe('formatSource', () => {
  it('should format inventory source', () => {
    expect(formatSource('inventory')).toBe('Uploaded Inventory');
  });

  it('should format tillo source', () => {
    expect(formatSource('tillo')).toBe('Tillo API');
  });
});
