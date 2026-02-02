/**
 * Environment Validation Function
 * 
 * Validates that all required environment variables are configured
 * for the gift card provisioning and SMS systems.
 * 
 * Admin-only endpoint.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { getCurrentProviderConfig } from '../_shared/sms-provider.ts';

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  category: string;
  variable: string;
  required: boolean;
  configured: boolean;
  value?: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

interface ValidateEnvironmentResponse {
  success: boolean;
  summary: {
    total: number;
    configured: number;
    errors: number;
    warnings: number;
    healthy: boolean;
  };
  smsProvider: {
    activeProvider: string;
    primaryProvider: string;
    fallbackEnabled: boolean;
    fallbackChain: string[];
    notificationapiAvailable: boolean;
    infobipAvailable: boolean;
    twilioAvailable: boolean;
  } | null;
  byCategory: Record<string, ValidationResult[]>;
  recommendations: string[];
  timestamp: string;
}

// ============================================================================
// Helpers
// ============================================================================

function maskEnvValue(value: string): string {
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function checkEnvVar(
  category: string,
  varName: string,
  required: boolean,
  maskValue: boolean = true
): ValidationResult {
  const value = Deno.env.get(varName);
  const configured = !!value;

  let status: 'ok' | 'warning' | 'error' = 'ok';
  let message = 'Configured';

  if (!configured) {
    status = required ? 'error' : 'warning';
    message = required
      ? 'REQUIRED but not set'
      : 'Optional - not configured';
  }

  return {
    category,
    variable: varName,
    required,
    configured,
    value: configured && !maskValue ? value : configured ? maskEnvValue(value!) : undefined,
    status,
    message,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleValidateEnvironment(
  _request: unknown,
  _context: AuthContext
): Promise<ValidateEnvironmentResponse> {
  const results: ValidationResult[] = [];

  // Supabase Core
  results.push(checkEnvVar('Supabase Core', 'SUPABASE_URL', true, false));
  results.push(checkEnvVar('Supabase Core', 'SUPABASE_SERVICE_ROLE_KEY', true));
  results.push(checkEnvVar('Supabase Core', 'SUPABASE_ANON_KEY', true));

  // NotificationAPI SMS (Primary)
  results.push(checkEnvVar('NotificationAPI SMS (Primary)', 'NOTIFICATIONAPI_CLIENT_ID', false));
  results.push(checkEnvVar('NotificationAPI SMS (Primary)', 'NOTIFICATIONAPI_CLIENT_SECRET', false));
  results.push(checkEnvVar('NotificationAPI SMS (Primary)', 'NOTIFICATIONAPI_NOTIFICATION_ID', false, false));

  // Infobip SMS (Fallback 1)
  results.push(checkEnvVar('Infobip SMS (Fallback 1)', 'INFOBIP_API_KEY', false));
  results.push(checkEnvVar('Infobip SMS (Fallback 1)', 'INFOBIP_BASE_URL', false, false));
  results.push(checkEnvVar('Infobip SMS (Fallback 1)', 'INFOBIP_SENDER_ID', false, false));

  // Twilio SMS (Fallback 2)
  results.push(checkEnvVar('Twilio SMS (Fallback 2)', 'TWILIO_ACCOUNT_SID', false));
  results.push(checkEnvVar('Twilio SMS (Fallback 2)', 'TWILIO_AUTH_TOKEN', false));

  const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
  results.push({
    category: 'Twilio SMS (Fallback 2)',
    variable: 'TWILIO_FROM_NUMBER',
    required: false,
    configured: !!twilioFromNumber,
    value: twilioFromNumber,
    status: twilioFromNumber ? 'ok' : 'warning',
    message: twilioFromNumber
      ? 'Configured'
      : 'Not set (set TWILIO_FROM_NUMBER or TWILIO_PHONE_NUMBER for fallback)',
  });

  // Tillo API (Optional)
  results.push(checkEnvVar('Tillo API (Optional)', 'TILLO_API_KEY', false));
  results.push(checkEnvVar('Tillo API (Optional)', 'TILLO_SECRET_KEY', false));
  results.push(checkEnvVar('Tillo API (Optional)', 'TILLO_BASE_URL', false, false));

  // EZ Texting SMS
  results.push(checkEnvVar('EZ Texting SMS', 'EZTEXTING_USERNAME', false));
  results.push(checkEnvVar('EZ Texting SMS', 'EZTEXTING_PASSWORD', false));

  // Support Info
  results.push(checkEnvVar('Support Info', 'COMPANY_NAME', false, false));
  results.push(checkEnvVar('Support Info', 'SUPPORT_PHONE_NUMBER', false, false));
  results.push(checkEnvVar('Support Info', 'SUPPORT_EMAIL', false, false));

  // Twilio Call Tracking
  results.push(checkEnvVar('Twilio Call Tracking', 'TWILIO_PHONE_NUMBER_POOL_SID', false));

  // Check SMS providers
  const notificationapiConfigured = !!(
    Deno.env.get('NOTIFICATIONAPI_CLIENT_ID') &&
    Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET')
  );
  const infobipConfigured = !!Deno.env.get('INFOBIP_API_KEY');
  const twilioConfigured = !!(
    Deno.env.get('TWILIO_ACCOUNT_SID') &&
    Deno.env.get('TWILIO_AUTH_TOKEN') &&
    twilioFromNumber
  );
  const hasAnySmsProvider = notificationapiConfigured || infobipConfigured || twilioConfigured;
  const configuredProviderCount = [notificationapiConfigured, infobipConfigured, twilioConfigured].filter(Boolean).length;

  // Get SMS Provider Config
  let smsProviderConfig = null;
  try {
    const supabase = createServiceClient();
    smsProviderConfig = await getCurrentProviderConfig(supabase);
  } catch {
    console.warn('[VALIDATE-ENV] Could not fetch SMS provider config');
  }

  // Add SMS system check
  if (!hasAnySmsProvider) {
    results.push({
      category: 'SMS System',
      variable: 'ANY_SMS_PROVIDER',
      required: true,
      configured: false,
      status: 'error',
      message: 'CRITICAL: No SMS provider configured. Set NotificationAPI, Infobip, or Twilio credentials.',
    });
  } else {
    const activeProvider = smsProviderConfig?.activeProvider ||
      (notificationapiConfigured ? 'notificationapi' : infobipConfigured ? 'infobip' : 'twilio');
    results.push({
      category: 'SMS System',
      variable: 'ANY_SMS_PROVIDER',
      required: true,
      configured: true,
      status: 'ok',
      message: `Active provider: ${activeProvider} (${configuredProviderCount} provider(s) configured)`,
    });
  }

  // Generate recommendations
  const recommendations: string[] = [];

  const errorCount = results.filter(r => r.status === 'error').length;
  if (errorCount > 0) {
    recommendations.push('⚠️ CRITICAL: Fix required environment variables before using the system');
  }

  if (!hasAnySmsProvider) {
    recommendations.push('🔴 CRITICAL: Configure at least one SMS provider (NotificationAPI, Infobip, or Twilio)');
  } else {
    if (notificationapiConfigured) {
      recommendations.push('✅ NotificationAPI configured as primary SMS provider');
    } else {
      recommendations.push('💡 TIP: Configure NotificationAPI as primary provider for best performance');
    }

    if (infobipConfigured) {
      recommendations.push('✅ Infobip configured as fallback SMS provider');
    } else if (notificationapiConfigured) {
      recommendations.push('💡 TIP: Configure Infobip as fallback 1 for reliability');
    }

    if (twilioConfigured) {
      recommendations.push('✅ Twilio configured as secondary fallback SMS provider');
    } else if (notificationapiConfigured || infobipConfigured) {
      recommendations.push('💡 TIP: Configure Twilio as fallback 2 for maximum reliability');
    }

    if (configuredProviderCount >= 2) {
      recommendations.push('✅ Multiple SMS providers configured - fallback enabled');
    }
  }

  if (smsProviderConfig) {
    recommendations.push(`📱 Active SMS Provider: ${smsProviderConfig.activeProvider.toUpperCase()}`);
    recommendations.push(`📋 Provider Priority: ${smsProviderConfig.settings.primaryProvider} → ${smsProviderConfig.fallbackChain.join(' → ') || 'no fallback'}`);
    if (smsProviderConfig.settings.enableFallback && smsProviderConfig.fallbackChain.length > 0) {
      recommendations.push(`🔄 Fallback: Enabled (will try ${smsProviderConfig.fallbackChain.join(', ')} if primary fails)`);
    }
  }

  const tilloConfigured = results.find(r => r.variable === 'TILLO_API_KEY')?.configured;
  if (!tilloConfigured) {
    recommendations.push('💡 TIP: Configure Tillo API credentials to enable automatic gift card provisioning when inventory is empty');
  }

  const supportConfigured = results.find(r => r.variable === 'COMPANY_NAME')?.configured;
  if (!supportConfigured) {
    recommendations.push('💡 TIP: Set COMPANY_NAME, SUPPORT_PHONE_NUMBER, and SUPPORT_EMAIL for better user experience');
  }

  // Group by category
  const byCategory = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, ValidationResult[]>);

  const summary = {
    total: results.length,
    configured: results.filter(r => r.configured).length,
    errors: results.filter(r => r.status === 'error').length,
    warnings: results.filter(r => r.status === 'warning').length,
    healthy: results.filter(r => r.status === 'error').length === 0,
  };

  return {
    success: true,
    summary,
    smsProvider: smsProviderConfig ? {
      activeProvider: smsProviderConfig.activeProvider,
      primaryProvider: smsProviderConfig.settings.primaryProvider,
      fallbackEnabled: smsProviderConfig.settings.enableFallback,
      fallbackChain: smsProviderConfig.fallbackChain,
      notificationapiAvailable: smsProviderConfig.notificationapiAvailable,
      infobipAvailable: smsProviderConfig.infobipAvailable,
      twilioAvailable: smsProviderConfig.twilioAvailable,
    } : null,
    byCategory,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleValidateEnvironment, {
  requireAuth: true,
  requiredRole: 'admin',
  parseBody: true,
  auditAction: 'validate_environment',
}));
