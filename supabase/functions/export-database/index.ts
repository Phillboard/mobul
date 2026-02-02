/**
 * Export Database Edge Function
 * 
 * Admin-only function that exports all database tables to JSON.
 * Used for backups and data analysis.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { handleCORS } from '../_shared/cors.ts';

// ============================================================================
// Types
// ============================================================================

interface TableExportMeta {
  count: number;
  error?: string;
}

interface ExportDatabaseResponse {
  success: boolean;
  exported_at: string;
  exported_by: string;
  total_tables: number;
  total_records: number;
  metadata: Record<string, TableExportMeta>;
  data: Record<string, unknown[]>;
}

// ============================================================================
// Constants - Tables to Export
// ============================================================================

const TABLES = [
  'organizations',
  'clients',
  'profiles',
  'user_roles',
  'permissions',
  'role_permissions',
  'user_permissions',
  'org_members',
  'client_users',
  'gift_card_brands',
  'gift_card_pools',
  'gift_cards',
  'campaigns',
  'campaign_conditions',
  'campaign_reward_configs',
  'campaign_versions',
  'campaign_comments',
  'campaign_approvals',
  'campaign_drafts',
  'campaign_prototypes',
  'audiences',
  'recipients',
  'contacts',
  'contact_lists',
  'contact_list_members',
  'contact_tags',
  'contact_custom_field_definitions',
  'contact_campaign_participation',
  'templates',
  'landing_pages',
  'ace_forms',
  'ace_form_submissions',
  'tracked_phone_numbers',
  'call_sessions',
  'call_conditions_met',
  'call_center_scripts',
  'bulk_code_uploads',
  'gift_card_deliveries',
  'sms_delivery_log',
  'crm_integrations',
  'crm_events',
  'webhooks',
  'zapier_connections',
  'api_keys',
  'design_versions',
  'qr_code_configs',
  'documentation_pages',
  'documentation_views',
  'documentation_feedback',
  'brand_kits',
  'simulation_batches',
  'admin_gift_card_inventory',
  'admin_card_sales',
  'gift_card_audit_log',
  'gift_card_balance_history',
  'performance_metrics',
  'rate_limit_tracking',
  'system_alerts',
  'error_logs',
  'admin_impersonations',
  'user_invitations',
  'login_history',
  'leads',
  'dr_phillip_chats',
  'agency_client_assignments',
];

// ============================================================================
// Main Handler
// ============================================================================

async function handleExportDatabase(
  _request: unknown,
  context: AuthContext
): Promise<Response> {
  const supabase = createServiceClient();

  console.log(`[EXPORT-DATABASE] Starting export by admin user: ${context.user.id}`);

  const exportData: Record<string, unknown[]> = {};
  const exportMeta: Record<string, TableExportMeta> = {};

  for (const table of TABLES) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.error(`[EXPORT-DATABASE] Error exporting ${table}:`, error);
        exportMeta[table] = { count: 0, error: error.message };
      } else {
        exportData[table] = data || [];
        exportMeta[table] = { count: count || 0 };
        console.log(`[EXPORT-DATABASE] Exported ${count || 0} records from ${table}`);
      }
    } catch (err) {
      console.error(`[EXPORT-DATABASE] Failed to export ${table}:`, err);
      exportMeta[table] = { count: 0, error: String(err) };
    }
  }

  const totalRecords = Object.values(exportMeta).reduce((sum, meta) => sum + meta.count, 0);

  const result: ExportDatabaseResponse = {
    success: true,
    exported_at: new Date().toISOString(),
    exported_by: context.user.id,
    total_tables: TABLES.length,
    total_records: totalRecords,
    metadata: exportMeta,
    data: exportData,
  };

  console.log(`[EXPORT-DATABASE] Complete: ${totalRecords} records from ${TABLES.length} tables`);

  const filename = `database-export-${new Date().toISOString().split('T')[0]}.json`;

  return new Response(JSON.stringify(result, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

// ============================================================================
// Custom handler to return Response directly (export needs custom Content-Disposition)
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const supabase = createServiceClient();

    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new ApiError('No authorization header', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Check admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new ApiError('Admin access required', 'FORBIDDEN', 403);
    }

    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email || '',
        role: roleData.role,
      },
      organization_id: roleData.organization_id || null,
      client: supabase,
    };

    return await handleExportDatabase(null, context);

  } catch (error) {
    console.error('[EXPORT-DATABASE] Error:', error);

    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: error.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Database export failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
