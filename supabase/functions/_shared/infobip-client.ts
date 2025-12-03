/**
 * Shared Infobip SMS Client for Edge Functions
 * 
 * This is a Deno-compatible Infobip client for sending SMS messages
 * via the Infobip API in Supabase Edge Functions.
 * 
 * API Documentation: https://www.infobip.com/docs/api
 */

export interface InfobipConfig {
  apiKey: string;
  baseUrl: string;
  senderId?: string;
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  status?: string;
  groupId?: string;
  error?: string;
  errorCode?: number;
}

export interface InfobipMessageStatus {
  groupId: number;
  groupName: string;
  id: number;
  name: string;
  description: string;
}

export interface InfobipSendResponse {
  messages: Array<{
    messageId: string;
    status: InfobipMessageStatus;
    to: string;
  }>;
}

export class InfobipClient {
  private config: InfobipConfig;

  constructor(config: InfobipConfig) {
    this.config = config;
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
   * Send an SMS message via Infobip
   * 
   * Uses the SMS API v2 endpoint:
   * POST /sms/2/text/advanced
   */
  async sendSMS(to: string, message: string): Promise<SendSMSResult> {
    try {
      const formattedTo = this.formatPhoneE164(to);
      
      console.log(`[INFOBIP] Sending SMS to ${formattedTo}`);

      // Infobip API endpoint for advanced SMS
      const url = `${this.config.baseUrl}/sms/2/text/advanced`;

      // Build request payload
      const payload = {
        messages: [
          {
            destinations: [{ to: formattedTo }],
            from: this.config.senderId || 'InfoSMS',
            text: message,
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `App ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as InfobipSendResponse;

      if (!response.ok) {
        console.error('[INFOBIP] Error response:', data);
        const errorData = data as any;
        return {
          success: false,
          error: errorData.requestError?.serviceException?.text || 
                 errorData.requestError?.serviceException?.messageId ||
                 `Infobip API error: ${response.status}`,
          errorCode: errorData.requestError?.serviceException?.id,
        };
      }

      // Check if message was accepted
      if (data.messages && data.messages.length > 0) {
        const messageResult = data.messages[0];
        const status = messageResult.status;

        // Infobip status groups:
        // 1 = PENDING, 2 = UNDELIVERABLE, 3 = DELIVERED, 4 = EXPIRED, 5 = REJECTED
        const isSuccess = status.groupId === 1 || status.groupId === 3;

        if (isSuccess) {
          console.log(`[INFOBIP] SMS sent successfully, ID: ${messageResult.messageId}, Status: ${status.name}`);
          return {
            success: true,
            messageId: messageResult.messageId,
            status: status.name,
            groupId: status.groupId.toString(),
          };
        } else {
          console.error(`[INFOBIP] SMS rejected: ${status.description}`);
          return {
            success: false,
            messageId: messageResult.messageId,
            error: status.description || status.name,
            errorCode: status.id,
          };
        }
      }

      // Unexpected response format
      console.error('[INFOBIP] Unexpected response format:', data);
      return {
        success: false,
        error: 'Unexpected response format from Infobip',
      };
    } catch (error) {
      console.error('[INFOBIP] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get delivery report for a message
   * 
   * Uses the SMS API v1 endpoint:
   * GET /sms/1/reports
   */
  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/sms/1/reports?messageId=${messageId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `App ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          status: 'error',
          error: data.requestError?.serviceException?.text || 'Failed to fetch status',
        };
      }

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          status: result.status?.name || 'unknown',
        };
      }

      return {
        status: 'pending',
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check account balance (useful for monitoring)
   */
  async getAccountBalance(): Promise<{ balance?: number; currency?: string; error?: string }> {
    try {
      const url = `${this.config.baseUrl}/account/1/balance`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `App ${this.config.apiKey}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.requestError?.serviceException?.text || 'Failed to fetch balance',
        };
      }

      return {
        balance: data.balance,
        currency: data.currency,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create an Infobip client instance from environment variables
 */
export function createInfobipClientFromEnv(): InfobipClient {
  const apiKey = Deno.env.get('INFOBIP_API_KEY');
  const baseUrl = Deno.env.get('INFOBIP_BASE_URL') || 'https://api.infobip.com';
  const senderId = Deno.env.get('INFOBIP_SENDER_ID');

  if (!apiKey) {
    throw new Error('INFOBIP_API_KEY environment variable is required');
  }

  return new InfobipClient({
    apiKey,
    baseUrl,
    senderId,
  });
}

/**
 * Singleton instance for edge functions
 */
let infobipClientInstance: InfobipClient | null = null;

export function getInfobipClient(): InfobipClient {
  if (!infobipClientInstance) {
    infobipClientInstance = createInfobipClientFromEnv();
  }
  return infobipClientInstance;
}

/**
 * Reset singleton (useful for testing or config changes)
 */
export function resetInfobipClient(): void {
  infobipClientInstance = null;
}

