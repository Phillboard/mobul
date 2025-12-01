/**
 * Data Transfer Script - OLD to NEW Supabase
 * Transfers data using Supabase API (not direct database access)
 * 
 * Usage: npx tsx scripts/transfer-data-via-api.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file manually
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (e) {
    console.log('Could not load .env file');
  }
}

loadEnv();

// OLD Supabase credentials
const OLD_SUPABASE_URL = 'https://arzthloosvnasokxygfo.supabase.co';
const OLD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenRobG9vc3ZuYXNva3h5Z2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODM2NDgsImV4cCI6MjA3ODM1OTY0OH0.-Nv9m7Gcf2h-RHP2wWLT8UiKBmmnxFKmMsyqkBKzAhI';

// NEW Supabase credentials
const NEW_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uibvxhwhkatjcwghnzpu.supabase.co';
const NEW_SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5OTczMSwiZXhwIjoyMDgwMTc1NzMxfQ.4O-waCA6WwxgtALsADUmdUTXlSPo82hHJ7qZB4BzYuo';

// Tables to transfer (in dependency order)
const TABLES_TO_TRANSFER = [
  'organizations',
  'clients',
  'gift_card_brands',
  'gift_card_pools',
  'gift_cards',
  'templates',
  'landing_pages',
  'ace_forms',
  'contact_lists',
  'contacts',
  'contact_list_members',
  'audiences',
  'campaigns',
  'campaign_conditions',
  'campaign_reward_configs',
  'recipients',
  'events',
  'call_sessions',
  'gift_card_deliveries',
  'ace_form_submissions',
];

interface TransferResult {
  table: string;
  fetched: number;
  inserted: number;
  errors: string[];
}

async function fetchAllFromTable(client: SupabaseClient, table: string): Promise<any[]> {
  const allData: any[] = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(`  Error fetching from ${table}:`, error.message);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      offset += limit;
      hasMore = data.length === limit;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

async function insertToTable(client: SupabaseClient, table: string, data: any[]): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  // Insert in batches of 100 to avoid timeouts
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const { error } = await client
      .from(table)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

async function transferTable(
  oldClient: SupabaseClient,
  newClient: SupabaseClient,
  table: string
): Promise<TransferResult> {
  console.log(`\n📦 Transferring ${table}...`);

  // Fetch from old
  console.log(`  Fetching from OLD database...`);
  const data = await fetchAllFromTable(oldClient, table);
  console.log(`  Found ${data.length} records`);

  if (data.length === 0) {
    return { table, fetched: 0, inserted: 0, errors: [] };
  }

  // Insert to new
  console.log(`  Inserting to NEW database...`);
  const { inserted, errors } = await insertToTable(newClient, table, data);

  if (errors.length > 0) {
    console.log(`  ⚠️ ${errors.length} errors during insert`);
    errors.forEach(e => console.log(`    - ${e}`));
  }

  console.log(`  ✅ Transferred ${inserted}/${data.length} records`);

  return { table, fetched: data.length, inserted, errors };
}

async function main() {
  console.log('=========================================');
  console.log('  ACE Engage - Data Transfer Script');
  console.log('=========================================');
  console.log('');
  console.log(`OLD Database: arzthloosvnasokxygfo`);
  console.log(`NEW Database: ${NEW_SUPABASE_URL.split('//')[1]?.split('.')[0] || 'unknown'}`);
  console.log('');

  if (!NEW_SUPABASE_URL || !NEW_SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing NEW Supabase credentials in environment');
    console.error('   Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  // Create clients
  const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY);
  const newClient = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY);

  console.log('Testing connections...');

  // Test old connection
  const { error: oldError } = await oldClient.from('organizations').select('count').limit(1);
  if (oldError) {
    console.error('❌ Cannot connect to OLD database:', oldError.message);
    console.log('   Note: Data may be protected by RLS policies');
  } else {
    console.log('✅ Connected to OLD database');
  }

  // Test new connection
  const { error: newError } = await newClient.from('organizations').select('count').limit(1);
  if (newError) {
    console.error('❌ Cannot connect to NEW database:', newError.message);
    process.exit(1);
  }
  console.log('✅ Connected to NEW database');

  // Transfer each table
  const results: TransferResult[] = [];

  for (const table of TABLES_TO_TRANSFER) {
    try {
      const result = await transferTable(oldClient, newClient, table);
      results.push(result);
    } catch (error: any) {
      console.error(`  ❌ Failed to transfer ${table}:`, error.message);
      results.push({ table, fetched: 0, inserted: 0, errors: [error.message] });
    }
  }

  // Summary
  console.log('\n=========================================');
  console.log('  TRANSFER SUMMARY');
  console.log('=========================================');
  
  let totalFetched = 0;
  let totalInserted = 0;
  let totalErrors = 0;

  results.forEach(r => {
    const status = r.errors.length > 0 ? '⚠️' : r.fetched > 0 ? '✅' : '➖';
    console.log(`${status} ${r.table}: ${r.inserted}/${r.fetched} records`);
    totalFetched += r.fetched;
    totalInserted += r.inserted;
    totalErrors += r.errors.length;
  });

  console.log('');
  console.log(`Total: ${totalInserted}/${totalFetched} records transferred`);
  console.log(`Errors: ${totalErrors}`);
  console.log('=========================================');
}

main().catch(console.error);

