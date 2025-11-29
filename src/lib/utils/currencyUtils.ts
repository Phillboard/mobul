/**
 * Currency Utility Functions
 * 
 * Centralized currency formatting and parsing utilities.
 * Ensures consistent currency display across the application.
 */

/**
 * Formats a number or string as USD currency
 * 
 * @param amount - The amount to format
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted currency string (e.g., "$1,234.56")
 * 
 * @example
 * formatCurrency(1234.5) // "$1,234.50"
 * formatCurrency("1234.5") // "$1,234.50"
 * formatCurrency(0) // "$0.00"
 */
export function formatCurrency(
  amount: number | string,
  options?: Intl.NumberFormatOptions
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(num);
}

/**
 * Formats cents (integer) as USD currency
 * Common for payment processing APIs that use cents
 * 
 * @param cents - Amount in cents
 * @returns Formatted currency string
 * 
 * @example
 * formatCents(12345) // "$123.45"
 */
export function formatCents(cents: number): string {
  return formatCurrency(cents / 100);
}

/**
 * Parses a currency string to a number
 * Removes currency symbols, commas, and spaces
 * 
 * @param currencyString - Currency string to parse
 * @returns Parsed number or 0 if invalid
 * 
 * @example
 * parseCurrency("$1,234.56") // 1234.56
 * parseCurrency("1234.56") // 1234.56
 * parseCurrency("invalid") // 0
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString) return 0;
  
  // Remove currency symbols, commas, and spaces
  const cleaned = currencyString.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

/**
 * Converts dollars to cents (for payment APIs)
 * 
 * @param dollars - Amount in dollars
 * @returns Amount in cents (integer)
 * 
 * @example
 * dollarsToCents(123.45) // 12345
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Formats a number as a compact currency string
 * Uses K, M, B suffixes for large numbers
 * 
 * @param amount - The amount to format
 * @returns Compact formatted string
 * 
 * @example
 * formatCompactCurrency(1234) // "$1.2K"
 * formatCompactCurrency(1234567) // "$1.2M"
 */
export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Formats a percentage value
 * 
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(25.5) // "25.5%"
 * formatPercentage(25.567, 2) // "25.57%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculates and formats a percentage
 * 
 * @param partial - The partial value
 * @param total - The total value
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 * 
 * @example
 * calculatePercentage(25, 100) // "25.0%"
 * calculatePercentage(1, 3, 2) // "33.33%"
 */
export function calculatePercentage(
  partial: number,
  total: number,
  decimals: number = 1
): string {
  if (total === 0) return '0.0%';
  const percent = (partial / total) * 100;
  return formatPercentage(percent, decimals);
}

/**
 * Calculates the final price after applying a markup percentage
 * 
 * @param basePrice - The base price before markup
 * @param markupPercent - The markup percentage to apply
 * @returns Final price after markup
 * 
 * @example
 * calculateMarkup(100, 20) // 120 (100 + 20%)
 * calculateMarkup(50, 10) // 55 (50 + 10%)
 */
export function calculateMarkup(basePrice: number, markupPercent: number): number {
  return basePrice + (basePrice * markupPercent / 100);
}

/**
 * Calculates profit from a sale
 * 
 * @param salePrice - Price sold at
 * @param costPrice - Cost to acquire
 * @param quantity - Number of units
 * @returns Total profit
 * 
 * @example
 * calculateProfit(120, 100, 1) // 20
 * calculateProfit(55, 50, 10) // 50 (total profit)
 */
export function calculateProfit(salePrice: number, costPrice: number, quantity: number): number {
  return (salePrice - costPrice) * quantity;
}
