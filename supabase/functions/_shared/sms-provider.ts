/**
 * SMS Provider Abstraction Layer
 * 
 * Unified interface for sending SMS messages with automatic provider
 * selection and fallback support.
 * 
 * Supports (in order of priority):
 * - NotificationAPI (primary)
 * - Infobip (fallback 1)
 * - Twilio (fallback 2) - WITH HIERARCHICAL CREDENTIAL RESOLUTION
 * - EZTexting (fallback 3)
 * 
 * Configuration is loaded from the sms_provider_settings table.
 * 
 * Twilio Hierarchy:
 * When Twilio is selected and clientId is provided, credentials are resolved in order:
 * 1. Client's own Twilio (if enabled and validated)
 * 2. Agency's Twilio (if client's agency has it enabled and validated)
 * 3. Admin/Master Twilio (platform-wide fallback)
 * 
 * NOTE: Environment variable fallback has been REMOVED.
 * If no valid Twilio configuration exists, SMS sending will fail with an error.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getNotificationAPIClient, NotificationAPIClient } from './notificationapi-client.ts';
import { getInfobipClient, InfobipClient } from './infobip-client.ts';
import { TwilioClient } from './twilio-client.ts';
import { getEZTextingClient, EZTextingClient } from './eztexting-client.ts';
import { 
  resolveTwilioCredentials,
  resolveAdminTwilioCredentials,
  recordTwilioSuccess, 
  recordTwilioFailure,
  logFallbackEvent,
  TwilioLevel,
  TwilioResolutionResult
} from './twilio-hierarchy.ts';

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
  // Twilio hierarchy tracking
  twilioLevelUsed?: TwilioLevel;
  twilioEntityId?: string | null;
  twilioEntityName?: string;
  twilioFromNumber?: string;
  twilioFallbackOccurred?: boolean;
  twilioFallbackReason?: string;
  twilioResolutionTimeMs?: number;
}

// Cache for settings to avoid repeated DB calls
let cachedSettings: SMSProviderSettings | null = null;
let settingsCacheTime: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get SMS provider settings from database
 */
async function getProviderSettings(supabaseClient?: SupabaseClient): Promise<SMSProviderSettings> {
  // #region agent log
  console.log('[DEBUG-A] getProviderSettings called, checking cache...');
  // #endregion
  // Check cache
  const now = Date.now();
  if (cachedSettings && (now - settingsCacheTime) < CACHE_TTL_MS) {
    // #region agent log
    console.log('[DEBUG-A] Using cached settings:', JSON.stringify({ primary: cachedSettings.primaryProvider, twilioEnabled: cachedSettings.twilioEnabled, fallbackEnabled: cachedSettings.enableFallback }));
    // #endregion
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

    // #region agent log
    console.log('[DEBUG-A] DB query result:', JSON.stringify({ hasData: !!data, hasError: !!error, errorMsg: error?.message, rawData: data ? { primary_provider: data.primary_provider, twilio_enabled: data.twilio_enabled, enable_fallback: data.enable_fallback, fallback_provider_1: data.fallback_provider_1, fallback_provider_2: data.fallback_provider_2, fallback_provider_3: data.fallback_provider_3 } : null }));
    // #endregion

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
 * 
 * NOTE: For Twilio, this always returns false because Twilio availability
 * is determined by hierarchical resolution (Client -> Agency -> Admin),
 * not environment variables. Use resolveTwilioIfNeeded() instead.
 */
function isProviderAvailable(provider: SMSProvider): boolean {
  console.log('[DEBUG-B] isProviderAvailable check:', JSON.stringify({ provider }));
  
  if (provider === 'notificationapi') {
    return !!(
      Deno.env.get('NOTIFICATIONAPI_CLIENT_ID') &&
      Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET')
    );
  } else if (provider === 'infobip') {
    return !!Deno.env.get('INFOBIP_API_KEY');
  } else if (provider === 'twilio') {
    // Twilio availability is determined by hierarchical resolution, not env vars
    // Always return false here - actual check happens in resolveTwilioIfNeeded()
    console.log('[DEBUG-B] Twilio: returning false (uses hierarchical resolution)');
    return false;
  } else if (provider === 'eztexting') {
    return !!(
      Deno.env.get('EZTEXTING_USERNAME') &&
      Deno.env.get('EZTEXTING_PASSWORD')
    );
  }
  return false;
}

/**
 * Send SMS using specified provider
 * 
 * @param provider - The SMS provider to use
 * @param to - Recipient phone number
 * @param message - Message content
 * @param twilioCredentials - Optional pre-resolved Twilio credentials (for hierarchical resolution)
 */
async function sendWithProvider(
  provider: SMSProvider,
  to: string,
  message: string,
  twilioCredentials?: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  }
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
      // MUST use hierarchical credentials - no env var fallback allowed
      if (twilioCredentials) {
        const client = new TwilioClient({
          accountSid: twilioCredentials.accountSid,
          authToken: twilioCredentials.authToken,
          fromNumber: twilioCredentials.fromNumber,
        });
        const result = await client.sendSMS(to, message);
        return {
          success: result.success,
          messageId: result.messageSid,
          status: result.status,
          error: result.error,
        };
      } else {
        // No hierarchical credentials available - fail explicitly
        // Environment variable fallback has been removed to ensure consistent phone numbers
        console.error('[SMS-PROVIDER] Twilio credentials not resolved - hierarchical resolution required');
        return {
          success: false,
          error: 'No Twilio credentials available. Configure Twilio at client, agency, or admin level.',
        };
      }
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
 * 
 * @param to - Recipient phone number
 * @param message - Message content
 * @param supabaseClient - Optional Supabase client for settings lookup
 * @param clientId - Optional client ID for hierarchical Twilio resolution
 */
export async function sendSMS(
  to: string,
  message: string,
  supabaseClient?: SupabaseClient,
  clientId?: string
): Promise<SendSMSResult> {
  // #region agent log
  console.log('[DEBUG-C] sendSMS called:', JSON.stringify({ to, clientId: clientId || 'none', hasSupabaseClient: !!supabaseClient }));
  // #endregion
  
  const settings = await getProviderSettings(supabaseClient);
  const attempts: SendSMSResult['attempts'] = [];
  
  // #region agent log
  console.log('[DEBUG-C] Settings loaded:', JSON.stringify({ primary: settings.primaryProvider, twilioEnabled: settings.twilioEnabled, fallbackEnabled: settings.enableFallback, fallback1: settings.fallbackProvider1, fallback2: settings.fallbackProvider2, fallback3: settings.fallbackProvider3 }));
  // #endregion
  
  // Twilio hierarchy tracking
  let twilioResolution: TwilioResolutionResult | null = null;
  let twilioCredentials: { accountSid: string; authToken: string; fromNumber: string } | undefined;

  // Get provider chain: primary + fallbacks
  const primaryProvider = settings.primaryProvider;
  const fallbackChain = getFallbackChain(settings);

  console.log(`[SMS-PROVIDER] Sending SMS to ${to}`);
  console.log(`[SMS-PROVIDER] Primary: ${primaryProvider}, Fallbacks: [${fallbackChain.join(', ')}], Fallback enabled: ${settings.enableFallback}`);
  if (clientId) {
    console.log(`[SMS-PROVIDER] Client ID provided for hierarchical Twilio resolution: ${clientId}`);
  }

  // Helper function to resolve Twilio credentials if needed
  // CRITICAL: For Twilio, ALWAYS try hierarchy resolution before falling back to env vars
  const resolveTwilioIfNeeded = async (provider: SMSProvider): Promise<boolean> => {
    // For non-Twilio providers, just check if env vars are configured
    if (provider !== 'twilio') {
      const available = isProviderAvailable(provider);
      console.log(`[SMS-PROVIDER] Non-Twilio provider ${provider} availability: ${available}`);
      return available;
    }
    
    // Already resolved Twilio credentials
    if (twilioResolution) {
      console.log(`[SMS-PROVIDER] Using previously resolved Twilio: ${twilioResolution.credentials?.level}-level`);
      return twilioResolution.success;
    }
    
    // Resolve Twilio credentials using hierarchy
    console.log('[SMS-PROVIDER] Resolving Twilio credentials...', JSON.stringify({ 
      hasClientId: !!clientId, 
      hasSupabaseClient: !!supabaseClient 
    }));
    
    if (clientId && supabaseClient) {
      // Full hierarchy: Client → Agency → Admin (no env var fallback)
      console.log('[SMS-PROVIDER] Using FULL hierarchy (clientId provided)');
      twilioResolution = await resolveTwilioCredentials(clientId, supabaseClient);
    } else if (supabaseClient) {
      // Admin-only hierarchy: Admin only (no env var fallback)
      console.log('[SMS-PROVIDER] Using ADMIN-ONLY hierarchy (no clientId)');
      twilioResolution = await resolveAdminTwilioCredentials(supabaseClient);
    } else {
      // No supabase client - FAIL (no env var fallback allowed)
      console.error('[SMS-PROVIDER] No supabase client provided - cannot resolve Twilio credentials');
      twilioResolution = {
        success: false,
        fallbackChain: [],
        fallbackOccurred: false,
        error: 'No Twilio configuration available. Supabase client required for credential resolution.',
        resolutionTimeMs: 0,
      };
    }
    
    // Log the resolution result
    console.log('[SMS-PROVIDER] Twilio resolution result:', JSON.stringify({ 
      success: twilioResolution.success, 
      level: twilioResolution.credentials?.level,
      entityName: twilioResolution.credentials?.entityName,
      fromNumber: twilioResolution.credentials?.fromNumber,
      fallbackOccurred: twilioResolution.fallbackOccurred,
      fallbackReason: twilioResolution.fallbackReason,
      error: twilioResolution.error,
    }));
    
    // Set credentials if resolution succeeded
    if (twilioResolution.success && twilioResolution.credentials) {
      twilioCredentials = {
        accountSid: twilioResolution.credentials.accountSid,
        authToken: twilioResolution.credentials.authToken,
        fromNumber: twilioResolution.credentials.fromNumber,
      };
      console.log(`[SMS-PROVIDER] ✓ Will use ${twilioResolution.credentials.level}-level Twilio from: ${twilioResolution.credentials.fromNumber}`);
      return true;
    }
    
    console.warn(`[SMS-PROVIDER] ✗ Twilio resolution failed: ${twilioResolution.error}`);
    return false;
  };

  // Check if primary provider is available (with Twilio hierarchy resolution)
  const primaryAvailable = await resolveTwilioIfNeeded(primaryProvider);
  
  // #region agent log
  console.log('[DEBUG-D] Primary provider availability:', JSON.stringify({ primaryProvider, primaryAvailable, envCheck: isProviderAvailable(primaryProvider) }));
  // #endregion
  
  if (!primaryAvailable && primaryProvider !== 'twilio') {
    // Non-Twilio provider not available
    if (!isProviderAvailable(primaryProvider)) {
      console.warn(`[SMS-PROVIDER] Primary provider ${primaryProvider} not configured`);
    }
  }
  
  if (!primaryAvailable || (primaryProvider !== 'twilio' && !isProviderAvailable(primaryProvider))) {
    // #region agent log
    console.log('[DEBUG-D] Primary provider NOT available, will try fallbacks');
    // #endregion
    console.warn(`[SMS-PROVIDER] Primary provider ${primaryProvider} not available`);
    
    // Try fallbacks if enabled
    if (settings.enableFallback) {
      // #region agent log
      console.log('[DEBUG-D] Trying fallback chain:', JSON.stringify({ fallbackChain }));
      // #endregion
      for (const fallbackProvider of fallbackChain) {
        // Resolve Twilio if this fallback is Twilio
        const fallbackAvailable = await resolveTwilioIfNeeded(fallbackProvider);
        
        // #region agent log
        console.log('[DEBUG-D] Fallback check:', JSON.stringify({ fallbackProvider, fallbackAvailable, envAvailable: isProviderAvailable(fallbackProvider) }));
        // #endregion
        
        if (fallbackAvailable || (fallbackProvider !== 'twilio' && isProviderAvailable(fallbackProvider))) {
          console.log(`[SMS-PROVIDER] Using fallback provider: ${fallbackProvider}`);
          const result = await sendWithProvider(fallbackProvider, to, message, twilioCredentials);
          
          // #region agent log
          console.log('[DEBUG-D] Fallback result:', JSON.stringify({ fallbackProvider, success: result.success, error: result.error }));
          // #endregion
          
          attempts.push({
            provider: fallbackProvider,
            success: result.success,
            error: result.error,
          });

          if (result.success) {
            // Record success for Twilio hierarchy tracking
            if (fallbackProvider === 'twilio' && twilioResolution?.credentials && supabaseClient) {
              await recordTwilioSuccess(
                twilioResolution.credentials.level,
                twilioResolution.credentials.entityId,
                supabaseClient
              );
            }
            
            return {
              success: true,
              provider: fallbackProvider,
              messageId: result.messageId,
              status: result.status,
              fallbackUsed: true,
              attempts,
              // Include Twilio hierarchy info
              twilioLevelUsed: twilioResolution?.credentials?.level,
              twilioEntityId: twilioResolution?.credentials?.entityId,
              twilioEntityName: twilioResolution?.credentials?.entityName,
              twilioFromNumber: twilioResolution?.credentials?.fromNumber,
              twilioFallbackOccurred: twilioResolution?.fallbackOccurred,
              twilioFallbackReason: twilioResolution?.fallbackReason,
              twilioResolutionTimeMs: twilioResolution?.resolutionTimeMs,
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
  const primaryResult = await sendWithProvider(primaryProvider, to, message, twilioCredentials);
  
  attempts.push({
    provider: primaryProvider,
    success: primaryResult.success,
    error: primaryResult.error,
  });

  if (primaryResult.success) {
    console.log(`[SMS-PROVIDER] ${primaryProvider} succeeded`);
    
    // Record success for Twilio hierarchy tracking
    if (primaryProvider === 'twilio' && twilioResolution?.credentials && supabaseClient) {
      await recordTwilioSuccess(
        twilioResolution.credentials.level,
        twilioResolution.credentials.entityId,
        supabaseClient
      );
    }
    
    return {
      success: true,
      provider: primaryProvider,
      messageId: primaryResult.messageId,
      status: primaryResult.status,
      fallbackUsed: false,
      attempts,
      // Include Twilio hierarchy info
      twilioLevelUsed: twilioResolution?.credentials?.level,
      twilioEntityId: twilioResolution?.credentials?.entityId,
      twilioEntityName: twilioResolution?.credentials?.entityName,
      twilioFromNumber: twilioResolution?.credentials?.fromNumber,
      twilioFallbackOccurred: twilioResolution?.fallbackOccurred,
      twilioFallbackReason: twilioResolution?.fallbackReason,
      twilioResolutionTimeMs: twilioResolution?.resolutionTimeMs,
    };
  }

  // Primary failed - record failure for Twilio hierarchy
  if (primaryProvider === 'twilio' && twilioResolution?.credentials && supabaseClient) {
    await recordTwilioFailure(
      twilioResolution.credentials.level,
      twilioResolution.credentials.entityId,
      primaryResult.error || 'Unknown error',
      supabaseClient
    );
  }
  
  console.warn(`[SMS-PROVIDER] ${primaryProvider} failed: ${primaryResult.error}`);

  if (settings.enableFallback && settings.fallbackOnError) {
    for (const fallbackProvider of fallbackChain) {
      // For Twilio fallback, we might need to try a different level
      // Reset twilioResolution if we're trying Twilio again after it failed
      if (fallbackProvider === 'twilio' && primaryProvider === 'twilio') {
        // Skip Twilio as fallback if it was the primary that failed
        // (unless we want to try a different Twilio level - future enhancement)
        continue;
      }
      
      const fallbackAvailable = await resolveTwilioIfNeeded(fallbackProvider);
      
      if (fallbackAvailable || (fallbackProvider !== 'twilio' && isProviderAvailable(fallbackProvider))) {
        console.log(`[SMS-PROVIDER] Attempting fallback: ${fallbackProvider}...`);
        const fallbackResult = await sendWithProvider(fallbackProvider, to, message, twilioCredentials);
        
        attempts.push({
          provider: fallbackProvider,
          success: fallbackResult.success,
          error: fallbackResult.error,
        });

        if (fallbackResult.success) {
          console.log(`[SMS-PROVIDER] Fallback ${fallbackProvider} succeeded`);
          
          // Record success for Twilio hierarchy tracking
          if (fallbackProvider === 'twilio' && twilioResolution?.credentials && supabaseClient) {
            await recordTwilioSuccess(
              twilioResolution.credentials.level,
              twilioResolution.credentials.entityId,
              supabaseClient
            );
          }
          
          return {
            success: true,
            provider: fallbackProvider,
            messageId: fallbackResult.messageId,
            status: fallbackResult.status,
            fallbackUsed: true,
            attempts,
            // Include Twilio hierarchy info
            twilioLevelUsed: twilioResolution?.credentials?.level,
            twilioEntityId: twilioResolution?.credentials?.entityId,
            twilioEntityName: twilioResolution?.credentials?.entityName,
            twilioFromNumber: twilioResolution?.credentials?.fromNumber,
            twilioFallbackOccurred: twilioResolution?.fallbackOccurred,
            twilioFallbackReason: twilioResolution?.fallbackReason,
            twilioResolutionTimeMs: twilioResolution?.resolutionTimeMs,
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
