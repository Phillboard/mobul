/**
 * Environment Validation Function
 * 
 * Validates that all required environment variables are configured
 * for the gift card provisioning and SMS systems.
 * 
 * Usage:
 * - Call this function from admin panel to check system configuration
 * - Returns detailed status of all required and optional environment variables
 * - Shows active SMS provider configuration (Infobip/Twilio)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCurrentProviderConfig } from '../_shared/sms-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  category: string;
  variable: string;
  required: boolean;
  configured: boolean;
  value?: string; // Masked value
  status: 'ok' | 'warning' | 'error';
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: ValidationResult[] = [];

    // Helper function to check and mask environment variables
    const checkEnvVar = (
      category: string,
      varName: string,
      required: boolean,
      maskValue: boolean = true
    ): ValidationResult => {
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
    };

    // Helper to mask sensitive values
    const maskEnvValue = (value: string): string => {
      if (value.length <= 8) return '****';
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    };

    // =====================================================
    // REQUIRED: Supabase Core
    // =====================================================
    
    results.push(checkEnvVar('Supabase Core', 'SUPABASE_URL', true, false));
    results.push(checkEnvVar('Supabase Core', 'SUPABASE_SERVICE_ROLE_KEY', true));
    results.push(checkEnvVar('Supabase Core', 'SUPABASE_ANON_KEY', true));

    // =====================================================
    // SMS Provider: Infobip (Primary)
    // =====================================================
    
    results.push(checkEnvVar('Infobip SMS (Primary)', 'INFOBIP_API_KEY', false));
    results.push(checkEnvVar('Infobip SMS (Primary)', 'INFOBIP_BASE_URL', false, false));
    results.push(checkEnvVar('Infobip SMS (Primary)', 'INFOBIP_SENDER_ID', false, false));

    // =====================================================
    // SMS Provider: Twilio (Fallback)
    // =====================================================
    
    results.push(checkEnvVar('Twilio SMS (Fallback)', 'TWILIO_ACCOUNT_SID', false));
    results.push(checkEnvVar('Twilio SMS (Fallback)', 'TWILIO_AUTH_TOKEN', false));
    
    // Check for from number (either name works)
    const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');
    results.push({
      category: 'Twilio SMS (Fallback)',
      variable: 'TWILIO_FROM_NUMBER',
      required: false,
      configured: !!twilioFromNumber,
      value: twilioFromNumber,
      status: twilioFromNumber ? 'ok' : 'warning',
      message: twilioFromNumber 
        ? 'Configured' 
        : 'Not set (set TWILIO_FROM_NUMBER or TWILIO_PHONE_NUMBER for fallback)',
    });

    // =====================================================
    // OPTIONAL: Tillo Gift Card API
    // =====================================================
    
    results.push(checkEnvVar('Tillo API (Optional)', 'TILLO_API_KEY', false));
    results.push(checkEnvVar('Tillo API (Optional)', 'TILLO_SECRET_KEY', false));
    results.push(checkEnvVar('Tillo API (Optional)', 'TILLO_BASE_URL', false, false));

    // =====================================================
    // OPTIONAL: Legacy EZ Texting (Deprecated)
    // =====================================================
    
    results.push(checkEnvVar('EZ Texting (Deprecated)', 'EZTEXTING_USERNAME', false));
    results.push(checkEnvVar('EZ Texting (Deprecated)', 'EZTEXTING_PASSWORD', false));

    // =====================================================
    // OPTIONAL: Support Contact Info
    // =====================================================
    
    results.push(checkEnvVar('Support Info', 'COMPANY_NAME', false, false));
    results.push(checkEnvVar('Support Info', 'SUPPORT_PHONE_NUMBER', false, false));
    results.push(checkEnvVar('Support Info', 'SUPPORT_EMAIL', false, false));

    // =====================================================
    // OPTIONAL: Twilio Call Tracking
    // =====================================================
    
    results.push(checkEnvVar('Twilio Call Tracking', 'TWILIO_PHONE_NUMBER_POOL_SID', false));

    // =====================================================
    // Get SMS Provider Configuration
    // =====================================================
    
    let smsProviderConfig = null;
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      );
      smsProviderConfig = await getCurrentProviderConfig(supabaseClient);
    } catch (err) {
      console.warn('[VALIDATE-ENV] Could not fetch SMS provider config:', err);
    }

    // =====================================================
    // Generate Summary
    // =====================================================
    
    // Check if at least one SMS provider is configured
    const infobipConfigured = !!Deno.env.get('INFOBIP_API_KEY');
    const twilioConfigured = !!(
      Deno.env.get('TWILIO_ACCOUNT_SID') &&
      Deno.env.get('TWILIO_AUTH_TOKEN') &&
      twilioFromNumber
    );
    const hasAnySmsProvider = infobipConfigured || twilioConfigured;

    // Add SMS provider availability check
    if (!hasAnySmsProvider) {
      results.push({
        category: 'SMS System',
        variable: 'ANY_SMS_PROVIDER',
        required: true,
        configured: false,
        status: 'error',
        message: 'CRITICAL: No SMS provider configured. Set either Infobip or Twilio credentials.',
      });
    } else {
      results.push({
        category: 'SMS System',
        variable: 'ANY_SMS_PROVIDER',
        required: true,
        configured: true,
        status: 'ok',
        message: `Active provider: ${smsProviderConfig?.activeProvider || (infobipConfigured ? 'infobip' : 'twilio')}`,
      });
    }

    const summary = {
      total: results.length,
      configured: results.filter(r => r.configured).length,
      errors: results.filter(r => r.status === 'error').length,
      warnings: results.filter(r => r.status === 'warning').length,
      healthy: results.filter(r => r.status === 'error').length === 0,
    };

    // Group by category
    const byCategory = results.reduce((acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    }, {} as Record<string, ValidationResult[]>);

    // =====================================================
    // Generate Recommendations
    // =====================================================
    
    const recommendations: string[] = [];

    if (summary.errors > 0) {
      recommendations.push('⚠️ CRITICAL: Fix required environment variables before using the system');
    }

    // SMS Provider recommendations
    if (!infobipConfigured && !twilioConfigured) {
      recommendations.push('🔴 CRITICAL: Configure at least one SMS provider (Infobip or Twilio)');
    } else if (infobipConfigured && !twilioConfigured) {
      recommendations.push('💡 TIP: Configure Twilio as a fallback SMS provider for reliability');
    } else if (!infobipConfigured && twilioConfigured) {
      recommendations.push('💡 TIP: Configure Infobip as primary SMS provider for better rates');
    } else {
      recommendations.push('✅ Both SMS providers configured - fallback enabled');
    }

    // Show active SMS provider info
    if (smsProviderConfig) {
      recommendations.push(`📱 Active SMS Provider: ${smsProviderConfig.activeProvider.toUpperCase()}`);
      if (smsProviderConfig.settings.enableFallback) {
        recommendations.push(`🔄 Fallback: Enabled (will try ${smsProviderConfig.settings.primaryProvider === 'infobip' ? 'Twilio' : 'Infobip'} if primary fails)`);
      }
    }

    const tilloConfigured = results.find(r => r.variable === 'TILLO_API_KEY')?.configured;
    if (!tilloConfigured) {
      recommendations.push('💡 TIP: Configure Tillo API credentials to enable automatic gift card provisioning when inventory is empty');
    }

    const ezTextingConfigured = results.find(r => r.variable === 'EZTEXTING_USERNAME')?.configured;
    if (ezTextingConfigured) {
      recommendations.push('⚠️ DEPRECATED: EZ Texting credentials detected but no longer used. System now uses Infobip/Twilio for SMS.');
    }

    const supportConfigured = results.find(r => r.variable === 'COMPANY_NAME')?.configured;
    if (!supportConfigured) {
      recommendations.push('💡 TIP: Set COMPANY_NAME, SUPPORT_PHONE_NUMBER, and SUPPORT_EMAIL for better user experience');
    }

    // =====================================================
    // Return Results
    // =====================================================

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        smsProvider: smsProviderConfig ? {
          activeProvider: smsProviderConfig.activeProvider,
          primaryProvider: smsProviderConfig.settings.primaryProvider,
          fallbackEnabled: smsProviderConfig.settings.enableFallback,
          infobipAvailable: smsProviderConfig.infobipAvailable,
          twilioAvailable: smsProviderConfig.twilioAvailable,
        } : null,
        byCategory,
        recommendations,
        timestamp: new Date().toISOString(),
      }, null, 2),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[VALIDATE-ENV] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
