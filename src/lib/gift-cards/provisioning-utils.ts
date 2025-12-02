/**
 * Gift Card Utility Functions
 * 
 * Helper functions for gift card formatting, validation, and business logic
 */

/**
 * Format card code for display (add spaces or dashes)
 */
export function formatCardCode(code: string, format: 'spaces' | 'dashes' = 'spaces'): string {
  if (!code) return '';
  
  // Remove existing spaces/dashes
  const cleaned = code.replace(/[\s-]/g, '');
  
  // Add formatting every 4 characters
  const separator = format === 'spaces' ? ' ' : '-';
  const formatted = cleaned.match(/.{1,4}/g)?.join(separator) || cleaned;
  
  return formatted;
}

/**
 * Validate card code format
 */
export function validateCardCode(code: string): boolean {
  if (!code) return false;
  
  // Remove spaces/dashes
  const cleaned = code.replace(/[\s-]/g, '');
  
  // Check if alphanumeric and reasonable length (8-20 chars)
  return /^[A-Z0-9]{8,20}$/i.test(cleaned);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
}

/**
 * Format denomination for display
 */
export function formatDenomination(denomination: number): string {
  return `$${denomination.toFixed(2)}`;
}

/**
 * Get billing entity for a campaign (client or agency)
 */
export async function getBillingEntity(
  campaignId: string
): Promise<{ type: 'client' | 'agency'; id: string; name: string }> {
  // This would typically call the database function
  // For now, return a placeholder
  throw new Error('Not implemented - should call get_billing_entity_for_campaign RPC');
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
}

/**
 * Format profit margin for display
 */
export function formatProfitMargin(revenue: number, cost: number): string {
  const margin = calculateProfitMargin(revenue, cost);
  return `${margin.toFixed(1)}%`;
}

/**
 * Determine if inventory is low
 */
export function isInventoryLow(available: number, threshold: number = 10): boolean {
  return available <= threshold;
}

/**
 * Get inventory status color
 */
export function getInventoryStatusColor(available: number): string {
  if (available === 0) return 'red';
  if (available <= 10) return 'yellow';
  if (available <= 50) return 'orange';
  return 'green';
}

/**
 * Format brand name with denomination
 */
export function formatBrandDenomination(brandName: string, denomination: number): string {
  return `${brandName} - ${formatDenomination(denomination)}`;
}

/**
 * Parse CSV file for gift card import
 */
export async function parseGiftCardCsv(file: File): Promise<{
  cards: Array<{
    cardCode: string;
    cardNumber?: string;
    expirationDate?: string;
  }>;
  errors: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const cards: any[] = [];
    const errors: string[] = [];

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',').map((p) => p.trim());
        
        if (parts.length < 1) {
          errors.push(`Line ${i + 1}: Invalid format`);
          continue;
        }

        const cardCode = parts[0];
        if (!validateCardCode(cardCode)) {
          errors.push(`Line ${i + 1}: Invalid card code format`);
          continue;
        }

        cards.push({
          cardCode: cardCode,
          cardNumber: parts[1] || undefined,
          expirationDate: parts[2] || undefined,
        });
      }

      resolve({ cards, errors });
    };

    reader.onerror = () => {
      errors.push('Failed to read file');
      resolve({ cards, errors });
    };

    reader.readAsText(file);
  });
}

/**
 * Generate unique upload batch ID
 */
export function generateUploadBatchId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Group transactions by date for charting
 */
export function groupTransactionsByDate(
  transactions: Array<{ billed_at: string; amount_billed: number }>
): Array<{ date: string; total: number; count: number }> {
  const groups: Record<string, { total: number; count: number }> = {};

  transactions.forEach((t) => {
    const date = new Date(t.billed_at).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = { total: 0, count: 0 };
    }
    groups[date].total += t.amount_billed;
    groups[date].count++;
  });

  return Object.entries(groups)
    .map(([date, { total, count }]) => ({ date, total, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get source badge color
 */
export function getSourceBadgeColor(source: 'inventory' | 'tillo'): string {
  return source === 'inventory' ? 'blue' : 'purple';
}

/**
 * Format source for display
 */
export function formatSource(source: 'inventory' | 'tillo'): string {
  return source === 'inventory' ? 'Uploaded Inventory' : 'Tillo API';
}

