/**
 * Twilio Configuration Types
 * 
 * Types for the hierarchical Twilio configuration system.
 */

export type TwilioLevel = 'client' | 'agency' | 'admin' | 'env';

export interface TwilioOwnConfig {
  configured: boolean;
  enabled: boolean;
  validated: boolean;
  validatedAt: string | null;
  phoneNumber: string | null;
  accountSidLast4: string | null;
  friendlyName: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  needsRevalidation: boolean;
  circuitOpen: boolean;
  circuitOpensAt: string | null;
  monthlyLimit: number | null;
  currentMonthUsage: number;
  configVersion: number;
}

export interface TwilioActiveConfig {
  level: TwilioLevel;
  entityId: string | null;
  entityName: string;
  phoneNumber: string;
  reason: string;
}

export interface TwilioFallbackChainItem {
  level: TwilioLevel;
  name: string;
  available: boolean;
  reason: string;
}

export interface TwilioStatusResponse {
  success: boolean;
  ownConfig: TwilioOwnConfig;
  activeConfig: TwilioActiveConfig | null;
  fallbackChain: TwilioFallbackChainItem[];
  error?: string;
}

export interface TwilioTestResult {
  success: boolean;
  accountName?: string;
  accountStatus?: string;
  accountType?: string;
  phoneCapabilities?: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
  phoneFriendlyName?: string;
  balance?: number;
  error?: string;
  errorCode?: string;
}

export interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
}

export interface TwilioConfigFormData {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  enabled: boolean;
  friendlyName?: string;
  monthlyLimit?: number;
}

export interface UpdateTwilioConfigParams {
  level: 'client' | 'agency' | 'admin';
  entityId?: string;
  config: TwilioConfigFormData;
  skipValidation?: boolean;
  expectedVersion?: number;
}

export interface TwilioHealthStats {
  totalAgencies: number;
  agenciesWithOwnTwilio: number;
  totalClients: number;
  clientsWithOwnTwilio: number;
  clientsUsingAgencyFallback: number;
  clientsUsingAdminFallback: number;
  staleValidationCount: number;
  recentFailureCount: number;
  openCircuitCount: number;
}

// Status badge types
export type TwilioStatusType = 
  | 'own_active'      // Green - using own configured Twilio
  | 'own_stale'       // Yellow - own config needs revalidation
  | 'fallback_agency' // Blue - using agency fallback
  | 'fallback_admin'  // Blue - using platform fallback
  | 'fallback_error'  // Orange - using fallback due to error
  | 'unavailable';    // Red - no Twilio available

export function getTwilioStatusType(
  ownConfig: TwilioOwnConfig | null, 
  activeConfig: TwilioActiveConfig | null
): TwilioStatusType {
  if (!activeConfig) return 'unavailable';
  
  if (ownConfig?.configured && ownConfig.enabled) {
    if (activeConfig.level === 'client' || activeConfig.level === 'agency') {
      if (ownConfig.needsRevalidation) return 'own_stale';
      if (ownConfig.lastError) return 'fallback_error';
      return 'own_active';
    }
  }
  
  if (activeConfig.level === 'agency') return 'fallback_agency';
  if (activeConfig.level === 'admin') return 'fallback_admin';
  if (activeConfig.level === 'env') return 'fallback_admin';
  
  return 'unavailable';
}
