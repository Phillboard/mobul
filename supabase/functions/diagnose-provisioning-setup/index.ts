/**
 * Gift Card Provisioning Diagnostic Function
 * 
 * Comprehensive diagnostic endpoint that checks all aspects of gift card
 * provisioning setup to identify configuration issues BEFORE they cause failures.
 * 
 * Checks:
 * - Campaign configuration
 * - Condition gift card setup
 * - Client/agency credits
 * - Brand availability
 * - Inventory counts
 * - Tillo API configuration
 * - Recent failures
 * - Database function availability
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { PROVISIONING_ERROR_CODES } from '../_shared/error-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticRequest {
  campaignId?: string;
  recipientId?: string;
  conditionId?: string;
  brandId?: string;
  denomination?: number;
}

interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  message: string;
  details?: Record<string, any>;
  recommendation?: string;
  errorCode?: string;
}

interface DiagnosticResult {
  success: boolean;
  timestamp: string;
  overallStatus: 'healthy' | 'issues_found' | 'critical';
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  checks: DiagnosticCheck[];
  recommendations: string[];
  recentFailures?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const requestData: DiagnosticRequest = await req.json().catch(() => ({}));
    const { campaignId, recipientId, conditionId, brandId, denomination } = requestData;

    console.log('[DIAGNOSTIC] Starting comprehensive provisioning diagnostic');
    console.log('[DIAGNOSTIC] Request:', JSON.stringify(requestData, null, 2));

    const checks: DiagnosticCheck[] = [];
    const recommendations: string[] = [];

    // =====================================================
    // CHECK 1: Tillo API Configuration
    // =====================================================
    const tilloApiKey = Deno.env.get('TILLO_API_KEY');
    const tilloSecretKey = Deno.env.get('TILLO_SECRET_KEY');
    const hasTilloConfig = !!(tilloApiKey && tilloSecretKey);

    checks.push({
      name: 'Tillo API Configuration',
      status: hasTilloConfig ? 'pass' : 'warning',
      message: hasTilloConfig 
        ? 'Tillo API credentials are configured' 
        : 'Tillo API is not configured - will rely on uploaded inventory only',
      details: {
        hasApiKey: !!tilloApiKey,
        hasSecretKey: !!tilloSecretKey,
        apiKeyLength: tilloApiKey?.length || 0,
      },
      recommendation: !hasTilloConfig 
        ? 'Configure TILLO_API_KEY and TILLO_SECRET_KEY in Supabase secrets for automatic gift card purchasing' 
        : undefined,
    });

    if (!hasTilloConfig) {
      recommendations.push('Configure Tillo API credentials for automatic gift card provisioning when inventory is exhausted');
    }

    // =====================================================
    // CHECK 2: Database Functions
    // =====================================================
    const requiredFunctions = [
      'claim_gift_card_from_inventory',
      'get_billing_entity_for_campaign',
      'record_billing_transaction',
      'get_inventory_count',
      'get_condition_gift_card_config',
    ];

    let functionCheckPassed = true;
    const functionResults: Record<string, boolean> = {};

    for (const funcName of requiredFunctions) {
      try {
        // Try to call the function with invalid params - if it throws a specific error, the function exists
        const { error } = await supabaseClient.rpc(funcName, {});
        // Even an error about missing params means the function exists
        functionResults[funcName] = true;
      } catch (err) {
        // Check if error is about missing function vs missing params
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('does not exist') || errorMsg.includes('not found')) {
          functionResults[funcName] = false;
          functionCheckPassed = false;
        } else {
          functionResults[funcName] = true; // Function exists but params were wrong
        }
      }
    }

    checks.push({
      name: 'Database Functions',
      status: functionCheckPassed ? 'pass' : 'fail',
      message: functionCheckPassed 
        ? 'All required database functions are available' 
        : 'Some database functions are missing',
      details: functionResults,
      errorCode: !functionCheckPassed ? 'GC-013' : undefined,
      recommendation: !functionCheckPassed 
        ? 'Run database migrations to create missing functions' 
        : undefined,
    });

    // =====================================================
    // CHECK 3: Campaign Configuration (if provided)
    // =====================================================
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('campaigns')
        .select(`
          id,
          campaign_name,
          status,
          client_id,
          clients(id, name, credits)
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        checks.push({
          name: 'Campaign Exists',
          status: 'fail',
          message: 'Campaign not found',
          details: { campaignId, error: campaignError?.message },
          errorCode: 'GC-008',
          recommendation: 'Verify the campaign ID is correct',
        });
      } else {
        checks.push({
          name: 'Campaign Exists',
          status: 'pass',
          message: `Campaign found: ${campaign.campaign_name}`,
          details: { 
            campaignId: campaign.id,
            status: campaign.status,
            clientId: campaign.client_id,
          },
        });

        // Check client credits
        const clientCredits = (campaign.clients as any)?.credits || 0;
        const hasCredits = clientCredits > 0;
        checks.push({
          name: 'Client Credits',
          status: hasCredits ? 'pass' : 'fail',
          message: hasCredits 
            ? `Client has $${clientCredits} credits available` 
            : 'Client has no credits',
          details: {
            clientId: campaign.client_id,
            clientName: (campaign.clients as any)?.name,
            credits: clientCredits,
          },
          errorCode: !hasCredits ? 'GC-006' : undefined,
          recommendation: !hasCredits 
            ? 'Add credits to the client account before provisioning' 
            : undefined,
        });

        // Check campaign conditions
        const { data: conditions, error: conditionsError } = await supabaseClient
          .from('campaign_conditions')
          .select('id, condition_number, condition_name, brand_id, card_value, is_active')
          .eq('campaign_id', campaignId);

        if (conditionsError) {
          checks.push({
            name: 'Campaign Conditions',
            status: 'fail',
            message: 'Failed to fetch campaign conditions',
            details: { error: conditionsError.message },
          });
        } else {
          const totalConditions = conditions?.length || 0;
          const activeConditions = conditions?.filter(c => c.is_active) || [];
          const configuredConditions = conditions?.filter(c => c.brand_id && c.card_value) || [];
          const unconfiguredActive = activeConditions.filter(c => !c.brand_id || !c.card_value);

          const hasIssues = unconfiguredActive.length > 0;

          checks.push({
            name: 'Campaign Conditions Configuration',
            status: hasIssues ? 'fail' : (configuredConditions.length > 0 ? 'pass' : 'warning'),
            message: hasIssues 
              ? `${unconfiguredActive.length} active condition(s) missing gift card config`
              : configuredConditions.length > 0 
                ? `${configuredConditions.length} condition(s) properly configured`
                : 'No conditions configured',
            details: {
              totalConditions,
              activeConditions: activeConditions.length,
              configuredConditions: configuredConditions.length,
              unconfiguredConditions: unconfiguredActive.map(c => ({
                id: c.id,
                name: c.condition_name,
                hasBrand: !!c.brand_id,
                hasValue: !!c.card_value,
              })),
            },
            errorCode: hasIssues ? 'GC-001' : undefined,
            recommendation: hasIssues 
              ? `Edit the campaign and set brand_id and card_value for: ${unconfiguredActive.map(c => c.condition_name || `Condition ${c.condition_number}`).join(', ')}`
              : undefined,
          });

          if (hasIssues) {
            recommendations.push(`Configure gift card settings for ${unconfiguredActive.length} campaign condition(s)`);
          }
        }
      }
    }

    // =====================================================
    // CHECK 4: Brand and Inventory (if provided)
    // =====================================================
    if (brandId) {
      const { data: brand, error: brandError } = await supabaseClient
        .from('gift_card_brands')
        .select('id, brand_name, brand_code, tillo_brand_code, is_enabled_by_admin')
        .eq('id', brandId)
        .single();

      if (brandError || !brand) {
        checks.push({
          name: 'Gift Card Brand',
          status: 'fail',
          message: 'Brand not found',
          details: { brandId, error: brandError?.message },
          errorCode: 'GC-002',
          recommendation: 'Verify the brand ID is correct or choose a different brand',
        });
      } else {
        checks.push({
          name: 'Gift Card Brand',
          status: brand.is_enabled_by_admin ? 'pass' : 'fail',
          message: brand.is_enabled_by_admin 
            ? `Brand found: ${brand.brand_name}` 
            : `Brand "${brand.brand_name}" is disabled`,
          details: {
            brandId: brand.id,
            brandName: brand.brand_name,
            brandCode: brand.brand_code,
            tilloBrandCode: brand.tillo_brand_code,
            isEnabled: brand.is_enabled_by_admin,
            hasTilloCode: !!(brand.tillo_brand_code || brand.brand_code),
          },
          recommendation: !brand.is_enabled_by_admin 
            ? 'Enable this brand in admin settings' 
            : undefined,
        });

        // Check inventory for this brand
        const denom = denomination || 25; // Default if not specified
        const { data: inventoryCount } = await supabaseClient
          .rpc('get_inventory_count', {
            p_brand_id: brandId,
            p_denomination: denom,
          });

        const availableCards = inventoryCount || 0;
        const hasTilloFallback = hasTilloConfig && (brand.tillo_brand_code || brand.brand_code);

        checks.push({
          name: 'Gift Card Inventory',
          status: availableCards > 0 ? 'pass' : (hasTilloFallback ? 'warning' : 'fail'),
          message: availableCards > 0 
            ? `${availableCards} cards available for $${denom}`
            : hasTilloFallback
              ? `No inventory, but Tillo fallback available`
              : `No inventory and no Tillo fallback`,
          details: {
            brandId,
            denomination: denom,
            availableCards,
            hasTilloFallback,
            tilloBrandCode: brand.tillo_brand_code || brand.brand_code,
          },
          errorCode: (availableCards === 0 && !hasTilloFallback) ? 'GC-003' : undefined,
          recommendation: availableCards === 0 
            ? (hasTilloFallback 
                ? 'Cards will be purchased from Tillo on demand' 
                : 'Upload inventory or configure Tillo API')
            : undefined,
        });

        if (availableCards === 0 && !hasTilloFallback) {
          recommendations.push(`Upload gift card inventory for ${brand.brand_name} @ $${denom}, or configure Tillo API`);
        }
      }
    }

    // =====================================================
    // CHECK 5: Recipient (if provided)
    // =====================================================
    if (recipientId) {
      const { data: recipient, error: recipientError } = await supabaseClient
        .from('recipients')
        .select(`
          id,
          first_name,
          last_name,
          redemption_code,
          sms_opt_in_status,
          verification_method,
          disposition
        `)
        .eq('id', recipientId)
        .single();

      if (recipientError || !recipient) {
        checks.push({
          name: 'Recipient',
          status: 'fail',
          message: 'Recipient not found',
          details: { recipientId, error: recipientError?.message },
        });
      } else {
        const isVerified = recipient.sms_opt_in_status === 'opted_in' ||
          recipient.verification_method === 'email' ||
          (recipient.verification_method === 'skipped' && 
            ['verified_verbally', 'already_opted_in', 'vip_customer'].includes(recipient.disposition || ''));

        checks.push({
          name: 'Recipient Verification',
          status: isVerified ? 'pass' : 'warning',
          message: isVerified 
            ? `Recipient verified: ${recipient.first_name} ${recipient.last_name}` 
            : 'Recipient not verified for SMS delivery',
          details: {
            recipientId: recipient.id,
            name: `${recipient.first_name} ${recipient.last_name}`,
            smsOptInStatus: recipient.sms_opt_in_status,
            verificationMethod: recipient.verification_method,
            disposition: recipient.disposition,
            isVerified,
          },
          errorCode: !isVerified ? 'GC-009' : undefined,
          recommendation: !isVerified 
            ? 'Complete SMS opt-in or email verification before provisioning' 
            : undefined,
        });

        // Check if already provisioned
        if (campaignId && brandId) {
          const { data: existingLedger } = await supabaseClient
            .from('gift_card_billing_ledger')
            .select('id, created_at')
            .eq('recipient_id', recipientId)
            .eq('campaign_id', campaignId)
            .eq('brand_id', brandId)
            .limit(1);

          const alreadyProvisioned = existingLedger && existingLedger.length > 0;
          checks.push({
            name: 'Previous Provisioning',
            status: alreadyProvisioned ? 'fail' : 'pass',
            message: alreadyProvisioned 
              ? 'Gift card already provisioned for this recipient/campaign/brand' 
              : 'No previous provisioning found',
            details: alreadyProvisioned ? {
              existingLedgerId: existingLedger[0].id,
              provisionedAt: existingLedger[0].created_at,
            } : {},
            errorCode: alreadyProvisioned ? 'GC-010' : undefined,
          });
        }
      }
    }

    // =====================================================
    // CHECK 6: Recent Failures (last 24 hours)
    // =====================================================
    let recentFailures: any[] = [];
    try {
      const { data: failures } = await supabaseClient
        .rpc('get_recent_provisioning_failures', {
          p_limit: 10,
          p_campaign_id: campaignId || null,
          p_hours: 24,
        });
      
      recentFailures = failures || [];
      
      checks.push({
        name: 'Recent Provisioning Failures',
        status: recentFailures.length === 0 ? 'pass' : 'warning',
        message: recentFailures.length === 0 
          ? 'No failures in the last 24 hours' 
          : `${recentFailures.length} failure(s) in the last 24 hours`,
        details: {
          failureCount: recentFailures.length,
          topErrors: recentFailures.slice(0, 3).map(f => ({
            errorCode: f.error_code,
            step: f.failure_step_name,
            message: f.error_message?.substring(0, 100),
          })),
        },
      });

      if (recentFailures.length > 0) {
        recommendations.push(`Review ${recentFailures.length} recent failure(s) in System Health → Errors`);
      }
    } catch (err) {
      // Function might not exist yet
      checks.push({
        name: 'Recent Provisioning Failures',
        status: 'skipped',
        message: 'Could not check recent failures (trace table may not exist)',
      });
    }

    // =====================================================
    // Compile Results
    // =====================================================
    const summary = {
      totalChecks: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      skipped: checks.filter(c => c.status === 'skipped').length,
    };

    let overallStatus: DiagnosticResult['overallStatus'] = 'healthy';
    if (summary.failed > 0) {
      overallStatus = 'critical';
    } else if (summary.warnings > 0) {
      overallStatus = 'issues_found';
    }

    const result: DiagnosticResult = {
      success: true,
      timestamp: new Date().toISOString(),
      overallStatus,
      summary,
      checks,
      recommendations: [...new Set(recommendations)], // Deduplicate
      recentFailures: recentFailures.length > 0 ? recentFailures : undefined,
    };

    console.log('[DIAGNOSTIC] Completed:', JSON.stringify({
      overallStatus,
      summary,
      recommendationCount: recommendations.length,
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[DIAGNOSTIC] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

