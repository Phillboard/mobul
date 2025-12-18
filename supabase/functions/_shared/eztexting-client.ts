/**
 * Shared EZTexting SMS Client for Edge Functions
 * 
 * This is a Deno-compatible EZTexting client for sending SMS messages
 * via the EZTexting REST API v1 in Supabase Edge Functions.
 * 
 * API Documentation: https://www.eztexting.com/developers-v1
 * 
 * Features:
 * - Bearer token (API Key) authentication
 * - SMS sending via Messages API
 * - Message status retrieval
 * - Credit balance checking
 */

export interface EZTextingConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  errorCode?: number;
}

export interface EZTextingMessageResponse {
  id?: string;
  status?: string;
  message?: string;
  error?: string;
  errors?: Array<{ message: string; code?: string }>;
}

export interface EZTextingCreditsResponse {
  planCredits?: number;
  anytimeCredits?: number;
  totalCredits?: number;
  error?: string;
}

export class EZTextingClient {
  private config: EZTextingConfig;

  constructor(config: EZTextingConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://app.eztexting.com/api/v2',
    };
  }

  /**
   * Format phone number to E.164 format (+1XXXXXXXXXX)
   */
  private formatPhoneE164(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    if (phone.startsWith('+')) {
      return phone;
    }
    return `+${digits}`;
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
   * Make an authenticated API request using Bearer token (API Key)
   */
  private async apiRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<{ ok: boolean; status: number; data: T }> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    console.log(`[EZTEXTING] ${method} ${url}`);

    const response = await fetch(url, options);
    
    let data: T;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text } as T;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  }

  /**
   * Send an SMS message via EZTexting
   * 
   * Uses the Messages API: POST /sending/messages
   */
  async sendSMS(to: string, message: string): Promise<SendSMSResult> {
    try {
      const formattedTo = this.formatPhoneForEZTexting(to);
      
      console.log(`[EZTEXTING] Sending SMS to ${formattedTo}`);

      const response = await this.apiRequest<EZTextingMessageResponse>(
        'POST',
        '/sending/messages',
        {
          PhoneNumbers: [formattedTo],
          Message: message,
        }
      );

      console.log(`[EZTEXTING] Response status: ${response.status}`, response.data);

      if (!response.ok) {
        const errorMessage = response.data.error || 
                            response.data.message || 
                            response.data.errors?.[0]?.message ||
                            `EZTexting API error: ${response.status}`;

        console.error('[EZTEXTING] Error response:', response.data);

        return {
          success: false,
          error: errorMessage,
          errorCode: response.status,
        };
      }

      const messageId = response.data.id || `ez_${Date.now()}`;
      
      console.log(`[EZTEXTING] SMS sent successfully, ID: ${messageId}`);

      return {
        success: true,
        messageId: messageId,
        status: response.data.status || 'sent',
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
   * Get message delivery status
   * 
   * Uses: GET /sending/messages/{id}
   */
  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    try {
      const response = await this.apiRequest<EZTextingMessageResponse>(
        'GET',
        `/sending/messages/${messageId}`
      );

      if (!response.ok) {
        return {
          status: 'error',
          error: response.data.error || response.data.message || 'Failed to fetch status',
        };
      }

      return {
        status: response.data.status || 'unknown',
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get account credit balance
   * 
   * Uses: GET /credits
   */
  async getCreditBalance(): Promise<{ credits?: number; planCredits?: number; anytimeCredits?: number; error?: string }> {
    try {
      const response = await this.apiRequest<EZTextingCreditsResponse>(
        'GET',
        '/credits'
      );

      if (!response.ok) {
        return {
          error: response.data.error || 'Failed to fetch credit balance',
        };
      }

      return {
        credits: response.data.totalCredits,
        planCredits: response.data.planCredits,
        anytimeCredits: response.data.anytimeCredits,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate credentials by attempting a simple API call
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
        error: error instanceof Error ? error.message : 'Invalid API key',
      };
    }
  }

  /**
   * List contacts from a specific group
   * 
   * Uses: GET /contacts
   */
  async listContacts(groupId?: string, page: number = 1, perPage: number = 100): Promise<{
    contacts?: Array<{ id: string; phoneNumber: string; firstName?: string; lastName?: string }>;
    error?: string;
  }> {
    try {
      let endpoint = `/contacts?page=${page}&perPage=${perPage}`;
      if (groupId) {
        endpoint += `&groupId=${groupId}`;
      }

      const response = await this.apiRequest<{ items?: Array<unknown>; error?: string }>(
        'GET',
        endpoint
      );

      if (!response.ok) {
        return {
          error: response.data.error || 'Failed to fetch contacts',
        };
      }

      return {
        contacts: (response.data.items || []) as Array<{ id: string; phoneNumber: string; firstName?: string; lastName?: string }>,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create or update a contact
   * 
   * Uses: POST /contacts
   */
  async createContact(
    phoneNumber: string,
    firstName?: string,
    lastName?: string,
    groupIds?: string[]
  ): Promise<{ contactId?: string; error?: string }> {
    try {
      const formattedPhone = this.formatPhoneForEZTexting(phoneNumber);

      const response = await this.apiRequest<{ id?: string; error?: string }>(
        'POST',
        '/contacts',
        {
          PhoneNumber: formattedPhone,
          FirstName: firstName,
          LastName: lastName,
          GroupIds: groupIds,
        }
      );

      if (!response.ok) {
        return {
          error: response.data.error || 'Failed to create contact',
        };
      }

      return {
        contactId: response.data.id,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create an EZTexting client instance from environment variables
 */
export function createEZTextingClientFromEnv(): EZTextingClient {
  const apiKey = Deno.env.get('EZTEXTING_API_KEY');
  const baseUrl = Deno.env.get('EZTEXTING_BASE_URL');

  if (!apiKey) {
    throw new Error('EZTEXTING_API_KEY environment variable is required');
  }

  return new EZTextingClient({
    apiKey,
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
