/**
 * Tillo API Client
 * 
 * Provides integration with Tillo gift card provisioning API
 * - Card provisioning (purchasing)
 * - Balance checking
 * - Catalog fetching
 */

import { createHmac } from 'crypto';

export interface TilloConfig {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
}

export interface TilloCardResult {
  cardCode: string;
  cardNumber?: string;
  pin?: string;
  expirationDate?: string;
  transactionId: string;
  orderReference: string;
  barcode?: string;
  redemptionUrl?: string;
}

export interface TilloBalanceResult {
  balance: number;
  currency: string;
  status: string;
  lastChecked: Date;
}

export interface TilloBrand {
  brandCode: string;
  brandName: string;
  category: string;
  denominations: number[];
  currency: string;
  minValue?: number;
  maxValue?: number;
}

export interface TilloPricingInfo {
  brandCode: string;
  denomination: number;
  cost: number;
  currency: string;
  faceValue: number;
  discount?: number;
}

export class TilloClient {
  private config: TilloConfig;
  private baseUrl: string;

  constructor(config: TilloConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.tillo.tech/v2';
  }

  /**
   * Generate HMAC signature for Tillo API requests
   */
  private generateSignature(timestamp: number, body?: string): string {
    const payload = body ? `${timestamp}${body}` : `${timestamp}`;
    const hmac = createHmac('sha256', this.config.secretKey);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Make authenticated request to Tillo API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<T> {
    const timestamp = Date.now();
    const bodyString = body ? JSON.stringify(body) : undefined;
    const signature = this.generateSignature(timestamp, bodyString);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'API-Key': this.config.apiKey,
      'Signature': signature,
      'Timestamp': timestamp.toString(),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: bodyString,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Tillo API error (${response.status}): ${
          errorData.message || response.statusText
        }`
      );
    }

    const data = await response.json();

    // Check for Tillo-specific error codes
    if (data.code && data.code !== '000') {
      throw new Error(`Tillo API error: ${data.message || 'Unknown error'}`);
    }

    return data;
  }

  /**
   * Provision (purchase) a gift card
   * 
   * @param brandCode - Tillo brand code (e.g., 'starbucks', 'amazon')
   * @param denomination - Card value in dollars
   * @param currency - Currency code (default: 'USD')
   * @param reference - Optional reference for tracking
   */
  async provisionCard(
    brandCode: string,
    denomination: number,
    currency: string = 'USD',
    reference?: string
  ): Promise<TilloCardResult> {
    const orderRef = reference || `order-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const body = {
      brand: brandCode,
      face_value: {
        amount: denomination,
        currency: currency,
      },
      reference: orderRef,
    };

    try {
      const response = await this.request<any>('/orders', 'POST', body);

      // Extract card data from response
      const cardData = response.data || response;

      return {
        cardCode: cardData.code || cardData.url || cardData.redemption_url,
        cardNumber: cardData.card_number,
        pin: cardData.pin,
        expirationDate: cardData.expiration_date || cardData.expiry_date,
        transactionId: response.id || response.transaction_id,
        orderReference: orderRef,
        barcode: cardData.barcode?.string || cardData.barcode,
        redemptionUrl: cardData.url || cardData.redemption_url,
      };
    } catch (error) {
      throw new Error(`Failed to provision card: ${error.message}`);
    }
  }

  /**
   * Check balance of a gift card
   * 
   * @param cardCode - The gift card code to check
   * @param brandCode - Tillo brand code
   */
  async checkBalance(
    cardCode: string,
    brandCode: string
  ): Promise<TilloBalanceResult> {
    try {
      const body = {
        brand: brandCode,
        code: cardCode,
      };

      const response = await this.request<any>('/balance', 'POST', body);

      return {
        balance: response.data?.balance || response.balance || 0,
        currency: response.data?.currency || response.currency || 'USD',
        status: response.data?.status || response.status || 'unknown',
        lastChecked: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to check balance: ${error.message}`);
    }
  }

  /**
   * Get available brands catalog from Tillo
   * 
   * @param currency - Filter by currency (default: 'USD')
   */
  async getCatalog(currency: string = 'USD'): Promise<TilloBrand[]> {
    try {
      const response = await this.request<any>(`/brands?currency=${currency}`);

      const brands = response.data || response.brands || [];

      return brands.map((brand: any) => ({
        brandCode: brand.code || brand.brand_code,
        brandName: brand.name || brand.brand_name,
        category: brand.category || 'general',
        denominations: brand.denominations || brand.face_values || [],
        currency: brand.currency || currency,
        minValue: brand.min_value,
        maxValue: brand.max_value,
      }));
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
      // Return empty array if catalog fetch fails
      return [];
    }
  }

  /**
   * Get pricing information for a specific brand and denomination
   * 
   * @param brandCode - Tillo brand code
   * @param denomination - Card value
   * @param currency - Currency code (default: 'USD')
   */
  async getPricing(
    brandCode: string,
    denomination: number,
    currency: string = 'USD'
  ): Promise<TilloPricingInfo> {
    try {
      const body = {
        brand: brandCode,
        face_value: {
          amount: denomination,
          currency: currency,
        },
      };

      const response = await this.request<any>('/pricing', 'POST', body);

      const pricing = response.data || response;

      return {
        brandCode,
        denomination,
        cost: pricing.cost || pricing.total_cost || denomination,
        currency: pricing.currency || currency,
        faceValue: denomination,
        discount: pricing.discount,
      };
    } catch (error) {
      // If pricing endpoint fails, assume face value = cost
      console.warn(`Failed to get pricing for ${brandCode}: ${error.message}`);
      return {
        brandCode,
        denomination,
        cost: denomination,
        currency,
        faceValue: denomination,
      };
    }
  }

  /**
   * Bulk provision multiple cards
   * Useful for pre-loading buffer inventory
   * 
   * @param brandCode - Tillo brand code
   * @param denomination - Card value
   * @param quantity - Number of cards to provision
   * @param currency - Currency code (default: 'USD')
   */
  async bulkProvision(
    brandCode: string,
    denomination: number,
    quantity: number,
    currency: string = 'USD'
  ): Promise<TilloCardResult[]> {
    const cards: TilloCardResult[] = [];
    const errors: Error[] = [];

    // Provision cards sequentially to avoid rate limiting
    for (let i = 0; i < quantity; i++) {
      try {
        const card = await this.provisionCard(
          brandCode,
          denomination,
          currency,
          `bulk-${Date.now()}-${i}`
        );
        cards.push(card);
        
        // Small delay to avoid rate limiting
        if (i < quantity - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        errors.push(error);
        console.error(`Failed to provision card ${i + 1}/${quantity}:`, error);
      }
    }

    if (errors.length > 0 && cards.length === 0) {
      throw new Error(`Failed to provision any cards: ${errors[0].message}`);
    }

    if (errors.length > 0) {
      console.warn(`Provisioned ${cards.length}/${quantity} cards. ${errors.length} failed.`);
    }

    return cards;
  }
}

/**
 * Create a Tillo client instance from environment variables
 */
export function createTilloClientFromEnv(): TilloClient {
  const apiKey = process.env.TILLO_API_KEY || Deno.env.get('TILLO_API_KEY');
  const secretKey = process.env.TILLO_SECRET_KEY || Deno.env.get('TILLO_SECRET_KEY');
  const baseUrl = process.env.TILLO_BASE_URL || Deno.env.get('TILLO_BASE_URL');

  if (!apiKey || !secretKey) {
    throw new Error('TILLO_API_KEY and TILLO_SECRET_KEY environment variables are required');
  }

  return new TilloClient({
    apiKey,
    secretKey,
    baseUrl,
  });
}

/**
 * Singleton instance for edge functions
 */
let tilloClientInstance: TilloClient | null = null;

export function getTilloClient(): TilloClient {
  if (!tilloClientInstance) {
    tilloClientInstance = createTilloClientFromEnv();
  }
  return tilloClientInstance;
}

