/**
 * Migration Script: Convert legacy pool_id to brand_id + card_value
 * 
 * This script migrates campaign_conditions from the old pool-based system
 * to the new brand+denomination system.
 * 
 * Usage:
 * 1. Run via Supabase SQL Editor or node/ts-node
 * 2. Reviews all conditions with pool_id but no brand_id
 * 3. Migrates them using the helper function
 * 
 * Safety:
 * - Read-only mode available for preview
 * - Logs all changes
 * - Can be run multiple times (idempotent)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ conditionId: string; error: string }>;
}

async function migrateConditions(dryRun: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log('🔍 Finding conditions to migrate...');
  
  // Find all conditions with pool_id but no brand_id
  const { data: conditions, error } = await supabase
    .from('campaign_conditions')
    .select(`
      id,
      condition_name,
      gift_card_pool_id,
      brand_id,
      card_value,
      campaigns(id, name, client_id)
    `)
    .is('brand_id', null)
    .not('gift_card_pool_id', 'is', null);

  if (error) {
    console.error('❌ Failed to fetch conditions:', error);
    throw error;
  }

  if (!conditions || conditions.length === 0) {
    console.log('✅ No conditions need migration');
    return stats;
  }

  stats.total = conditions.length;
  console.log(`📊 Found ${stats.total} conditions to migrate`);

  for (const condition of conditions) {
    try {
      console.log(`\n🔄 Processing condition: ${condition.condition_name} (${condition.id})`);
      
      if (dryRun) {
        console.log(`   [DRY RUN] Would migrate condition ${condition.id}`);
        stats.skipped++;
        continue;
      }

      // Call the database migration function
      const { data: result, error: migrationError } = await supabase
        .rpc('migrate_condition_to_brand_value', {
          p_condition_id: condition.id
        });

      if (migrationError) {
        console.error(`   ❌ Migration failed:`, migrationError);
        stats.failed++;
        stats.errors.push({
          conditionId: condition.id,
          error: migrationError.message
        });
        continue;
      }

      if (result) {
        console.log(`   ✅ Successfully migrated`);
        stats.migrated++;
      } else {
        console.log(`   ⏭️  Skipped (already migrated or no pool data)`);
        stats.skipped++;
      }
    } catch (err) {
      console.error(`   ❌ Unexpected error:`, err);
      stats.failed++;
      stats.errors.push({
        conditionId: condition.id,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  console.log('🚀 Gift Card Pool Migration Tool\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  } else if (!force) {
    console.log('⚠️  LIVE MODE - This will modify the database!');
    console.log('   Use --dry-run to preview changes');
    console.log('   Use --force to proceed without confirmation\n');
    
    // In a real implementation, add readline confirmation here
    console.log('   Proceeding in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  try {
    const stats = await migrateConditions(dryRun);

    console.log('\n📊 Migration Complete!\n');
    console.log(`Total conditions found:  ${stats.total}`);
    console.log(`✅ Successfully migrated: ${stats.migrated}`);
    console.log(`⏭️  Skipped:              ${stats.skipped}`);
    console.log(`❌ Failed:                ${stats.failed}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach(({ conditionId, error }) => {
        console.log(`   - ${conditionId}: ${error}`);
      });
    }

    if (stats.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrateConditions };

