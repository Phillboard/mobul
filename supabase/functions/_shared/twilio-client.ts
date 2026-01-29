/**
 * Shared Twilio SMS Client for Edge Functions
 * 
 * This is a Deno-compatible Twilio client for sending SMS messages
 * via the Twilio API in Supabase Edge Functions.
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SendSMSResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
}

export class TwilioClient {
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
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
    if (digits.startsWith('+')) {
      return phone;
    }
    return `+${digits}`;
  }

  /**
   * Send an SMS message via Twilio
   */
  async sendSMS(to: string, message: string): Promise<SendSMSResult> {
    try {
      const formattedTo = this.formatPhoneE164(to);
      
      console.log(`[TWILIO] Sending SMS to ${formattedTo}`);

      // Create Basic Auth header
      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);

      // Twilio REST API endpoint
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: this.config.fromNumber,
          Body: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[TWILIO] Error response:', data);
        return {
          success: false,
          error: data.message || `Twilio API error: ${response.status}`,
        };
      }

      console.log(`[TWILIO] SMS sent successfully, SID: ${data.sid}`);

      return {
        success: true,
        messageSid: data.sid,
        status: data.status,
      };
    } catch (error) {
      console.error('[TWILIO] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get message status from Twilio
   */
  async getMessageStatus(messageSid: string): Promise<{ status: string; error?: string }> {
    try {
      const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages/${messageSid}.json`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          status: 'error',
          error: data.message || 'Failed to fetch status',
        };
      }

      return {
        status: data.status,
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
 * @deprecated DO NOT USE - Environment variable Twilio is deprecated.
 * Use hierarchical resolution via resolveTwilioCredentials() from twilio-hierarchy.ts instead.
 * This ensures SMS is sent from the correct configured phone number (Client -> Agency -> Admin).
 */
export function createTwilioClientFromEnv(): TwilioClient {
  throw new Error(
    'createTwilioClientFromEnv() is deprecated. ' +
    'Use hierarchical Twilio resolution via resolveTwilioCredentials() instead. ' +
    'Environment variable Twilio has been disabled to prevent sending from wrong phone numbers.'
  );
}

/**
 * @deprecated DO NOT USE - Environment variable Twilio is deprecated.
 * Use hierarchical resolution via resolveTwilioCredentials() from twilio-hierarchy.ts instead.
 * This ensures SMS is sent from the correct configured phone number (Client -> Agency -> Admin).
 */
export function getTwilioClient(): TwilioClient {
  throw new Error(
    'getTwilioClient() is deprecated. ' +
    'Use hierarchical Twilio resolution via resolveTwilioCredentials() instead. ' +
    'Environment variable Twilio has been disabled to prevent sending from wrong phone numbers.'
  );
}

