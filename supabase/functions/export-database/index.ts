import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    console.log(`Starting database export by admin user: ${user.id}`);

    // List of all tables to export
    const tables = [
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

    const exportData: Record<string, any[]> = {};
    const exportMeta: Record<string, { count: number; error?: string }> = {};

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' });

        if (error) {
          console.error(`Error exporting ${table}:`, error);
          exportMeta[table] = { count: 0, error: error.message };
        } else {
          exportData[table] = data || [];
          exportMeta[table] = { count: count || 0 };
          console.log(`Exported ${count || 0} records from ${table}`);
        }
      } catch (err) {
        console.error(`Failed to export ${table}:`, err);
        exportMeta[table] = { count: 0, error: String(err) };
      }
    }

    const totalRecords = Object.values(exportMeta).reduce((sum, meta) => sum + meta.count, 0);

    return new Response(
      JSON.stringify({
        success: true,
        exported_at: new Date().toISOString(),
        exported_by: user.id,
        total_tables: tables.length,
        total_records: totalRecords,
        metadata: exportMeta,
        data: exportData,
      }, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="database-export-${new Date().toISOString()}.json"`
        } 
      }
    );
  } catch (error) {
    console.error('Database export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database export failed';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
