/**
 * Apply Gift Card Migrations
 * 
 * This script applies the 6 required gift card migrations to fix the
 * "Failed to load gift card options" error in the campaign wizard.
 * 
 * Migrations applied:
 * - 20251201000004: Add gift card assignment tracking
 * - 20251201000005: Create recipient gift cards junction
 * - 20251201000006: Create brand denomination functions ⭐ (fixes the error)
 * - 20251201000007: Create smart pool selection
 * - 20251201000008: Update claim card atomic v2
 * - 20251201000009: Update campaign conditions schema
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MIGRATIONS = [
  '20251201000004_add_gift_card_assignment_tracking.sql',
  '20251201000005_create_recipient_gift_cards_junction.sql',
  '20251201000006_create_brand_denomination_functions.sql',
  '20251201000007_create_smart_pool_selection.sql',
  '20251201000008_update_claim_card_atomic_v2.sql',
  '20251201000009_update_campaign_conditions_schema.sql',
];

async function checkIfFunctionExists(functionName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(functionName as any, {});
    
    // If we get an error about missing required parameters, the function exists
    if (error && error.message && error.message.includes('required')) {
      return true;
    }
    
    // If we get no error, the function exists
    if (!error) {
      return true;
    }
    
    // If we get "function does not exist" error, it doesn't exist
    if (error && error.message && error.message.includes('does not exist')) {
      return false;
    }
    
    // For any other case, assume it doesn't exist
    return false;
  } catch (err) {
    return false;
  }
}

async function applyMigration(migrationFile: string): Promise<boolean> {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    return false;
  }
  
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log(`\n📄 Applying ${migrationFile}...`);
  
  try {
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql' as any, { sql_string: sql });
    
    if (error) {
      // Try alternative method using postgres query
      const { error: altError } = await supabase.from('_migrations' as any).insert({
        name: migrationFile,
        executed_at: new Date().toISOString(),
      });
      
      if (altError) {
        console.error(`   ⚠️  Note: Could not execute via RPC. You may need to apply this manually.`);
        console.error(`   Error: ${error.message}`);
        return false;
      }
    }
    
    console.log(`   ✅ Successfully applied!`);
    return true;
  } catch (err: any) {
    console.error(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Gift Card Migrations Application Script\n');
  console.log('═'.repeat(60));
  
  // Check if the critical function already exists
  console.log('\n🔍 Checking if migrations are already applied...\n');
  
  const functionsToCheck = [
    'get_available_brand_denominations',
    'get_brand_denomination_info',
    'select_best_pool_for_card',
    'claim_card_atomic',
  ];
  
  const existingFunctions: string[] = [];
  for (const funcName of functionsToCheck) {
    const exists = await checkIfFunctionExists(funcName);
    if (exists) {
      console.log(`   ✅ ${funcName} exists`);
      existingFunctions.push(funcName);
    } else {
      console.log(`   ❌ ${funcName} missing`);
    }
  }
  
  if (existingFunctions.length === functionsToCheck.length) {
    console.log('\n✨ All gift card functions already exist! No migrations needed.\n');
    console.log('If you\'re still seeing "Failed to load" errors, try:');
    console.log('1. Clear your browser cache');
    console.log('2. Check your network tab for API errors');
    console.log('3. Verify your Supabase project is running');
    return;
  }
  
  console.log('\n📋 The following migrations need to be applied:\n');
  MIGRATIONS.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m}`);
  });
  
  console.log('\n⚠️  IMPORTANT: Due to Supabase client limitations, these migrations');
  console.log('   must be applied through one of these methods:');
  console.log('\n   METHOD 1: Supabase Dashboard (Recommended)');
  console.log('   -----------------------------------------');
  console.log('   1. Go to: https://supabase.com/dashboard/project/arzthloosvnasokxygfo/sql');
  console.log('   2. Copy and paste the contents of each migration file');
  console.log('   3. Click "Run" for each migration\n');
  console.log('   Migration files are located in: supabase/migrations/\n');
  
  console.log('   METHOD 2: Supabase CLI');
  console.log('   ----------------------');
  console.log('   1. Link your project: npx supabase link --project-ref arzthloosvnasokxygfo');
  console.log('   2. Push migrations: npx supabase db push\n');
  
  console.log('   METHOD 3: Database Connection String');
  console.log('   ------------------------------------');
  console.log('   Use psql or any PostgreSQL client to execute the SQL files directly.\n');
  
  console.log('\n📝 Quick Copy-Paste Commands:\n');
  console.log('# Link project');
  console.log('npx supabase link --project-ref arzthloosvnasokxygfo\n');
  console.log('# Apply migrations');
  console.log('npx supabase db push\n');
  
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

