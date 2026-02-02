/**
 * Test SMS Provider Edge Function
 * 
 * Admin diagnostics tool for testing SMS provider configuration and delivery.
 * Uses shared sms-provider for consistent behavior.
 * 
 * Modes:
 * - status: Returns provider configuration status
 * - send: Sends test SMS and returns detailed results
 */

import { withApiGateway, ApiError } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { sendSMS, getCurrentProviderConfig, formatPhoneE164 } from '../_shared/sms-provider.ts';
import { getEZTextingClient } from '../_shared/eztexting-client.ts';

// Phone validation regex
const PHONE_REGEX = /^\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}$/;

interface TestSMSRequest {
  mode?: 'status' | 'send';
  phone?: string;
  message?: string;
  provider?: string;
}

interface ProviderStatus {
  available: boolean;
  active: boolean;
  role: string;
  credits?: number;
}

interface StatusResponse {
  success: true;
  providers: Record<string, ProviderStatus>;
  primaryProvider: string;
  fallbackChain: string[];
  fallbackEnabled: boolean;
  activeProvider: string;
}

interface SendResponse {
  success: boolean;
  provider: string;
  messageId?: string;
  status?: string;
  error?: string;
  fallbackUsed: boolean;
  attempts?: Array<{ provider: string; success: boolean; error?: string }>;
  formattedPhone: string;
  duration: number;
}

type TestSMSResponse = StatusResponse | SendResponse;

function getProviderRole(
  provider: string,
  primaryProvider: string,
  fallbackChain: string[]
): string {
  if (provider === primaryProvider) return 'primary';
  const fallbackIndex = fallbackChain.indexOf(provider);
  if (fallbackIndex >= 0) return `fallback-${fallbackIndex + 1}`;
  return 'disabled';
}

async function handleTestSMS(request: TestSMSRequest): Promise<TestSMSResponse> {
  const supabase = createServiceClient();
  const mode = request.mode || 'status';

  console.log(`[TEST-SMS] Mode: ${mode}`);

  // Status mode
  if (mode === 'status') {
    const config = await getCurrentProviderConfig(supabase);
    
    const providers: Record<string, ProviderStatus> = {
      notificationapi: {
        available: config.notificationapiAvailable,
        active: config.activeProvider === 'notificationapi',
        role: getProviderRole('notificationapi', config.settings.primaryProvider, config.fallbackChain),
      },
      infobip: {
        available: config.infobipAvailable,
        active: config.activeProvider === 'infobip',
        role: getProviderRole('infobip', config.settings.primaryProvider, config.fallbackChain),
      },
      twilio: {
        available: config.twilioAvailable,
        active: config.activeProvider === 'twilio',
        role: getProviderRole('twilio', config.settings.primaryProvider, config.fallbackChain),
      },
      eztexting: {
        available: config.eztextingAvailable,
        active: config.activeProvider === 'eztexting',
        role: getProviderRole('eztexting', config.settings.primaryProvider, config.fallbackChain),
      },
    };

    // Try to get EZTexting credits
    if (config.eztextingAvailable) {
      try {
        const eztextingClient = getEZTextingClient();
        const balanceResult = await eztextingClient.getCreditBalance();
        if (balanceResult.credits !== undefined) {
          providers.eztexting.credits = balanceResult.credits;
        }
      } catch (e) {
        console.warn('[TEST-SMS] Could not fetch EZTexting credits:', e);
      }
    }

    return {
      success: true,
      providers,
      primaryProvider: config.settings.primaryProvider,
      fallbackChain: config.fallbackChain,
      fallbackEnabled: config.settings.enableFallback,
      activeProvider: config.activeProvider,
    };
  }

  // Send mode
  if (mode === 'send') {
    const { phone, message } = request;

    if (!phone) {
      throw new ApiError('Phone number is required for send mode', 'VALIDATION_ERROR', 400);
    }
    if (!message) {
      throw new ApiError('Message is required for send mode', 'VALIDATION_ERROR', 400);
    }
    if (!PHONE_REGEX.test(phone)) {
      throw new ApiError(
        'Invalid phone number format. Use US format: (xxx) xxx-xxxx or +1xxxxxxxxxx',
        'VALIDATION_ERROR',
        400
      );
    }

    const formattedPhone = formatPhoneE164(phone);
    console.log(`[TEST-SMS] Sending to ${formattedPhone}`);

    const startTime = Date.now();
    const smsResult = await sendSMS(formattedPhone, message, supabase);
    const duration = Date.now() - startTime;

    // Log to database
    try {
      await supabase.from('sms_delivery_log').insert({
        phone_number: formattedPhone,
        message_body: message.substring(0, 160),
        delivery_status: smsResult.success ? 'sent' : 'failed',
        provider_used: smsResult.provider,
        twilio_message_sid: smsResult.messageId || null,
        error_message: smsResult.error || null,
        metadata: {
          test: true,
          duration,
          fallbackUsed: smsResult.fallbackUsed,
          attempts: smsResult.attempts,
        },
      });
    } catch (logError) {
      console.warn('[TEST-SMS] Could not log test SMS:', logError);
    }

    return {
      success: smsResult.success,
      provider: smsResult.provider,
      messageId: smsResult.messageId,
      status: smsResult.status,
      error: smsResult.error,
      fallbackUsed: smsResult.fallbackUsed || false,
      attempts: smsResult.attempts,
      formattedPhone,
      duration,
    };
  }

  throw new ApiError(`Unknown mode: ${mode}. Use 'status' or 'send'.`, 'VALIDATION_ERROR', 400);
}

Deno.serve(withApiGateway(handleTestSMS, {
  requireAuth: false,
  parseBody: true,
}));
