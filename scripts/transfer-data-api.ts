/**
 * Data Transfer via Supabase REST API
 * Uses service role keys to bypass RLS on both databases
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// OLD Database
const OLD_URL = 'https://arzthloosvnasokxygfo.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenRobG9vc3ZuYXNva3h5Z2ZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4MzY0OCwiZXhwIjoyMDc4MzU5NjQ4fQ.4099AeSIytZcQM_dn144OrzjtdTkqWMV';

// NEW Database  
const NEW_URL = 'https://uibvxhwhkatjcwghnzpu.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5OTczMSwiZXhwIjoyMDgwMTc1NzMxfQ.4O-waCA6WwxgtALsADUmdUTXlSPo82hHJ7qZB4BzYuo';

// Tables in dependency order (referenced tables first)
const TABLES_IN_ORDER = [
  // 1. Core foundation (no foreign keys)
  'organizations',
  'permissions',
  'role_hierarchy',
  'permission_templates',
  'lead_filter_presets',
  'lead_sources',
  'vendors',
  'gift_card_brands',
  'gift_card_api_providers',
  'documentation_pages',
  
  // 2. Depends on organizations
  'clients',
  'org_members',
  
  // 3. Depends on clients
  'profiles',
  'client_users',
  'templates',
  'landing_pages',
  'brand_kits',
  'ace_forms',
  'contact_lists',
  'contacts',
  'gift_card_pools',
  'audiences',
  'suppressed_addresses',
  'mail_provider_settings',
  'call_center_scripts',
  'agency_client_assignments',
  
  // 4. User-related
  'user_roles',
  'role_permissions',
  'user_permissions',
  'user_dashboard_preferences',
  'user_table_preferences',
  'admin_impersonations',
  'dr_phillip_chats',
  'beta_feedback',
  'documentation_views',
  
  // 5. Depends on contacts
  'contact_list_members',
  'contact_tags',
  
  // 6. Depends on clients/audiences
  'campaigns',
  'gift_cards',
  
  // 7. Depends on campaigns
  'campaign_conditions',
  'campaign_reward_configs',
  'campaign_drafts',
  'campaign_comments',
  'recipients',
  'print_batches',
  'simulation_batches',
  'events',
  
  // 8. Depends on recipients/contacts
  'contact_campaign_participation',
  'ace_form_submissions',
  'recipient_audit_log',
  
  // 9. Misc/tracking
  'rate_limit_tracking',
];

interface Stats {
  table: string;
  oldCount: number;
  transferred: number;
  errors: string[];
}

async function fetchAll(client: SupabaseClient, table: string): Promise<any[]> {
  const allData: any[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(offset, offset + limit - 1);

    if (error || !data || data.length === 0) break;
    
    allData.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  
  return allData;
}

async function upsertBatch(client: SupabaseClient, table: string, rows: any[]): Promise<{ ok: number; errors: string[] }> {
  if (rows.length === 0) return { ok: 0, errors: [] };
  
  const errors: string[] = [];
  let ok = 0;
  const batchSize = 50;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    const { error } = await client
      .from(table)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      // Try one by one
      for (const row of batch) {
        const { error: e2 } = await client
          .from(table)
          .upsert(row, { onConflict: 'id', ignoreDuplicates: true });
        if (!e2) ok++;
        else if (!errors.includes(e2.message?.substring(0, 60))) {
          errors.push(e2.message?.substring(0, 60) || 'Unknown');
        }
      }
    } else {
      ok += batch.length;
    }
  }
  
  return { ok, errors };
}

async function transferTable(oldClient: SupabaseClient, newClient: SupabaseClient, table: string): Promise<Stats> {
  const stats: Stats = { table, oldCount: 0, transferred: 0, errors: [] };

  // Fetch from OLD
  const data = await fetchAll(oldClient, table);
  stats.oldCount = data.length;

  if (data.length === 0) {
    process.stdout.write(`   ➖ ${table.padEnd(35)} 0 rows\n`);
    return stats;
  }

  process.stdout.write(`   📦 ${table.padEnd(35)} ${data.length} rows...`);

  // Insert to NEW
  const { ok, errors } = await upsertBatch(newClient, table, data);
  stats.transferred = ok;
  stats.errors = errors;

  if (errors.length > 0) {
    process.stdout.write(` ⚠️ ${ok}/${data.length}\n`);
  } else {
    process.stdout.write(` ✅ ${ok}/${data.length}\n`);
  }

  return stats;
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           ACE ENGAGE - DATA MIGRATION                         ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  FROM: arzthloosvnasokxygfo (OLD)                             ║');
  console.log('║  TO:   uibvxhwhkatjcwghnzpu (NEW)                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Create clients with service role keys
  const oldClient = createClient(OLD_URL, OLD_SERVICE_KEY, { auth: { persistSession: false } });
  const newClient = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { persistSession: false } });

  // Test connections
  console.log('🔌 Testing connections...');
  
  const { error: oldErr } = await oldClient.from('organizations').select('id').limit(1);
  if (oldErr) {
    console.error('   ❌ OLD database:', oldErr.message);
    process.exit(1);
  }
  console.log('   ✅ Connected to OLD database');

  const { error: newErr } = await newClient.from('organizations').select('id').limit(1);
  if (newErr) {
    console.error('   ❌ NEW database:', newErr.message);
    process.exit(1);
  }
  console.log('   ✅ Connected to NEW database');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                     TRANSFERRING DATA');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const allStats: Stats[] = [];
  
  for (const table of TABLES_IN_ORDER) {
    try {
      const stats = await transferTable(oldClient, newClient, table);
      allStats.push(stats);
    } catch (err: any) {
      console.log(`   ❌ ${table}: ${err.message}`);
      allStats.push({ table, oldCount: 0, transferred: 0, errors: [err.message] });
    }
  }

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                        SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  let totalOld = 0, totalNew = 0, tablesOk = 0;
  
  for (const s of allStats) {
    totalOld += s.oldCount;
    totalNew += s.transferred;
    if (s.oldCount > 0 && s.transferred === s.oldCount) tablesOk++;
  }

  const tablesWithData = allStats.filter(s => s.oldCount > 0);
  const tablesWithIssues = allStats.filter(s => s.errors.length > 0 && s.oldCount > 0);

  console.log('');
  console.log(`   📊 RESULTS:`);
  console.log(`   ├─ Tables processed:     ${allStats.length}`);
  console.log(`   ├─ Tables with data:     ${tablesWithData.length}`);
  console.log(`   ├─ Tables fully synced:  ${tablesOk}`);
  console.log(`   ├─ Total rows in OLD:    ${totalOld.toLocaleString()}`);
  console.log(`   ├─ Total transferred:    ${totalNew.toLocaleString()}`);
  console.log(`   └─ Success rate:         ${totalOld > 0 ? ((totalNew / totalOld) * 100).toFixed(1) : 100}%`);

  if (tablesWithIssues.length > 0) {
    console.log('');
    console.log('   ⚠️ TABLES WITH ISSUES:');
    for (const t of tablesWithIssues.slice(0, 5)) {
      console.log(`      - ${t.table}: ${t.errors[0]}`);
    }
  }

  // Top transferred
  const top = tablesWithData.sort((a, b) => b.transferred - a.transferred).slice(0, 8);
  console.log('');
  console.log('   📋 TOP TABLES:');
  for (const t of top) {
    const icon = t.transferred === t.oldCount ? '✅' : '⚠️';
    console.log(`      ${icon} ${t.table}: ${t.transferred.toLocaleString()}/${t.oldCount.toLocaleString()}`);
  }

  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              🎉 MIGRATION COMPLETE! 🎉                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
}

main().catch(console.error);

