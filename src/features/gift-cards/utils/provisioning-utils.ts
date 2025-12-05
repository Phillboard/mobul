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
  const { data, error } = await supabase.rpc('get_billing_entity_for_campaign', {
    p_campaign_id: campaignId,
  });

  if (error || !data || data.length === 0) {
    throw new Error(`No billing entity found for campaign: ${campaignId}`);
  }

  return {
    type: data[0].entity_type,
    id: data[0].entity_id,
    name: data[0].entity_name,
  };
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
 * Generate unique upload batch ID as UUID
 */
export function generateUploadBatchId(): string {
  return crypto.randomUUID();
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

/**
 * ========================================
 * PROVISIONING WATERFALL LOGIC
 * CSV Inventory First → Tillo API Fallback
 * ========================================
 */

import { supabase } from '@core/services/supabase';

export interface ProvisionResult {
  success: boolean;
  source: 'csv' | 'tillo';
  card?: {
    id: string;
    card_code: string;
    card_number?: string;
    denomination: number;
  };
  cost_basis?: number;
  client_price?: number;
  error?: string;
}

/**
 * Provision a gift card using CSV-first waterfall
 * Step 1: Try to claim from CSV inventory
 * Step 2: If no CSV available, purchase from Tillo API
 */
export async function provisionGiftCard(
  brandId: string,
  denomination: number,
  recipientId: string,
  campaignId: string
): Promise<ProvisionResult> {
  try {
    // Step 1: Try CSV inventory first
    const csvResult = await claimFromCSVInventory(brandId, denomination, recipientId, campaignId);
    if (csvResult.success) {
      return csvResult;
    }

    // Step 2: Fallback to Tillo API
    const tilloResult = await purchaseFromTillo(brandId, denomination, recipientId, campaignId);
    return tilloResult;

  } catch (error) {
    console.error('Provisioning failed:', error);
    return {
      success: false,
      source: 'csv',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Claim a gift card from CSV inventory
 */
async function claimFromCSVInventory(
  brandId: string,
  denomination: number,
  recipientId: string,
  campaignId: string
): Promise<ProvisionResult> {
  try {
    // Find and claim an available card atomically
    const { data: card, error: claimError } = await supabase.rpc('claim_gift_card_from_inventory', {
      p_brand_id: brandId,
      p_denomination: denomination,
      p_recipient_id: recipientId,
      p_campaign_id: campaignId,
    });

    if (claimError) {
      console.log('No CSV inventory available:', claimError.message);
      return { success: false, source: 'csv', error: 'No CSV inventory available' };
    }

    if (!card) {
      return { success: false, source: 'csv', error: 'No cards available' };
    }

    // Get pricing for billing
    const { data: pricing } = await supabase
      .from('gift_card_denominations')
      .select('client_price, use_custom_pricing, cost_basis')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .single();

    const clientPrice = pricing?.use_custom_pricing && pricing?.client_price 
      ? pricing.client_price 
      : denomination;

    return {
      success: true,
      source: 'csv',
      card: {
        id: card.id,
        card_code: card.card_code,
        card_number: card.card_number,
        denomination,
      },
      cost_basis: pricing?.cost_basis || 0,
      client_price: clientPrice,
    };
  } catch (error) {
    console.error('CSV claim error:', error);
    return {
      success: false,
      source: 'csv',
      error: error instanceof Error ? error.message : 'Failed to claim from CSV',
    };
  }
}

/**
 * Purchase a gift card from Tillo API
 */
async function purchaseFromTillo(
  brandId: string,
  denomination: number,
  recipientId: string,
  campaignId: string
): Promise<ProvisionResult> {
  try {
    // Get brand information
    const { data: brand, error: brandError } = await supabase
      .from('gift_card_brands')
      .select('brand_code, tillo_brand_code')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return {
        success: false,
        source: 'tillo',
        error: 'Brand not found',
      };
    }

    // Call Tillo purchase edge function
    const { data, error } = await supabase.functions.invoke('purchase-from-tillo', {
      body: {
        brandCode: brand.tillo_brand_code || brand.brand_code,
        denomination,
        recipientId,
        campaignId,
      },
    });

    if (error) {
      console.error('Tillo purchase error:', error);
      return {
        success: false,
        source: 'tillo',
        error: error.message || 'Tillo API unavailable',
      };
    }

    // Get pricing
    const { data: pricing } = await supabase
      .from('gift_card_denominations')
      .select('client_price, use_custom_pricing, tillo_cost_per_card')
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .single();

    const clientPrice = pricing?.use_custom_pricing && pricing?.client_price 
      ? pricing.client_price 
      : denomination;

    return {
      success: true,
      source: 'tillo',
      card: data.card,
      cost_basis: pricing?.tillo_cost_per_card || denomination, // Tillo cost or face value
      client_price: clientPrice,
    };
  } catch (error) {
    console.error('Tillo purchase error:', error);
    return {
      success: false,
      source: 'tillo',
      error: error instanceof Error ? error.message : 'Tillo purchase failed',
    };
  }
}

/**
 * Check if CSV inventory is available for a brand-denomination
 */
export async function checkCSVInventoryAvailable(
  brandId: string,
  denomination: number
): Promise<{ available: boolean; count: number }> {
  try {
    const { count, error } = await supabase
      .from('gift_card_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('denomination', denomination)
      .eq('status', 'available');

    if (error) throw error;

    return {
      available: (count || 0) > 0,
      count: count || 0,
    };
  } catch (error) {
    console.error('Error checking CSV inventory:', error);
    return { available: false, count: 0 };
  }
}

/**
 * Get available sources for a brand-denomination
 */
export async function getAvailableSources(
  brandId: string,
  denomination: number
): Promise<{ csv: boolean; tillo: boolean; csvCount: number }> {
  const csvCheck = await checkCSVInventoryAvailable(brandId, denomination);

  // Check if Tillo is configured for this brand
  const { data: brand } = await supabase
    .from('gift_card_brands')
    .select('provider, tillo_brand_code')
    .eq('id', brandId)
    .single();

  const tilloAvailable = brand?.provider === 'tillo' || !!brand?.tillo_brand_code;

  return {
    csv: csvCheck.available,
    tillo: tilloAvailable,
    csvCount: csvCheck.count,
  };
}

