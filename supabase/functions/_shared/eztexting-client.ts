/**
 * Shared EZTexting SMS Client for Edge Functions
 * 
 * This is a Deno-compatible EZTexting client for sending SMS messages
 * via the EZTexting Legacy HTTP API v1 in Supabase Edge Functions.
 * 
 * API Documentation: https://www.eztexting.com/developers/sms-api-documentation
 * 
 * Features:
 * - Legacy HTTP API authentication (username/password in form data)
 * - SMS sending via Messages API
 * - Message status retrieval
 * - Credit balance checking
 * 
 * Authentication:
 * - Uses form-urlencoded POST with User and Password parameters
 * - NO OAuth tokens or Bearer headers
 * - Credentials included in every request body
 */

export interface EZTextingConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  errorCode?: number;
}

export interface EZTextingResponse {
  Response?: {
    Status?: string;
    Code?: number;
    Errors?: string[];
    Entry?: {
      ID?: string;
      PhoneNumbers?: string[];
      LocalOptOuts?: string[];
      CarrierOptOuts?: string[];
      GlobalOptOuts?: string[];
      Subject?: string;
      Message?: string;
      MessageTypeID?: number;
      RecipientCount?: number;
      Credits?: number;
      StampToSend?: string;
    };
  };
  // Error format
  Error?: string;
  error?: string;
  message?: string;
}

export interface EZTextingCreditsResponse {
  Response?: {
    Status?: string;
    Code?: number;
    Entry?: {
      PlanCredits?: number;
      AnytimeCredits?: number;
      TotalCredits?: number;
    };
  };
}

export class EZTextingClient {
  private config: EZTextingConfig;

  constructor(config: EZTextingConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://app.eztexting.com',
    };
  }

  /**
   * Format phone number for EZTexting API (10 digits, no country code)
   * EZTexting expects phone numbers without the +1 prefix
   */
  private formatPhoneForEZTexting(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // Return last 10 digits
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  /**
   * Make an API request using Legacy HTTP API format
   * 
   * Legacy API uses:
   * - POST method
   * - Content-Type: application/x-www-form-urlencoded
   * - User and Password as form parameters
   * - ?format=json query parameter for JSON responses
   */
  private async apiRequest<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<{ ok: boolean; status: number; data: T }> {
    // Build URL with format=json
    const url = `${this.config.baseUrl}${endpoint}?format=json`;

    // Build form data with credentials
    const formData = new URLSearchParams({
      User: this.config.username,
      Password: this.config.password,
      ...params,
    });

    console.log(`[EZTEXTING] POST ${url}`);
    console.log(`[EZTEXTING] Form params (excluding password):`, {
      User: this.config.username,
      ...Object.fromEntries(
        Object.entries(params).filter(([key]) => key !== 'Password')
      ),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    console.log(`[EZTEXTING] Response status: ${response.status}`);

    let data: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.log(`[EZTEXTING] Non-JSON response:`, text.substring(0, 200));
      // Try to parse as JSON anyway (some responses don't set content-type correctly)
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text, error: text } as T;
      }
    }

    console.log(`[EZTEXTING] Response data:`, JSON.stringify(data).substring(0, 500));

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }

  /**
   * Send an SMS message via EZTexting Legacy HTTP API
   * 
   * Uses: POST /sending/messages?format=json
   * 
   * Required form parameters:
   * - User: EZTexting username
   * - Password: EZTexting password
   * - PhoneNumbers: Comma-separated 10-digit phone numbers
   * - Message: SMS text content
   */
  async sendSMS(to: string, message: string): Promise<SendSMSResult> {
    try {
      const formattedTo = this.formatPhoneForEZTexting(to);
      
      console.log(`[EZTEXTING] Sending SMS to ${formattedTo}`);

      const response = await this.apiRequest<EZTextingResponse>(
        '/sending/messages',
        {
          PhoneNumbers: formattedTo,
          Message: message,
          MessageTypeID: '1', // 1 = SMS
        }
      );

      // Check for API-level errors
      const responseData = response.data;
      
      // Legacy API returns Response.Status = "Success" or "Failure"
      if (responseData.Response?.Status === 'Success') {
        const messageId = responseData.Response.Entry?.ID || `ez_${Date.now()}`;
        
        console.log(`[EZTEXTING] SMS sent successfully, ID: ${messageId}`);

        return {
          success: true,
          messageId: messageId.toString(),
          status: 'sent',
        };
      }

      // Handle errors
      const errorMessage = 
        responseData.Response?.Errors?.join(', ') ||
        responseData.Error ||
        responseData.error ||
        responseData.message ||
        `EZTexting API error: ${response.status}`;

      console.error('[EZTEXTING] Error response:', responseData);

      return {
        success: false,
        error: errorMessage,
        errorCode: responseData.Response?.Code || response.status,
      };
    } catch (error) {
      console.error('[EZTEXTING] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   * 
   * @param phoneNumbers Array of phone numbers
   * @param message SMS text content
   */
  async sendSMSBulk(phoneNumbers: string[], message: string): Promise<SendSMSResult> {
    // Format all phone numbers and join with commas
    const formattedNumbers = phoneNumbers
      .map(phone => this.formatPhoneForEZTexting(phone))
      .join(',');
    
    return this.sendSMS(formattedNumbers, message);
  }

  /**
   * Get account credit balance
   * 
   * Uses: POST /billing/credits?format=json
   */
  async getCreditBalance(): Promise<{ 
    credits?: number; 
    planCredits?: number; 
    anytimeCredits?: number; 
    error?: string 
  }> {
    try {
      const response = await this.apiRequest<EZTextingCreditsResponse>(
        '/billing/credits',
        {}
      );

      if (response.data.Response?.Status === 'Success') {
        const entry = response.data.Response.Entry;
        return {
          credits: entry?.TotalCredits,
          planCredits: entry?.PlanCredits,
          anytimeCredits: entry?.AnytimeCredits,
        };
      }

      return {
        error: 'Failed to fetch credit balance',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate credentials by attempting to get credit balance
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const result = await this.getCreditBalance();
      if (result.error) {
        return { valid: false, error: result.error };
      }
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid credentials',
      };
    }
  }

  /**
   * Get message delivery report
   * 
   * Uses: POST /sending/reports?format=json
   */
  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    try {
      const response = await this.apiRequest<EZTextingResponse>(
        '/sending/reports',
        {
          ID: messageId,
        }
      );

      if (response.data.Response?.Status === 'Success') {
        return {
          status: 'delivered',
        };
      }

      return {
        status: 'unknown',
        error: response.data.Response?.Errors?.join(', '),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create an EZTexting client instance from environment variables
 */
export function createEZTextingClientFromEnv(): EZTextingClient {
  const username = Deno.env.get('EZTEXTING_USERNAME');
  const password = Deno.env.get('EZTEXTING_PASSWORD');
  const baseUrl = Deno.env.get('EZTEXTING_BASE_URL');

  if (!username || !password) {
    throw new Error('EZTEXTING_USERNAME and EZTEXTING_PASSWORD environment variables are required');
  }

  return new EZTextingClient({
    username,
    password,
    baseUrl,
  });
}

/**
 * Singleton instance for edge functions
 */
let eztextingClientInstance: EZTextingClient | null = null;

export function getEZTextingClient(): EZTextingClient {
  if (!eztextingClientInstance) {
    eztextingClientInstance = createEZTextingClientFromEnv();
  }
  return eztextingClientInstance;
}

/**
 * Reset singleton (useful for testing or config changes)
 */
export function resetEZTextingClient(): void {
  eztextingClientInstance = null;
}
