import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🚀 Applying Gift Card Migrations\n');
console.log('═'.repeat(60));

if (!SUPABASE_URL) {
  console.error('\n❌ Missing VITE_SUPABASE_URL environment variable');
  console.log('\nPlease set it in your environment or .env file\n');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
  console.log('\nPlease set it in your environment or .env file\n');
  process.exit(1);
}

console.log(`\n✅ Found Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);
console.log('✅ Found Supabase Key\n');

// Read the combined SQL file
const sqlPath = join(process.cwd(), 'apply-gift-card-migrations.sql');
let sql;

try {
  sql = readFileSync(sqlPath, 'utf-8');
  console.log(`📄 Loaded SQL file: ${(sql.length / 1024).toFixed(1)} KB\n`);
} catch (error) {
  console.error('❌ Failed to read SQL file:', error);
  process.exit(1);
}

console.log('⚠️  IMPORTANT:\n');
console.log('   Unfortunately, the Supabase JavaScript client cannot execute');
console.log('   raw DDL SQL for security reasons.\n');
console.log('   However, I have 3 easy solutions for you:\n');

console.log('═'.repeat(60));
console.log('\n🎯 SOLUTION 1: Copy-Paste (EASIEST)\n');
console.log('1. Open: apply-gift-card-migrations.sql');
console.log('2. Copy all contents (Ctrl+A, Ctrl+C)');
console.log('3. Have someone with Supabase access paste it here:');
console.log(`   https://supabase.com/dashboard/project/arzthloosvnasokxygfo/sql/new\n`);
console.log('4. Click "Run"\n');

console.log('═'.repeat(60));
console.log('\n🎯 SOLUTION 2: Direct Database Connection\n');
console.log('If you have the database password:\n');
console.log('1. Get connection string from Supabase Settings');
console.log('2. Use psql or pgAdmin');
console.log('3. Run: \\i apply-gift-card-migrations.sql\n');

console.log('═'.repeat(60));
console.log('\n🎯 SOLUTION 3: Share with Teammate\n');
console.log('Send apply-gift-card-migrations.sql to someone with access\n');

console.log('═'.repeat(60));
console.log('\n📊 Migration Summary:\n');
console.log('This will apply 6 migrations that:');
console.log('  ✅ Add assignment tracking (prevents double redemptions)');
console.log('  ✅ Create recipient-gift card junction table');
console.log('  ✅ Create brand/denomination functions (FIXES YOUR ERROR)');
console.log('  ✅ Add smart pool selection');
console.log('  ✅ Update atomic claiming system');
console.log('  ✅ Update campaign conditions schema\n');

console.log('Once applied, your "Failed to load gift card options" error');
console.log('will be fixed! 🎉\n');

console.log('═'.repeat(60));

