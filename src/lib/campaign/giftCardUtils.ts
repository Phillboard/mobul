/**
 * Gift Card Utility Functions
 * 
 * Shared business logic and helper functions for gift card operations.
 * Used across components to maintain consistency and reduce duplication.
 */

import { GiftCardStatus, PoolStats, GiftCardPool } from "@/types/giftCards";

/**
 * Masks a card code or number for security purposes
 * Shows only the last 4 characters, replaces the rest with bullets
 * 
 * @param code - The full card code or number
 * @returns Masked string (e.g., "••••••••1234")
 * 
 * @example
 * maskCardCode("1234567890123456") // "••••••••••••3456"
 */
export function maskCardCode(code: string): string {
  if (!code) return '';
  if (code.length <= 4) return code;
  return '•'.repeat(code.length - 4) + code.slice(-4);
}

/**
 * Returns the appropriate Badge variant for a gift card status
 * 
 * @param status - The card status
 * @returns Shadcn Badge variant name
 */
export function getStatusBadgeVariant(
  status: GiftCardStatus | string
): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    available: "default",
    claimed: "secondary",
    delivered: "outline",
    failed: "destructive",
  };
  return variants[status] || "default";
}

/**
 * Calculates profit from a sale
 * 
 * @param salePrice - Price per card sold to client
 * @param costPrice - Cost per card from inventory
 * @param quantity - Number of cards sold
 * @returns Total profit amount
 * 
 * @example
 * calculateProfit(25, 20, 100) // 500
 */
export function calculateProfit(
  salePrice: number,
  costPrice: number,
  quantity: number
): number {
  return (salePrice - costPrice) * quantity;
}

/**
 * Calculates profit margin percentage
 * 
 * @param salePrice - Price per card sold
 * @param costPrice - Cost per card from inventory
 * @returns Profit margin as percentage (0-100)
 * 
 * @example
 * calculateProfitMargin(25, 20) // 20 (meaning 20%)
 */
export function calculateProfitMargin(
  salePrice: number,
  costPrice: number
): number {
  if (salePrice === 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
}

/**
 * Validates if a pool has sufficient cards for requested quantity
 * 
 * @param pool - The gift card pool
 * @param requestedQty - Number of cards requested
 * @returns Object with isValid boolean and optional error message
 */
export function validatePoolQuantity(
  pool: GiftCardPool,
  requestedQty: number
): { isValid: boolean; error?: string } {
  if (requestedQty <= 0) {
    return { isValid: false, error: 'Quantity must be greater than 0' };
  }

  const available = pool.available_cards || 0;
  if (requestedQty > available) {
    return { 
      isValid: false, 
      error: `Only ${available} cards available (requested ${requestedQty})` 
    };
  }

  const minQty = pool.min_purchase_quantity || 1;
  if (requestedQty < minQty) {
    return { 
      isValid: false, 
      error: `Minimum purchase quantity is ${minQty}` 
    };
  }

  return { isValid: true };
}

/**
 * Calculates statistics for a gift card pool
 * 
 * @param pool - The gift card pool
 * @returns Statistics object with computed values
 */
export function calculatePoolStats(pool: GiftCardPool): PoolStats {
  const cardValue = Number(pool.card_value);
  const totalCards = pool.total_cards || 0;
  const availableCards = pool.available_cards || 0;
  const claimedCards = pool.claimed_cards || 0;
  const deliveredCards = pool.delivered_cards || 0;
  const failedCards = pool.failed_cards || 0;

  const totalValue = totalCards * cardValue;
  const availableValue = availableCards * cardValue;
  const utilizationPercent = totalCards > 0 
    ? (claimedCards / totalCards) * 100 
    : 0;

  return {
    totalCards,
    availableCards,
    claimedCards,
    deliveredCards,
    failedCards,
    totalValue,
    availableValue,
    utilizationPercent,
  };
}

/**
 * Checks if a pool is running low on inventory
 * 
 * @param pool - The gift card pool
 * @returns True if below threshold
 */
export function isPoolLowStock(pool: GiftCardPool): boolean {
  const threshold = pool.low_stock_threshold || 10;
  const available = pool.available_cards || 0;
  return available <= threshold;
}

/**
 * Formats balance check frequency from hours to human-readable string
 * 
 * @param hours - Frequency in hours
 * @returns Human-readable string (e.g., "Weekly", "Daily", "Every 168 hours")
 */
export function formatCheckFrequency(hours: number): string {
  if (hours === 24) return 'Daily';
  if (hours === 168) return 'Weekly';
  if (hours === 720) return 'Monthly';
  if (hours % 24 === 0) return `Every ${hours / 24} days`;
  return `Every ${hours} hours`;
}

/**
 * Determines if a balance check should be performed
 * Based on auto-check settings and last check timestamp
 * 
 * @param pool - The gift card pool
 * @returns True if check should be performed
 */
export function shouldPerformBalanceCheck(pool: GiftCardPool): boolean {
  if (!pool.auto_balance_check) return false;
  if (!pool.last_auto_balance_check) return true;

  const lastCheck = new Date(pool.last_auto_balance_check);
  const frequencyMs = (pool.balance_check_frequency_hours || 168) * 60 * 60 * 1000;
  const nextCheck = new Date(lastCheck.getTime() + frequencyMs);

  return new Date() >= nextCheck;
}

/**
 * Sorts pools by brand name for consistent display
 * 
 * @param pools - Array of pools with brand information
 * @returns Sorted array
 */
export function sortPoolsByBrand<T extends { gift_card_brands?: { brand_name: string } }>(
  pools: T[]
): T[] {
  return [...pools].sort((a, b) => {
    const brandA = a.gift_card_brands?.brand_name || '';
    const brandB = b.gift_card_brands?.brand_name || '';
    return brandA.localeCompare(brandB);
  });
}

/**
 * Groups pools by brand for organized display
 * 
 * @param pools - Array of pools with brand information
 * @returns Object with brand names as keys and pool arrays as values
 */
export function groupPoolsByBrand<T extends { gift_card_brands?: { brand_name: string } }>(
  pools: T[]
): Record<string, T[]> {
  return pools.reduce((acc, pool) => {
    const brandName = pool.gift_card_brands?.brand_name || 'Other';
    if (!acc[brandName]) {
      acc[brandName] = [];
    }
    acc[brandName].push(pool);
    return acc;
  }, {} as Record<string, T[]>);
}
