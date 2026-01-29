/**
 * Twilio Hierarchical Credential Resolution
 * 
 * Resolves Twilio credentials using a hierarchical fallback chain:
 * 1. Client's own Twilio (if enabled, validated, and not circuit-broken)
 * 2. Agency's Twilio (if enabled, validated, and not circuit-broken)
 * 3. Admin/Master Twilio (if enabled and validated)
 * 
 * NOTE: Environment variable fallback has been REMOVED.
 * If no valid configuration exists at any level, resolution fails with an error.
 * This ensures SMS is never sent from an unexpected/legacy phone number.
 * 
 * Features:
 * - Circuit breaker pattern to skip failing configurations
 * - Stale validation detection
 * - Detailed fallback chain reporting
 * - Performance tracking
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { decryptAuthToken } from './twilio-encryption.ts';

// Types
export type TwilioLevel = 'client' | 'agency' | 'admin' | 'env';

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  level: TwilioLevel;
  entityId: string | null;
  entityName: string;
}

export interface FallbackChainItem {
  level: TwilioLevel;
  name: string;
  enabled: boolean;
  validated: boolean;
  circuitOpen: boolean;
  staleValidation: boolean;
  reason?: string;
}

export interface TwilioResolutionResult {
  success: boolean;
  credentials?: TwilioCredentials;
  fallbackChain: FallbackChainItem[];
  fallbackOccurred: boolean;
  fallbackReason?: string;
  error?: string;
  resolutionTimeMs: number;
}

// Circuit breaker settings
const CIRCUIT_BREAKER_THRESHOLD = 3; // Open circuit after 3 consecutive failures
const CIRCUIT_BREAKER_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Validation staleness threshold
const VALIDATION_STALE_DAYS = 30;

/**
 * Check if a circuit is currently open
 */
function isCircuitOpen(circuitOpenUntil: string | null): boolean {
  if (!circuitOpenUntil) return false;
  return new Date(circuitOpenUntil) > new Date();
}

/**
 * Check if validation is stale (older than 30 days)
 */
function isValidationStale(validatedAt: string | null, revalidateAfter: string | null): boolean {
  if (!validatedAt) return true;
  
  // Use revalidate_after if set, otherwise calculate from validated_at
  const threshold = revalidateAfter 
    ? new Date(revalidateAfter)
    : new Date(new Date(validatedAt).getTime() + VALIDATION_STALE_DAYS * 24 * 60 * 60 * 1000);
  
  return new Date() > threshold;
}

/**
 * Determine why a level is not available
 */
function getUnavailableReason(
  enabled: boolean,
  validated: boolean,
  circuitOpen: boolean,
  staleValidation: boolean
): string {
  if (!enabled) return 'Not enabled';
  if (circuitOpen) return 'Circuit breaker open';
  if (!validated) return 'Not validated';
  if (staleValidation) return 'Validation stale';
  return 'Unknown';
}

/**
 * Resolve Twilio credentials using hierarchical fallback
 * 
 * @param clientId - The client ID to resolve credentials for
 * @param supabase - Supabase client instance
 * @returns Resolution result with credentials or error
 */
export async function resolveTwilioCredentials(
  clientId: string,
  supabase: SupabaseClient
): Promise<TwilioResolutionResult> {
  const startTime = performance.now();
  const fallbackChain: FallbackChainItem[] = [];
  let fallbackOccurred = false;
  let fallbackReason: string | undefined;

  console.log(`[TWILIO-HIERARCHY] Resolving credentials for client: ${clientId}`);

  try {
    // ========================================
    // Step 1: Try Client-level Twilio
    // ========================================
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id, name, agency_id,
        twilio_account_sid,
        twilio_auth_token_encrypted,
        twilio_phone_number,
        twilio_enabled,
        twilio_validated_at,
        twilio_circuit_open_until,
        twilio_revalidate_after,
        twilio_friendly_name
      `)
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('[TWILIO-HIERARCHY] Client not found:', clientId);
      return {
        success: false,
        fallbackChain,
        fallbackOccurred: false,
        error: `Client not found: ${clientId}`,
        resolutionTimeMs: performance.now() - startTime,
      };
    }

    const clientCircuitOpen = isCircuitOpen(client.twilio_circuit_open_until);
    const clientStale = isValidationStale(client.twilio_validated_at, client.twilio_revalidate_after);
    const clientValidated = client.twilio_validated_at != null;
    const clientEnabled = client.twilio_enabled ?? false;

    fallbackChain.push({
      level: 'client',
      name: client.twilio_friendly_name || client.name,
      enabled: clientEnabled,
      validated: clientValidated,
      circuitOpen: clientCircuitOpen,
      staleValidation: clientStale && clientValidated,
      reason: (clientEnabled && clientValidated && !clientCircuitOpen) 
        ? undefined 
        : getUnavailableReason(clientEnabled, clientValidated, clientCircuitOpen, clientStale),
    });

    // Check if client level is usable
    if (clientEnabled && clientValidated && !clientCircuitOpen && client.twilio_account_sid) {
      try {
        const authToken = await decryptAuthToken(client.twilio_auth_token_encrypted);
        
        console.log(`[TWILIO-HIERARCHY] Using client-level Twilio: ${client.name}`);
        
        return {
          success: true,
          credentials: {
            accountSid: client.twilio_account_sid,
            authToken,
            fromNumber: client.twilio_phone_number,
            level: 'client',
            entityId: client.id,
            entityName: client.twilio_friendly_name || client.name,
          },
          fallbackChain,
          fallbackOccurred: false,
          resolutionTimeMs: performance.now() - startTime,
        };
      } catch (decryptError) {
        console.error('[TWILIO-HIERARCHY] Failed to decrypt client token');
        fallbackOccurred = true;
        fallbackReason = 'Client token decryption failed';
      }
    } else if (clientEnabled && client.twilio_account_sid) {
      fallbackOccurred = true;
      fallbackReason = fallbackChain[0].reason || 'Client config not available';
    }

    // ========================================
    // Step 2: Try Agency-level Twilio
    // ========================================
    if (client.agency_id) {
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .select(`
          id, name,
          twilio_account_sid,
          twilio_auth_token_encrypted,
          twilio_phone_number,
          twilio_enabled,
          twilio_validated_at,
          twilio_circuit_open_until,
          twilio_revalidate_after,
          twilio_friendly_name
        `)
        .eq('id', client.agency_id)
        .single();

      if (!agencyError && agency) {
        const agencyCircuitOpen = isCircuitOpen(agency.twilio_circuit_open_until);
        const agencyStale = isValidationStale(agency.twilio_validated_at, agency.twilio_revalidate_after);
        const agencyValidated = agency.twilio_validated_at != null;
        const agencyEnabled = agency.twilio_enabled ?? false;

        fallbackChain.push({
          level: 'agency',
          name: agency.twilio_friendly_name || agency.name,
          enabled: agencyEnabled,
          validated: agencyValidated,
          circuitOpen: agencyCircuitOpen,
          staleValidation: agencyStale && agencyValidated,
          reason: (agencyEnabled && agencyValidated && !agencyCircuitOpen) 
            ? undefined 
            : getUnavailableReason(agencyEnabled, agencyValidated, agencyCircuitOpen, agencyStale),
        });

        // Check if agency level is usable
        if (agencyEnabled && agencyValidated && !agencyCircuitOpen && agency.twilio_account_sid) {
          try {
            const authToken = await decryptAuthToken(agency.twilio_auth_token_encrypted);
            
            console.log(`[TWILIO-HIERARCHY] Using agency-level Twilio: ${agency.name}`);
            
            return {
              success: true,
              credentials: {
                accountSid: agency.twilio_account_sid,
                authToken,
                fromNumber: agency.twilio_phone_number,
                level: 'agency',
                entityId: agency.id,
                entityName: agency.twilio_friendly_name || agency.name,
              },
              fallbackChain,
              fallbackOccurred,
              fallbackReason,
              resolutionTimeMs: performance.now() - startTime,
            };
          } catch (decryptError) {
            console.error('[TWILIO-HIERARCHY] Failed to decrypt agency token');
            if (!fallbackOccurred) {
              fallbackOccurred = true;
              fallbackReason = 'Agency token decryption failed';
            }
          }
        } else if (!fallbackOccurred && agencyEnabled && agency.twilio_account_sid) {
          fallbackOccurred = true;
          fallbackReason = fallbackChain[1]?.reason || 'Agency config not available';
        }
      }
    }

    // ========================================
    // Step 3: Try Admin/Master-level Twilio
    // ========================================
    const { data: settings, error: settingsError } = await supabase
      .from('sms_provider_settings')
      .select(`
        admin_twilio_account_sid,
        admin_twilio_auth_token_encrypted,
        admin_twilio_phone_number,
        admin_twilio_enabled,
        admin_twilio_validated_at,
        admin_twilio_friendly_name
      `)
      .limit(1)
      .single();

    const adminValidated = settings?.admin_twilio_validated_at != null;
    const adminEnabled = settings?.admin_twilio_enabled ?? false;

    fallbackChain.push({
      level: 'admin',
      name: settings?.admin_twilio_friendly_name || 'Platform Master',
      enabled: adminEnabled,
      validated: adminValidated,
      circuitOpen: false, // Admin level doesn't have circuit breaker
      staleValidation: false, // Admin level doesn't expire
      reason: (adminEnabled && adminValidated) 
        ? undefined 
        : getUnavailableReason(adminEnabled, adminValidated, false, false),
    });

    if (!settingsError && adminEnabled && settings.admin_twilio_account_sid) {
      try {
        const authToken = await decryptAuthToken(settings.admin_twilio_auth_token_encrypted);
        
        console.log('[TWILIO-HIERARCHY] Using admin-level Twilio');
        
        return {
          success: true,
          credentials: {
            accountSid: settings.admin_twilio_account_sid,
            authToken,
            fromNumber: settings.admin_twilio_phone_number,
            level: 'admin',
            entityId: null,
            entityName: settings.admin_twilio_friendly_name || 'Platform Master',
          },
          fallbackChain,
          fallbackOccurred: fallbackOccurred || fallbackChain.length > 1,
          fallbackReason: fallbackReason || 'Using admin fallback',
          resolutionTimeMs: performance.now() - startTime,
        };
      } catch (decryptError) {
        console.error('[TWILIO-HIERARCHY] Failed to decrypt admin token');
      }
    }

    // ========================================
    // No valid configuration found - FAIL (no env var fallback)
    // ========================================
    console.error('[TWILIO-HIERARCHY] No valid Twilio configuration found at any level');
    console.error('[TWILIO-HIERARCHY] Fallback chain:', JSON.stringify(fallbackChain, null, 2));
    
    return {
      success: false,
      fallbackChain,
      fallbackOccurred: true,
      fallbackReason: 'No valid configuration at any level',
      error: 'No valid Twilio configuration found. Please configure Twilio at client, agency, or admin level.',
      resolutionTimeMs: performance.now() - startTime,
    };

  } catch (error) {
    console.error('[TWILIO-HIERARCHY] Resolution error:', error);
    
    return {
      success: false,
      fallbackChain,
      fallbackOccurred: false,
      error: error instanceof Error ? error.message : 'Unknown error during credential resolution',
      resolutionTimeMs: performance.now() - startTime,
    };
  }
}

/**
 * Resolve Twilio credentials when no clientId is available.
 * Only checks Admin-level Twilio configuration.
 * 
 * NOTE: Environment variable fallback has been REMOVED.
 * If admin-level is not configured, resolution fails with an error.
 * 
 * Use this when:
 * - The campaign doesn't have a client_id
 * - You want to use platform-wide Twilio settings
 * 
 * @param supabase - Supabase client instance
 * @returns Resolution result with credentials or error
 */
export async function resolveAdminTwilioCredentials(
  supabase: SupabaseClient
): Promise<TwilioResolutionResult> {
  const startTime = performance.now();
  const fallbackChain: FallbackChainItem[] = [];

  console.log('[TWILIO-HIERARCHY] Resolving admin-level credentials (no clientId provided)');

  try {
    // ========================================
    // Step 1: Try Admin/Master-level Twilio
    // ========================================
    const { data: settings, error: settingsError } = await supabase
      .from('sms_provider_settings')
      .select(`
        admin_twilio_account_sid,
        admin_twilio_auth_token_encrypted,
        admin_twilio_phone_number,
        admin_twilio_enabled,
        admin_twilio_validated_at,
        admin_twilio_friendly_name
      `)
      .limit(1)
      .single();

    const adminValidated = settings?.admin_twilio_validated_at != null;
    const adminEnabled = settings?.admin_twilio_enabled ?? false;

    console.log('[TWILIO-HIERARCHY] Admin-level check:', JSON.stringify({
      hasSettings: !!settings,
      settingsError: settingsError?.message,
      adminEnabled,
      adminValidated,
      hasAccountSid: !!settings?.admin_twilio_account_sid,
      hasPhoneNumber: !!settings?.admin_twilio_phone_number,
    }));

    fallbackChain.push({
      level: 'admin',
      name: settings?.admin_twilio_friendly_name || 'Platform Master',
      enabled: adminEnabled,
      validated: adminValidated,
      circuitOpen: false,
      staleValidation: false,
      reason: (adminEnabled && adminValidated && settings?.admin_twilio_account_sid) 
        ? undefined 
        : getUnavailableReason(adminEnabled, adminValidated, false, false),
    });

    if (!settingsError && adminEnabled && settings?.admin_twilio_account_sid && settings?.admin_twilio_phone_number) {
      try {
        const authToken = await decryptAuthToken(settings.admin_twilio_auth_token_encrypted);
        
        console.log(`[TWILIO-HIERARCHY] Using admin-level Twilio: ${settings.admin_twilio_friendly_name || 'Platform Master'}, phone: ${settings.admin_twilio_phone_number}`);
        
        return {
          success: true,
          credentials: {
            accountSid: settings.admin_twilio_account_sid,
            authToken,
            fromNumber: settings.admin_twilio_phone_number,
            level: 'admin',
            entityId: null,
            entityName: settings.admin_twilio_friendly_name || 'Platform Master',
          },
          fallbackChain,
          fallbackOccurred: false,
          resolutionTimeMs: performance.now() - startTime,
        };
      } catch (decryptError) {
        console.error('[TWILIO-HIERARCHY] Failed to decrypt admin token:', decryptError);
      }
    }

    // ========================================
    // No valid configuration found - FAIL (no env var fallback)
    // ========================================
    console.error('[TWILIO-HIERARCHY] No valid admin-level Twilio configuration found');
    console.error('[TWILIO-HIERARCHY] Fallback chain:', JSON.stringify(fallbackChain, null, 2));
    
    return {
      success: false,
      fallbackChain,
      fallbackOccurred: true,
      fallbackReason: 'No valid admin-level configuration',
      error: 'No valid Twilio configuration found. Please configure admin-level Twilio in SMS Provider Settings.',
      resolutionTimeMs: performance.now() - startTime,
    };

  } catch (error) {
    console.error('[TWILIO-HIERARCHY] Admin resolution error:', error);
    
    return {
      success: false,
      fallbackChain,
      fallbackOccurred: false,
      error: error instanceof Error ? error.message : 'Unknown error during admin credential resolution',
      resolutionTimeMs: performance.now() - startTime,
    };
  }
}

/**
 * Record a Twilio send failure and potentially open circuit breaker
 * 
 * @param level - The level that failed
 * @param entityId - The entity ID (null for admin)
 * @param error - The error that occurred
 * @param supabase - Supabase client instance
 */
export async function recordTwilioFailure(
  level: TwilioLevel,
  entityId: string | null,
  error: string,
  supabase: SupabaseClient
): Promise<void> {
  if (level === 'env') return; // Can't record failures for env vars
  
  const now = new Date().toISOString();
  
  try {
    if (level === 'client' && entityId) {
      // Get current failure count
      const { data: client } = await supabase
        .from('clients')
        .select('twilio_failure_count')
        .eq('id', entityId)
        .single();
      
      const newFailureCount = (client?.twilio_failure_count || 0) + 1;
      
      const updateData: Record<string, unknown> = {
        twilio_failure_count: newFailureCount,
        twilio_last_error: error,
        twilio_last_error_at: now,
      };
      
      // Open circuit breaker if threshold reached
      if (newFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        updateData.twilio_circuit_open_until = new Date(Date.now() + CIRCUIT_BREAKER_TIMEOUT_MS).toISOString();
        console.log(`[TWILIO-HIERARCHY] Opening circuit breaker for client ${entityId}`);
      }
      
      await supabase
        .from('clients')
        .update(updateData)
        .eq('id', entityId);
        
    } else if (level === 'agency' && entityId) {
      // Similar logic for agency
      const { data: agency } = await supabase
        .from('agencies')
        .select('twilio_failure_count')
        .eq('id', entityId)
        .single();
      
      const newFailureCount = (agency?.twilio_failure_count || 0) + 1;
      
      const updateData: Record<string, unknown> = {
        twilio_failure_count: newFailureCount,
        twilio_last_error: error,
        twilio_last_error_at: now,
      };
      
      if (newFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        updateData.twilio_circuit_open_until = new Date(Date.now() + CIRCUIT_BREAKER_TIMEOUT_MS).toISOString();
        console.log(`[TWILIO-HIERARCHY] Opening circuit breaker for agency ${entityId}`);
      }
      
      await supabase
        .from('agencies')
        .update(updateData)
        .eq('id', entityId);
        
    } else if (level === 'admin') {
      await supabase
        .from('sms_provider_settings')
        .update({
          admin_twilio_last_error: error,
          admin_twilio_last_error_at: now,
        });
    }
  } catch (updateError) {
    console.error('[TWILIO-HIERARCHY] Failed to record failure:', updateError);
  }
}

/**
 * Record a successful Twilio send and reset failure count
 * 
 * @param level - The level that succeeded
 * @param entityId - The entity ID (null for admin)
 * @param supabase - Supabase client instance
 */
export async function recordTwilioSuccess(
  level: TwilioLevel,
  entityId: string | null,
  supabase: SupabaseClient
): Promise<void> {
  if (level === 'env') return;
  
  try {
    if (level === 'client' && entityId) {
      await supabase
        .from('clients')
        .update({
          twilio_failure_count: 0,
          twilio_circuit_open_until: null,
          twilio_current_month_usage: supabase.rpc('increment_twilio_usage', { 
            p_level: 'client', 
            p_entity_id: entityId 
          }),
        })
        .eq('id', entityId);
        
    } else if (level === 'agency' && entityId) {
      await supabase
        .from('agencies')
        .update({
          twilio_failure_count: 0,
          twilio_circuit_open_until: null,
        })
        .eq('id', entityId);
      
      // Increment usage
      await supabase.rpc('increment_twilio_usage', { 
        p_level: 'agency', 
        p_entity_id: entityId 
      });
    }
  } catch (updateError) {
    console.error('[TWILIO-HIERARCHY] Failed to record success:', updateError);
  }
}

/**
 * Log a fallback event to the database
 */
export async function logFallbackEvent(
  clientId: string,
  attemptedLevel: TwilioLevel,
  actualLevel: TwilioLevel,
  reason: string,
  smsDeliveryLogId: string | null,
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase
      .from('twilio_fallback_events')
      .insert({
        client_id: clientId,
        attempted_level: attemptedLevel,
        actual_level_used: actualLevel,
        reason,
        sms_delivery_log_id: smsDeliveryLogId,
      });
  } catch (error) {
    console.error('[TWILIO-HIERARCHY] Failed to log fallback event:', error);
  }
}
