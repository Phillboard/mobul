/**
 * SMS Provider Abstraction Layer
 * 
 * Unified interface for sending SMS messages with automatic provider
 * selection and fallback support.
 * 
 * Supports:
 * - Infobip (primary)
 * - Twilio (fallback)
 * 
 * Configuration is loaded from the sms_provider_settings table.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getInfobipClient, InfobipClient } from './infobip-client.ts';
import { getTwilioClient, TwilioClient } from './twilio-client.ts';

export type SMSProvider = 'infobip' | 'twilio';

export interface SMSProviderSettings {
  primaryProvider: SMSProvider;
  enableFallback: boolean;
  infobipEnabled: boolean;
  infobipBaseUrl: string;
  infobipSenderId: string | null;
  twilioEnabled: boolean;
  fallbackOnError: boolean;
}

export interface SendSMSResult {
  success: boolean;
  provider: SMSProvider;
  messageId?: string;
  status?: string;
  error?: string;
  fallbackUsed?: boolean;
  attempts?: Array<{
    provider: SMSProvider;
    success: boolean;
    error?: string;
  }>;
}

// Cache for settings to avoid repeated DB calls
let cachedSettings: SMSProviderSettings | null = null;
let settingsCacheTime: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get SMS provider settings from database
 */
async function getProviderSettings(supabaseClient?: SupabaseClient): Promise<SMSProviderSettings> {
  // Check cache
  const now = Date.now();
  if (cachedSettings && (now - settingsCacheTime) < CACHE_TTL_MS) {
    return cachedSettings;
  }

  // Create client if not provided
  const client = supabaseClient || createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { data, error } = await client
      .from('sms_provider_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.warn('[SMS-PROVIDER] Failed to load settings, using defaults:', error.message);
      // Return defaults if table doesn't exist or no settings
      return getDefaultSettings();
    }

    cachedSettings = {
      primaryProvider: data.primary_provider as SMSProvider,
      enableFallback: data.enable_fallback,
      infobipEnabled: data.infobip_enabled,
      infobipBaseUrl: data.infobip_base_url || 'https://api.infobip.com',
      infobipSenderId: data.infobip_sender_id,
      twilioEnabled: data.twilio_enabled,
      fallbackOnError: data.fallback_on_error,
    };
    settingsCacheTime = now;

    console.log('[SMS-PROVIDER] Loaded settings:', {
      primary: cachedSettings.primaryProvider,
      fallback: cachedSettings.enableFallback,
    });

    return cachedSettings;
  } catch (err) {
    console.warn('[SMS-PROVIDER] Error loading settings:', err);
    return getDefaultSettings();
  }
}

/**
 * Get default settings (Infobip primary, Twilio fallback)
 */
function getDefaultSettings(): SMSProviderSettings {
  return {
    primaryProvider: 'infobip',
    enableFallback: true,
    infobipEnabled: true,
    infobipBaseUrl: 'https://api.infobip.com',
    infobipSenderId: null,
    twilioEnabled: true,
    fallbackOnError: true,
  };
}

/**
 * Clear settings cache (call when settings are updated)
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
  settingsCacheTime = 0;
}

/**
 * Check if a provider is available (credentials configured)
 */
function isProviderAvailable(provider: SMSProvider): boolean {
  if (provider === 'infobip') {
    return !!Deno.env.get('INFOBIP_API_KEY');
  } else if (provider === 'twilio') {
    return !!(
      Deno.env.get('TWILIO_ACCOUNT_SID') &&
      Deno.env.get('TWILIO_AUTH_TOKEN') &&
      (Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER'))
    );
  }
  return false;
}

/**
 * Send SMS using specified provider
 */
async function sendWithProvider(
  provider: SMSProvider,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; status?: string; error?: string }> {
  if (provider === 'infobip') {
    try {
      const client = getInfobipClient();
      return await client.sendSMS(to, message);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Infobip client error',
      };
    }
  } else if (provider === 'twilio') {
    try {
      const client = getTwilioClient();
      const result = await client.sendSMS(to, message);
      return {
        success: result.success,
        messageId: result.messageSid,
        status: result.status,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Twilio client error',
      };
    }
  }

  return {
    success: false,
    error: `Unknown provider: ${provider}`,
  };
}

/**
 * Main SMS sending function with provider selection and fallback
 */
export async function sendSMS(
  to: string,
  message: string,
  supabaseClient?: SupabaseClient
): Promise<SendSMSResult> {
  const settings = await getProviderSettings(supabaseClient);
  const attempts: SendSMSResult['attempts'] = [];

  // Determine provider order
  const primaryProvider = settings.primaryProvider;
  const fallbackProvider: SMSProvider = primaryProvider === 'infobip' ? 'twilio' : 'infobip';

  console.log(`[SMS-PROVIDER] Sending SMS to ${to}`);
  console.log(`[SMS-PROVIDER] Primary: ${primaryProvider}, Fallback enabled: ${settings.enableFallback}`);

  // Check if primary provider is available
  if (!isProviderAvailable(primaryProvider)) {
    console.warn(`[SMS-PROVIDER] Primary provider ${primaryProvider} not configured`);
    
    // Try fallback if enabled
    if (settings.enableFallback && isProviderAvailable(fallbackProvider)) {
      console.log(`[SMS-PROVIDER] Using fallback provider: ${fallbackProvider}`);
      const result = await sendWithProvider(fallbackProvider, to, message);
      
      attempts.push({
        provider: fallbackProvider,
        success: result.success,
        error: result.error,
      });

      return {
        success: result.success,
        provider: fallbackProvider,
        messageId: result.messageId,
        status: result.status,
        error: result.error,
        fallbackUsed: true,
        attempts,
      };
    }

    return {
      success: false,
      provider: primaryProvider,
      error: `Primary provider ${primaryProvider} not configured and fallback not available`,
      attempts,
    };
  }

  // Try primary provider
  console.log(`[SMS-PROVIDER] Attempting ${primaryProvider}...`);
  const primaryResult = await sendWithProvider(primaryProvider, to, message);
  
  attempts.push({
    provider: primaryProvider,
    success: primaryResult.success,
    error: primaryResult.error,
  });

  if (primaryResult.success) {
    console.log(`[SMS-PROVIDER] ${primaryProvider} succeeded`);
    return {
      success: true,
      provider: primaryProvider,
      messageId: primaryResult.messageId,
      status: primaryResult.status,
      fallbackUsed: false,
      attempts,
    };
  }

  // Primary failed - try fallback if enabled
  console.warn(`[SMS-PROVIDER] ${primaryProvider} failed: ${primaryResult.error}`);

  if (settings.enableFallback && settings.fallbackOnError && isProviderAvailable(fallbackProvider)) {
    console.log(`[SMS-PROVIDER] Attempting fallback: ${fallbackProvider}...`);
    const fallbackResult = await sendWithProvider(fallbackProvider, to, message);
    
    attempts.push({
      provider: fallbackProvider,
      success: fallbackResult.success,
      error: fallbackResult.error,
    });

    if (fallbackResult.success) {
      console.log(`[SMS-PROVIDER] Fallback ${fallbackProvider} succeeded`);
      return {
        success: true,
        provider: fallbackProvider,
        messageId: fallbackResult.messageId,
        status: fallbackResult.status,
        fallbackUsed: true,
        attempts,
      };
    }

    console.error(`[SMS-PROVIDER] Fallback ${fallbackProvider} also failed: ${fallbackResult.error}`);
    return {
      success: false,
      provider: fallbackProvider,
      error: `Both providers failed. Primary (${primaryProvider}): ${primaryResult.error}. Fallback (${fallbackProvider}): ${fallbackResult.error}`,
      fallbackUsed: true,
      attempts,
    };
  }

  // No fallback or fallback not available
  return {
    success: false,
    provider: primaryProvider,
    error: primaryResult.error,
    fallbackUsed: false,
    attempts,
  };
}

/**
 * Get current provider configuration (for display/debugging)
 */
export async function getCurrentProviderConfig(supabaseClient?: SupabaseClient): Promise<{
  settings: SMSProviderSettings;
  infobipAvailable: boolean;
  twilioAvailable: boolean;
  activeProvider: SMSProvider;
}> {
  const settings = await getProviderSettings(supabaseClient);
  const infobipAvailable = isProviderAvailable('infobip');
  const twilioAvailable = isProviderAvailable('twilio');

  // Determine which provider will actually be used
  let activeProvider = settings.primaryProvider;
  if (!isProviderAvailable(settings.primaryProvider)) {
    if (settings.enableFallback) {
      activeProvider = settings.primaryProvider === 'infobip' ? 'twilio' : 'infobip';
    }
  }

  return {
    settings,
    infobipAvailable,
    twilioAvailable,
    activeProvider,
  };
}

/**
 * Helper to format phone to E.164 (used by both providers)
 */
export function formatPhoneE164(phone: string): string {
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

