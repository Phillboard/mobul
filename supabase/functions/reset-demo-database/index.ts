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

    console.log(`Starting database reset by admin user: ${user.id}`);

    // Delete in FK-respecting order
    const tablesToDelete = [
      'call_conditions_met',
      'gift_card_deliveries',
      'campaign_reward_configs',
      'campaign_conditions',
      'campaign_versions',
      'campaign_approvals',
      'campaign_comments',
      'campaign_drafts',
      'campaign_prototypes',
      'crm_events',
      'call_sessions',
      'tracked_phone_numbers',
      'contact_campaign_participation',
      'contact_list_members',
      'contact_tags',
      'contact_lists',
      'recipients',
      'contacts',
      'campaigns',
      'audiences',
      'bulk_code_uploads',
      'gift_cards',
      'admin_card_sales',
      'gift_card_pools',
      'admin_gift_card_inventory',
      'gift_card_brands',
      'design_versions',
      'templates',
      'landing_pages',
      'ace_form_submissions',
      'simulation_batches',
      'crm_integrations',
      'webhooks',
    ];

    const deletedCounts: Record<string, number> = {};

    for (const table of tablesToDelete) {
      try {
        const { count, error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) {
          console.error(`Error deleting from ${table}:`, error);
        } else {
          deletedCounts[table] = count || 0;
          console.log(`Deleted ${count || 0} records from ${table}`);
        }
      } catch (err) {
        console.error(`Failed to delete from ${table}:`, err);
        deletedCounts[table] = 0;
      }
    }

    // Log the reset action
    await supabase.from('admin_audit_log').insert({
      user_id: user.id,
      action: 'database_reset',
      details: {
        timestamp: new Date().toISOString(),
        deleted_counts: deletedCounts,
        total_records_deleted: Object.values(deletedCounts).reduce((a, b) => a + b, 0),
      },
    });

    const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Database reset complete. Deleted ${totalDeleted} total records.`,
        deleted_counts: deletedCounts,
        total_deleted: totalDeleted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Database reset error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Database reset failed';
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
