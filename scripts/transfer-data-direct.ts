/**
 * Direct Database Transfer Script
 * Transfers all data from OLD Supabase to NEW Supabase using PostgreSQL connections
 */

import { Client } from 'pg';

// Database connection strings
const OLD_DB_URL = 'postgresql://postgres:pNpNunNHoRiY8cSPlq8ZEVvdxz8u_xGg@db.arzthloosvnasokxygfo.supabase.co:5432/postgres';
const NEW_DB_URL = 'postgresql://postgres.uibvxhwhkatjcwghnzpu:Mobul2025!@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

// Tables to transfer in dependency order (parents first)
const TABLES_IN_ORDER = [
  // Core system tables
  'organizations',
  'clients',
  'profiles',
  
  // User management
  'user_roles',
  'org_members', 
  'client_users',
  'user_permissions',
  'permissions',
  'role_permissions',
  'role_hierarchy',
  'permission_templates',
  
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
  skipped: number;
  errors: string[];
}

async function getTableCount(client: Client, table: string): Promise<number> {
  try {
    const result = await client.query(`SELECT COUNT(*) FROM public.${table}`);
    return parseInt(result.rows[0].count, 10);
  } catch {
    return 0;
  }
}

async function getTableData(client: Client, table: string): Promise<any[]> {
  try {
    const result = await client.query(`SELECT * FROM public.${table}`);
    return result.rows;
  } catch (err: any) {
    console.error(`  Error fetching ${table}:`, err.message);
    return [];
  }
}

async function getTableColumns(client: Client, table: string): Promise<string[]> {
  const result = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [table]);
  return result.rows.map(r => r.column_name);
}

async function insertData(client: Client, table: string, rows: any[], columns: string[]): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  // Filter columns that exist in the target
  const targetColumns = await getTableColumns(client, table);
  const validColumns = columns.filter(c => targetColumns.includes(c));

  if (validColumns.length === 0) {
    return { inserted: 0, errors: ['No matching columns'] };
  }

  for (const row of rows) {
    try {
      const values = validColumns.map(c => row[c]);
      const placeholders = validColumns.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = validColumns.map(c => `"${c}"`).join(', ');
      
      await client.query(
        `INSERT INTO public.${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      inserted++;
    } catch (err: any) {
      if (!err.message.includes('duplicate key') && !err.message.includes('already exists')) {
        errors.push(err.message.substring(0, 100));
      }
    }
  }

  return { inserted, errors };
}

async function transferTable(oldClient: Client, newClient: Client, table: string): Promise<TransferStats> {
  console.log(`\n📦 ${table}`);
  
  const stats: TransferStats = {
    table,
    oldCount: 0,
    transferred: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Get count from old
    stats.oldCount = await getTableCount(oldClient, table);
    
    if (stats.oldCount === 0) {
      console.log(`   ➖ Empty (0 rows)`);
      return stats;
    }

    console.log(`   📥 Fetching ${stats.oldCount} rows...`);
    
    // Get data from old
    const data = await getTableData(oldClient, table);
    if (data.length === 0) {
      console.log(`   ⚠️ Could not fetch data`);
      return stats;
    }

    // Get columns
    const columns = Object.keys(data[0]);
    
    // Insert to new
    console.log(`   📤 Inserting to new database...`);
    const { inserted, errors } = await insertData(newClient, table, data, columns);
    
    stats.transferred = inserted;
    stats.skipped = stats.oldCount - inserted;
    stats.errors = errors.slice(0, 3); // Keep first 3 errors

    if (errors.length > 0) {
      console.log(`   ⚠️ ${inserted}/${stats.oldCount} transferred (${errors.length} errors)`);
    } else {
      console.log(`   ✅ ${inserted}/${stats.oldCount} transferred`);
    }

  } catch (err: any) {
    console.log(`   ❌ Failed: ${err.message}`);
    stats.errors.push(err.message);
  }

  return stats;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('       MOBUL - DATABASE TRANSFER');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('OLD: arzthloosvnasokxygfo');
  console.log('NEW: uibvxhwhkatjcwghnzpu');
  console.log('');

  // Connect to both databases
  console.log('🔌 Connecting to databases...');
  
  const oldClient = new Client({ connectionString: OLD_DB_URL, ssl: { rejectUnauthorized: false } });
  const newClient = new Client({ connectionString: NEW_DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    await oldClient.connect();
    console.log('   ✅ Connected to OLD database');
  } catch (err: any) {
    console.error('   ❌ Failed to connect to OLD database:', err.message);
    process.exit(1);
  }

  try {
    await newClient.connect();
    console.log('   ✅ Connected to NEW database');
  } catch (err: any) {
    console.error('   ❌ Failed to connect to NEW database:', err.message);
    await oldClient.end();
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    TRANSFERRING DATA');
  console.log('═══════════════════════════════════════════════════════════');

  // Disable triggers temporarily for faster inserts
  try {
    await newClient.query('SET session_replication_role = replica;');
    console.log('   🔧 Disabled triggers for faster import');
  } catch {
    console.log('   ⚠️ Could not disable triggers');
  }

  const allStats: TransferStats[] = [];

  for (const table of TABLES_IN_ORDER) {
    const stats = await transferTable(oldClient, newClient, table);
    allStats.push(stats);
  }

  // Re-enable triggers
  try {
    await newClient.query('SET session_replication_role = DEFAULT;');
    console.log('\n   🔧 Re-enabled triggers');
  } catch {
    // ignore
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                      SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  let totalOld = 0;
  let totalTransferred = 0;
  let tablesWithData = 0;
  let tablesWithErrors = 0;

  for (const stat of allStats) {
    totalOld += stat.oldCount;
    totalTransferred += stat.transferred;
    if (stat.oldCount > 0) tablesWithData++;
    if (stat.errors.length > 0) tablesWithErrors++;
  }

  console.log(`\n📊 Results:`);
  console.log(`   Tables processed: ${allStats.length}`);
  console.log(`   Tables with data: ${tablesWithData}`);
  console.log(`   Tables with errors: ${tablesWithErrors}`);
  console.log(`   Total rows in OLD: ${totalOld.toLocaleString()}`);
  console.log(`   Total transferred: ${totalTransferred.toLocaleString()}`);
  console.log(`   Success rate: ${totalOld > 0 ? ((totalTransferred / totalOld) * 100).toFixed(1) : 0}%`);

  // Show tables that had issues
  const problemTables = allStats.filter(s => s.errors.length > 0 && s.oldCount > 0);
  if (problemTables.length > 0) {
    console.log(`\n⚠️ Tables with issues:`);
    for (const t of problemTables) {
      console.log(`   - ${t.table}: ${t.errors[0]}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                    TRANSFER COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');

  await oldClient.end();
  await newClient.end();
}

main().catch(console.error);

