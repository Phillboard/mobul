/**
 * Shared NotificationAPI SMS Client for Edge Functions
 * 
 * This is a Deno-compatible NotificationAPI client for sending SMS messages
 * via the NotificationAPI platform in Supabase Edge Functions.
 * 
 * NotificationAPI is a notification orchestration platform that supports
 * SMS, Email, Push, and other channels.
 * 
 * API Documentation: https://docs.notificationapi.com
 */

export interface NotificationAPIConfig {
  clientId: string;
  clientSecret: string;
  notificationId?: string; // Optional template ID
}

export interface SendSMSResult {
  success: boolean;
  trackingId?: string;
  status?: string;
  error?: string;
  errorCode?: string;
}

export interface NotificationAPIResponse {
  id?: string;
  trackingId?: string;
  status?: string;
  message?: string;
  error?: string;
  errors?: Array<{ message: string; code?: string }>;
}

export class NotificationAPIClient {
  private config: NotificationAPIConfig;
  private baseUrl: string = 'https://api.notificationapi.com';

  constructor(config: NotificationAPIConfig) {
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
   * Create Basic Auth header from client credentials
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.clientId}:${this.config.clientSecret}`;
    return `Basic ${btoa(credentials)}`;
  }

  /**
   * Generate a unique user ID for NotificationAPI
   * NotificationAPI requires a user ID for tracking
   */
  private generateUserId(phone: string): string {
    // Use phone number as user ID (without special chars)
    return `sms_${phone.replace(/\D/g, '')}_${Date.now()}`;
  }

  /**
   * Send an SMS message via NotificationAPI
   * 
   * NotificationAPI supports two modes:
   * 1. Template-based: Uses a pre-defined notification template
   * 2. Direct message: Sends the message content directly
   * 
   * We use the direct message approach with mergeTags for flexibility
   */
  async sendSMS(to: string, message: string, notificationId?: string): Promise<SendSMSResult> {
    try {
      const formattedTo = this.formatPhoneE164(to);
      const userId = this.generateUserId(formattedTo);
      const templateId = notificationId || this.config.notificationId || 'sms_direct';
      
      console.log(`[NOTIFICATIONAPI] Sending SMS to ${formattedTo}`);

      // NotificationAPI send endpoint
      const url = `${this.baseUrl}/${this.config.clientId}/sender`;

      // Build request payload
      // NotificationAPI uses a notification template system
      // The message is passed via mergeTags
      const payload = {
        notificationId: templateId,
        user: {
          id: userId,
          number: formattedTo,
        },
        mergeTags: {
          message: message,
          content: message,
          body: message,
          sms_body: message,
        },
        // Force SMS channel
        forceChannels: ['SMS'],
      };

      console.log(`[NOTIFICATIONAPI] Request to ${url} with notificationId: ${templateId}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: NotificationAPIResponse;
      
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }

      console.log(`[NOTIFICATIONAPI] Response status: ${response.status}`);
      console.log(`[NOTIFICATIONAPI] Response body:`, data);

      if (!response.ok) {
        console.error('[NOTIFICATIONAPI] Error response:', data);
        
        const errorMessage = data.error || 
                            data.message || 
                            data.errors?.[0]?.message ||
                            `NotificationAPI error: ${response.status}`;
        
        return {
          success: false,
          error: errorMessage,
          errorCode: data.errors?.[0]?.code || response.status.toString(),
        };
      }

      // Success response
      const trackingId = data.trackingId || data.id || `napi_${Date.now()}`;
      
      console.log(`[NOTIFICATIONAPI] SMS sent successfully, Tracking ID: ${trackingId}`);

      return {
        success: true,
        trackingId: trackingId,
        status: data.status || 'sent',
      };
    } catch (error) {
      console.error('[NOTIFICATIONAPI] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS using a specific notification template
   */
  async sendTemplatedSMS(
    to: string, 
    notificationId: string, 
    mergeTags: Record<string, string>
  ): Promise<SendSMSResult> {
    try {
      const formattedTo = this.formatPhoneE164(to);
      const userId = this.generateUserId(formattedTo);
      
      console.log(`[NOTIFICATIONAPI] Sending templated SMS to ${formattedTo}`);

      const url = `${this.baseUrl}/${this.config.clientId}/sender`;

      const payload = {
        notificationId: notificationId,
        user: {
          id: userId,
          number: formattedTo,
        },
        mergeTags: mergeTags,
        forceChannels: ['SMS'],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as NotificationAPIResponse;

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `API error: ${response.status}`,
          errorCode: response.status.toString(),
        };
      }

      return {
        success: true,
        trackingId: data.trackingId || data.id,
        status: data.status || 'sent',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if the API credentials are valid
   */
  async validateCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to fetch account info or make a test request
      const url = `${this.baseUrl}/${this.config.clientId}/notifications`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (response.ok || response.status === 200) {
        return { valid: true };
      }

      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid credentials' };
      }

      return { valid: true }; // Assume valid if we get other responses
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Connection error',
      };
    }
  }
}

/**
 * Create a NotificationAPI client instance from environment variables
 */
export function createNotificationAPIClientFromEnv(): NotificationAPIClient {
  const clientId = Deno.env.get('NOTIFICATIONAPI_CLIENT_ID');
  const clientSecret = Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET');
  const notificationId = Deno.env.get('NOTIFICATIONAPI_NOTIFICATION_ID');

  if (!clientId || !clientSecret) {
    throw new Error('NOTIFICATIONAPI_CLIENT_ID and NOTIFICATIONAPI_CLIENT_SECRET environment variables are required');
  }

  return new NotificationAPIClient({
    clientId,
    clientSecret,
    notificationId,
  });
}

/**
 * Singleton instance for edge functions
 */
let notificationAPIClientInstance: NotificationAPIClient | null = null;

export function getNotificationAPIClient(): NotificationAPIClient {
  if (!notificationAPIClientInstance) {
    notificationAPIClientInstance = createNotificationAPIClientFromEnv();
  }
  return notificationAPIClientInstance;
}

/**
 * Reset singleton (useful for testing or config changes)
 */
export function resetNotificationAPIClient(): void {
  notificationAPIClientInstance = null;
}

