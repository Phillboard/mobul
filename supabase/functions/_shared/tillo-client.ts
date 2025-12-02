/**
 * Shared Tillo API Client for Edge Functions
 * 
 * This is a Deno-compatible version of the Tillo client
 * for use in Supabase Edge Functions
 */

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
  private async generateSignature(timestamp: number, body?: string): Promise<string> {
    const payload = body ? `${timestamp}${body}` : `${timestamp}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.config.secretKey);
    const messageData = encoder.encode(payload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    const signature = await this.generateSignature(timestamp, bodyString);

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
   */
  async checkBalance(
    cardCode: string,
    brandCode: string
  ): Promise<{ balance: number; currency: string; status: string }> {
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
      };
    } catch (error) {
      throw new Error(`Failed to check balance: ${error.message}`);
    }
  }
}

/**
 * Create a Tillo client instance from environment variables
 */
export function createTilloClientFromEnv(): TilloClient {
  const apiKey = Deno.env.get('TILLO_API_KEY');
  const secretKey = Deno.env.get('TILLO_SECRET_KEY');
  const baseUrl = Deno.env.get('TILLO_BASE_URL');

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

