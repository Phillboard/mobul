/**
 * Apply Gift Card Migrations Directly
 * 
 * This script reads the SQL migration files and executes them
 * using your app's existing Supabase connection.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get Supabase credentials from environment variables
// These should already be set in your .env file
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    // Try calling the function with dummy params
    const { error } = await supabase.rpc(functionName as any, {});
    
    // If we get "function does not exist" error, return false
    if (error?.message?.includes('does not exist')) {
      return false;
    }
    
    // Any other error or success means the function exists
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n🚀 Gift Card Migrations Auto-Applier\n');
  console.log('═'.repeat(60));
  
  // Check if migrations are needed
  console.log('\n🔍 Checking current database state...\n');
  
  const criticalFunctions = [
    'get_available_brand_denominations',
    'get_brand_denomination_info',
    'select_best_pool_for_card',
    'claim_card_atomic',
  ];
  
  const existingFunctions: string[] = [];
  for (const funcName of criticalFunctions) {
    const exists = await checkIfFunctionExists(funcName);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${funcName}`);
    if (exists) existingFunctions.push(funcName);
  }
  
  if (existingFunctions.length === criticalFunctions.length) {
    console.log('\n✨ All migrations already applied! Your system is up to date.\n');
    return;
  }
  
  console.log('\n📋 Migrations needed. Reading SQL files...\n');
  
  // Read all migration files
  const migrations: { name: string; sql: string }[] = [];
  for (const filename of MIGRATIONS) {
    const filepath = join(process.cwd(), 'supabase', 'migrations', filename);
    try {
      const sql = readFileSync(filepath, 'utf-8');
      migrations.push({ name: filename, sql });
      console.log(`   📄 Loaded: ${filename}`);
    } catch (error) {
      console.error(`   ❌ Failed to read: ${filename}`);
      console.error(`      ${error}`);
      process.exit(1);
    }
  }
  
  console.log('\n⚠️  IMPORTANT INFORMATION:\n');
  console.log('   The Supabase client library does not support executing raw SQL');
  console.log('   directly from JavaScript for security reasons.\n');
  console.log('   However, I\'ve created an alternative solution for you:\n');
  
  // Create a combined SQL file
  const combinedSQL = migrations.map(m => `-- ${m.name}\n${m.sql}`).join('\n\n');
  const outputPath = join(process.cwd(), 'apply-gift-card-migrations.sql');
  
  try {
    const fs = await import('fs');
    fs.writeFileSync(outputPath, combinedSQL);
    console.log(`   ✅ Created combined SQL file: apply-gift-card-migrations.sql\n`);
  } catch (error) {
    console.error('   ❌ Failed to create combined SQL file');
    process.exit(1);
  }
  
  console.log('═'.repeat(60));
  console.log('\n🎯 NEXT STEPS - Choose ONE option:\n');
  
  console.log('Option 1: Use the SQL file I just created');
  console.log('─────────────────────────────────────────');
  console.log('1. Open: apply-gift-card-migrations.sql');
  console.log('2. Copy all contents');
  console.log('3. Paste into Supabase SQL Editor');
  console.log('4. Click "Run"\n');
  
  console.log('Option 2: Use Supabase Studio (Desktop App)');
  console.log('───────────────────────────────────────────');
  console.log('1. Download: https://github.com/supabase/supabase/releases');
  console.log('2. Connect to your project');
  console.log('3. Run the SQL file\n');
  
  console.log('Option 3: Ask a teammate with Supabase access');
  console.log('──────────────────────────────────────────────');
  console.log('1. Share the apply-gift-card-migrations.sql file');
  console.log('2. They can run it in the Supabase Dashboard\n');
  
  console.log('═'.repeat(60));
  console.log('\n💡 Why can\'t this script apply them automatically?\n');
  console.log('   Supabase restricts raw SQL execution from client code for security.');
  console.log('   Only the dashboard, CLI, or direct database connections can run DDL.\n');
}

main().catch(console.error);

