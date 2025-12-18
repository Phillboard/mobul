/**
 * SMS Provider Abstraction Layer
 * 
 * Unified interface for sending SMS messages with automatic provider
 * selection and fallback support.
 * 
 * Supports (in order of priority):
 * - NotificationAPI (primary)
 * - Infobip (fallback 1)
 * - Twilio (fallback 2)
 * - EZTexting (fallback 3)
 * 
 * Configuration is loaded from the sms_provider_settings table.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getNotificationAPIClient, NotificationAPIClient } from './notificationapi-client.ts';
import { getInfobipClient, InfobipClient } from './infobip-client.ts';
import { getTwilioClient, TwilioClient } from './twilio-client.ts';
import { getEZTextingClient, EZTextingClient } from './eztexting-client.ts';

export type SMSProvider = 'notificationapi' | 'infobip' | 'twilio' | 'eztexting';

export interface SMSProviderSettings {
  primaryProvider: SMSProvider;
  enableFallback: boolean;
  fallbackProvider1: SMSProvider | null;
  fallbackProvider2: SMSProvider | null;
  fallbackProvider3: SMSProvider | null;
  notificationapiEnabled: boolean;
  notificationapiNotificationId: string | null;
  infobipEnabled: boolean;
  infobipBaseUrl: string;
  infobipSenderId: string | null;
  twilioEnabled: boolean;
  eztextingEnabled: boolean;
  eztextingBaseUrl: string;
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
      fallbackProvider1: data.fallback_provider_1 as SMSProvider | null,
      fallbackProvider2: data.fallback_provider_2 as SMSProvider | null,
      fallbackProvider3: data.fallback_provider_3 as SMSProvider | null,
      notificationapiEnabled: data.notificationapi_enabled ?? true,
      notificationapiNotificationId: data.notificationapi_notification_id,
      infobipEnabled: data.infobip_enabled,
      infobipBaseUrl: data.infobip_base_url || 'https://api.infobip.com',
      infobipSenderId: data.infobip_sender_id,
      twilioEnabled: data.twilio_enabled,
      eztextingEnabled: data.eztexting_enabled ?? false,
      eztextingBaseUrl: data.eztexting_base_url || 'https://a.eztexting.com',
      fallbackOnError: data.fallback_on_error,
    };
    settingsCacheTime = now;

    console.log('[SMS-PROVIDER] Loaded settings:', {
      primary: cachedSettings.primaryProvider,
      fallback1: cachedSettings.fallbackProvider1,
      fallback2: cachedSettings.fallbackProvider2,
      fallbackEnabled: cachedSettings.enableFallback,
    });

    return cachedSettings;
  } catch (err) {
    console.warn('[SMS-PROVIDER] Error loading settings:', err);
    return getDefaultSettings();
  }
}

/**
 * Get default settings (NotificationAPI primary, Infobip fallback 1, Twilio fallback 2, EZTexting fallback 3)
 */
function getDefaultSettings(): SMSProviderSettings {
  return {
    primaryProvider: 'notificationapi',
    enableFallback: true,
    fallbackProvider1: 'infobip',
    fallbackProvider2: 'twilio',
    fallbackProvider3: 'eztexting',
    notificationapiEnabled: true,
    notificationapiNotificationId: null,
    infobipEnabled: true,
    infobipBaseUrl: 'https://api.infobip.com',
    infobipSenderId: null,
    twilioEnabled: true,
    eztextingEnabled: true,
    eztextingBaseUrl: 'https://a.eztexting.com',
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
  if (provider === 'notificationapi') {
    return !!(
      Deno.env.get('NOTIFICATIONAPI_CLIENT_ID') &&
      Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET')
    );
  } else if (provider === 'infobip') {
    return !!Deno.env.get('INFOBIP_API_KEY');
  } else if (provider === 'twilio') {
    return !!(
      Deno.env.get('TWILIO_ACCOUNT_SID') &&
      Deno.env.get('TWILIO_AUTH_TOKEN') &&
      (Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER'))
    );
  } else if (provider === 'eztexting') {
    return !!Deno.env.get('EZTEXTING_API_KEY');
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
  if (provider === 'notificationapi') {
    try {
      const client = getNotificationAPIClient();
      const result = await client.sendSMS(to, message);
      return {
        success: result.success,
        messageId: result.trackingId,
        status: result.status,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'NotificationAPI client error',
      };
    }
  } else if (provider === 'infobip') {
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
  } else if (provider === 'eztexting') {
    try {
      const client = getEZTextingClient();
      const result = await client.sendSMS(to, message);
      return {
        success: result.success,
        messageId: result.messageId,
        status: result.status,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'EZTexting client error',
      };
    }
  }

  return {
    success: false,
    error: `Unknown provider: ${provider}`,
  };
}

/**
 * Get the fallback chain based on settings
 */
function getFallbackChain(settings: SMSProviderSettings): SMSProvider[] {
  const chain: SMSProvider[] = [];
  
  if (settings.fallbackProvider1 && settings.fallbackProvider1 !== settings.primaryProvider) {
    chain.push(settings.fallbackProvider1);
  }
  
  if (settings.fallbackProvider2 && 
      settings.fallbackProvider2 !== settings.primaryProvider &&
      settings.fallbackProvider2 !== settings.fallbackProvider1) {
    chain.push(settings.fallbackProvider2);
  }

  if (settings.fallbackProvider3 && 
      settings.fallbackProvider3 !== settings.primaryProvider &&
      settings.fallbackProvider3 !== settings.fallbackProvider1 &&
      settings.fallbackProvider3 !== settings.fallbackProvider2) {
    chain.push(settings.fallbackProvider3);
  }
  
  return chain;
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

  // Get provider chain: primary + fallbacks
  const primaryProvider = settings.primaryProvider;
  const fallbackChain = getFallbackChain(settings);

  console.log(`[SMS-PROVIDER] Sending SMS to ${to}`);
  console.log(`[SMS-PROVIDER] Primary: ${primaryProvider}, Fallbacks: [${fallbackChain.join(', ')}], Fallback enabled: ${settings.enableFallback}`);

  // Check if primary provider is available
  if (!isProviderAvailable(primaryProvider)) {
    console.warn(`[SMS-PROVIDER] Primary provider ${primaryProvider} not configured`);
    
    // Try fallbacks if enabled
    if (settings.enableFallback) {
      for (const fallbackProvider of fallbackChain) {
        if (isProviderAvailable(fallbackProvider)) {
          console.log(`[SMS-PROVIDER] Using fallback provider: ${fallbackProvider}`);
          const result = await sendWithProvider(fallbackProvider, to, message);
          
          attempts.push({
            provider: fallbackProvider,
            success: result.success,
            error: result.error,
          });

          if (result.success) {
            return {
              success: true,
              provider: fallbackProvider,
              messageId: result.messageId,
              status: result.status,
              fallbackUsed: true,
              attempts,
            };
          }
        }
      }
    }

    return {
      success: false,
      provider: primaryProvider,
      error: `Primary provider ${primaryProvider} not configured and no fallback available`,
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

  // Primary failed - try fallbacks if enabled
  console.warn(`[SMS-PROVIDER] ${primaryProvider} failed: ${primaryResult.error}`);

  if (settings.enableFallback && settings.fallbackOnError) {
    for (const fallbackProvider of fallbackChain) {
      if (isProviderAvailable(fallbackProvider)) {
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

        console.warn(`[SMS-PROVIDER] Fallback ${fallbackProvider} failed: ${fallbackResult.error}`);
      }
    }

    // All providers failed
    const errorMessages = attempts.map(a => `${a.provider}: ${a.error}`).join('; ');
    console.error(`[SMS-PROVIDER] All providers failed: ${errorMessages}`);
    
    return {
      success: false,
      provider: attempts[attempts.length - 1]?.provider || primaryProvider,
      error: `All providers failed. ${errorMessages}`,
      fallbackUsed: true,
      attempts,
    };
  }

  // No fallback or fallback not enabled
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
  notificationapiAvailable: boolean;
  infobipAvailable: boolean;
  twilioAvailable: boolean;
  eztextingAvailable: boolean;
  activeProvider: SMSProvider;
  fallbackChain: SMSProvider[];
}> {
  const settings = await getProviderSettings(supabaseClient);
  const notificationapiAvailable = isProviderAvailable('notificationapi');
  const infobipAvailable = isProviderAvailable('infobip');
  const twilioAvailable = isProviderAvailable('twilio');
  const eztextingAvailable = isProviderAvailable('eztexting');

  // Determine which provider will actually be used
  let activeProvider = settings.primaryProvider;
  if (!isProviderAvailable(settings.primaryProvider)) {
    const fallbackChain = getFallbackChain(settings);
    for (const provider of fallbackChain) {
      if (isProviderAvailable(provider)) {
        activeProvider = provider;
        break;
      }
    }
  }

  return {
    settings,
    notificationapiAvailable,
    infobipAvailable,
    twilioAvailable,
    eztextingAvailable,
    activeProvider,
    fallbackChain: getFallbackChain(settings),
  };
}

/**
 * Helper to format phone to E.164 (used by all providers)
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
