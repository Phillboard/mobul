/**
 * Gift Card Utility Functions
 * Centralized utilities for gift card health, status, and calculations
 */

export type PoolHealth = 'healthy' | 'warning' | 'critical';

/**
 * Get health status color for pool
 */
export function getHealthColor(health: string | undefined): string {
  switch (health) {
    case 'healthy':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Calculate pool health based on available cards
 */
export function calculatePoolHealth(
  availableCards: number,
  totalCards: number,
  lowStockThreshold?: number
): PoolHealth {
  if (totalCards === 0) return 'critical';

  const percentAvailable = (availableCards / totalCards) * 100;
  const threshold = lowStockThreshold || 20;

  if (percentAvailable <= 5) return 'critical';
  if (percentAvailable <= threshold) return 'warning';
  return 'healthy';
}

/**
 * Calculate pool utilization percentage
 */
export function calculateUtilization(
  availableCards: number,
  totalCards: number
): number {
  if (totalCards === 0) return 0;
  return Math.round(((totalCards - availableCards) / totalCards) * 100);
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(
  salePrice: number,
  costPrice: number
): number {
  if (costPrice === 0) return 0;
  return Math.round(((salePrice - costPrice) / costPrice) * 100);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Mask gift card code for security
 * Shows first 4 and last 4 characters
 * 
 * @deprecated Use maskCardCode from @/lib/giftCardUtils instead
 */
export function maskCardCode(code: string): string {
  // Re-export from centralized utility
  // This is a deprecated function - use maskCardCode from @/lib/giftCardUtils directly
  if (code.length <= 8) return code;
  return `${code.slice(0, 4)}****${code.slice(-4)}`;
}

/**
 * Get status badge variant
 */
export function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'success' | 'destructive' | 'warning' {
  switch (status?.toLowerCase()) {
    case 'available':
    case 'active':
    case 'completed':
    case 'delivered':
      return 'success';
    case 'claimed':
    case 'pending':
    case 'processing':
      return 'warning';
    case 'redeemed':
    case 'used':
      return 'secondary';
    case 'failed':
    case 'expired':
    case 'cancelled':
      return 'destructive';
    default:
      return 'default';
  }
}
