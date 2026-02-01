/**
 * Hybrid Data Transfer Script
 * Uses PostgreSQL direct connection for OLD database (to bypass RLS)
 * Uses Supabase API with service role key for NEW database
 */

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

// OLD Database - Direct PostgreSQL connection via pooler (bypasses RLS)
// Using transaction pooler which has better connectivity
const OLD_DB_URL = 'postgresql://postgres.arzthloosvnasokxygfo:pNpNunNHoRiY8cSPlq8ZEVvdxz8u_xGg@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

// NEW Database - Supabase API with service role key
const NEW_SUPABASE_URL = 'https://uibvxhwhkatjcwghnzpu.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5OTczMSwiZXhwIjoyMDgwMTc1NzMxfQ.4O-waCA6WwxgtALsADUmdUTXlSPo82hHJ7qZB4BzYuo';

// Tables to transfer in dependency order
const TABLES_IN_ORDER = [
  // Core system tables (parents first)
  'organizations',
  'clients',
  'profiles',
  
  // User management
  'user_roles',
  'org_members', 
  'client_users',
  'permissions',
  'role_permissions',
  'role_hierarchy',
  'permission_templates',
  'user_permissions',
  
  // Gift card system
  'gift_card_brands',
  'gift_card_api_providers',
  'gift_card_pools',
  'gift_cards',
  
  // Content
  'templates',
  'landing_pages',
  'brand_kits',
  'ace_forms',
  
  // Contacts and lists
  'contact_lists',
  'contacts',
  'contact_list_members',
  'contact_tags',
  
  // Campaigns
  'audiences',
  'campaigns',
  'campaign_conditions',
  'campaign_reward_configs',
  'campaign_drafts',
  'campaign_comments',
  'call_center_scripts',
  
  // Recipients and events
  'recipients',
  'contact_campaign_participation',
  'events',
  'ace_form_submissions',
  'recipient_audit_log',
  
  // Analytics and misc
  'print_batches',
  'simulation_batches',
  'documentation_pages',
  'documentation_views',
  'lead_filter_presets',
  'lead_sources',
  'mail_provider_settings',
  'vendors',
  'suppressed_addresses',
  'admin_impersonations',
  'agency_client_assignments',
  'beta_feedback',
  'dr_phillip_chats',
  'rate_limit_tracking',
  'user_dashboard_preferences',
  'user_table_preferences',
];

interface TransferStats {
  table: string;
  oldCount: number;
  transferred: number;
  errors: string[];
}

async function getTableData(pgClient: Client, table: string): Promise<any[]> {
  try {
    const result = await pgClient.query(`SELECT * FROM public."${table}"`);
    return result.rows;
  } catch (err: any) {
    return [];
  }
}

async function upsertToSupabase(supabase: any, table: string, rows: any[]): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) {
    return { inserted: 0, errors: [] };
  }

  const errors: string[] = [];
  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from(table)
        .upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: true 
        });

      if (error) {
        // Try inserting one by one if batch fails
        for (const row of batch) {
          try {
            const { error: singleError } = await supabase
              .from(table)
              .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
            
            if (!singleError) {
              inserted++;
            }
          } catch {
            // Skip this row
          }
        }
        if (error.message && !errors.includes(error.message.substring(0, 80))) {
          errors.push(error.message.substring(0, 80));
        }
      } else {
        inserted += batch.length;
      }
    } catch (err: any) {
      errors.push(err.message?.substring(0, 80) || 'Unknown error');
    }
  }

  return { inserted, errors };
}

async function transferTable(pgClient: Client, supabase: any, table: string): Promise<TransferStats> {
  const stats: TransferStats = {
    table,
    oldCount: 0,
    transferred: 0,
    errors: []
  };

  try {
    // Fetch from OLD PostgreSQL
    const data = await getTableData(pgClient, table);
    stats.oldCount = data.length;

    if (data.length === 0) {
      console.log(`   ➖ ${table}: empty`);
      return stats;
    }

    console.log(`   📦 ${table}: ${data.length} rows...`);

    // Insert to NEW via Supabase API
    const { inserted, errors } = await upsertToSupabase(supabase, table, data);
    stats.transferred = inserted;
    stats.errors = errors;

    if (errors.length > 0) {
      console.log(`      ⚠️ ${inserted}/${data.length} (errors: ${errors[0]})`);
    } else if (inserted === data.length) {
      console.log(`      ✅ ${inserted}/${data.length}`);
    } else {
      console.log(`      ✅ ${inserted}/${data.length} (some duplicates skipped)`);
    }

  } catch (err: any) {
    console.log(`   ❌ ${table}: ${err.message}`);
    stats.errors.push(err.message);
  }

  return stats;
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       MOBUL - DATABASE MIGRATION                    ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  FROM: arzthloosvnasokxygfo (OLD)                        ║');
  console.log('║  TO:   uibvxhwhkatjcwghnzpu (NEW)                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Connect to OLD database via PostgreSQL
  console.log('🔌 Connecting to OLD database (PostgreSQL)...');
  const pgClient = new Client({ 
    connectionString: OLD_DB_URL, 
    ssl: { rejectUnauthorized: false } 
  });

  try {
    await pgClient.connect();
    console.log('   ✅ Connected to OLD database');
  } catch (err: any) {
    console.error('   ❌ Failed:', err.message);
    process.exit(1);
  }

  // Connect to NEW database via Supabase API
  console.log('🔌 Connecting to NEW database (Supabase API)...');
  const supabase = createClient(NEW_SUPABASE_URL, NEW_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  
  // Test connection
  const { error: testError } = await supabase.from('organizations').select('count').limit(1);
  if (testError) {
    console.error('   ❌ Failed:', testError.message);
    await pgClient.end();
    process.exit(1);
  }
  console.log('   ✅ Connected to NEW database');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                  TRANSFERRING DATA');
  console.log('═══════════════════════════════════════════════════════════');

  const allStats: TransferStats[] = [];

  for (const table of TABLES_IN_ORDER) {
    const stats = await transferTable(pgClient, supabase, table);
    allStats.push(stats);
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                      SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  let totalOld = 0;
  let totalTransferred = 0;
  let tablesWithData = 0;

  for (const stat of allStats) {
    totalOld += stat.oldCount;
    totalTransferred += stat.transferred;
    if (stat.oldCount > 0) tablesWithData++;
  }

  console.log('');
  console.log(`📊 RESULTS:`);
  console.log(`   ├─ Tables processed:    ${allStats.length}`);
  console.log(`   ├─ Tables with data:    ${tablesWithData}`);
  console.log(`   ├─ Total rows in OLD:   ${totalOld.toLocaleString()}`);
  console.log(`   ├─ Total transferred:   ${totalTransferred.toLocaleString()}`);
  console.log(`   └─ Success rate:        ${totalOld > 0 ? ((totalTransferred / totalOld) * 100).toFixed(1) : 100}%`);

  // Top tables
  const topTables = allStats
    .filter(s => s.oldCount > 0)
    .sort((a, b) => b.transferred - a.transferred)
    .slice(0, 10);

  if (topTables.length > 0) {
    console.log('');
    console.log('📋 TOP TABLES TRANSFERRED:');
    for (const t of topTables) {
      const icon = t.transferred === t.oldCount ? '✅' : '⚠️';
      console.log(`   ${icon} ${t.table}: ${t.transferred}/${t.oldCount}`);
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              🎉 MIGRATION COMPLETE! 🎉                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  await pgClient.end();
}

main().catch(console.error);

