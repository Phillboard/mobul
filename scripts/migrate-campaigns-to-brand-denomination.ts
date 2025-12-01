/**
 * Migration Script: Campaign Conditions Pool ID → Brand + Denomination
 * 
 * This script migrates legacy campaign conditions from pool_id to brand_id + card_value format.
 * The new format enables simplified gift card selection and atomic assignment.
 * 
 * Usage:
 *   npm run migrate:gift-cards
 *   or
 *   ts-node scripts/migrate-campaigns-to-brand-denomination.ts
 * 
 * Safety Features:
 * - Dry-run mode by default
 * - Keeps pool_id for rollback capability
 * - Comprehensive logging
 * - Error handling for each condition
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ conditionId: string; error: string }>;
  details: Array<{ conditionId: string; poolId: string; brandId: string; cardValue: number }>;
}

/**
 * Main migration function
 */
async function migrateCampaignsToBrandDenomination(dryRun: boolean = true): Promise<MigrationResult> {
  console.log('\n🔄 Gift Card Migration: Pool ID → Brand + Denomination\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '✍️  LIVE RUN (changes will be applied)'}\n`);

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    details: [],
  };

  try {
    // Step 1: Fetch all conditions with pool_id but missing brand_id
    console.log('📋 Fetching conditions that need migration...\n');
    
    const { data: conditions, error: fetchError } = await supabase
      .from('campaign_conditions')
      .select(`
        id,
        condition_name,
        gift_card_pool_id,
        brand_id,
        card_value,
        campaigns!inner(
          id,
          name,
          client_id
        )
      `)
      .not('gift_card_pool_id', 'is', null)
      .is('brand_id', null);

    if (fetchError) {
      throw new Error(`Failed to fetch conditions: ${fetchError.message}`);
    }

    if (!conditions || conditions.length === 0) {
      console.log('✅ No conditions need migration. All conditions already have brand_id + card_value.\n');
      return result;
    }

    result.total = conditions.length;
    console.log(`Found ${result.total} condition(s) to migrate\n`);
    console.log('─'.repeat(80));

    // Step 2: Process each condition
    for (const condition of conditions) {
      const conditionId = condition.id;
      const poolId = condition.gift_card_pool_id;
      
      console.log(`\n📌 Condition: ${condition.condition_name} (ID: ${conditionId})`);
      console.log(`   Campaign: ${condition.campaigns.name}`);
      console.log(`   Current Pool ID: ${poolId}`);

      try {
        // Fetch pool details to get brand_id and card_value
        const { data: pool, error: poolError } = await supabase
          .from('gift_card_pools')
          .select('brand_id, card_value, pool_name')
          .eq('id', poolId)
          .single();

        if (poolError || !pool) {
          throw new Error(`Pool not found: ${poolId}`);
        }

        if (!pool.brand_id) {
          throw new Error(`Pool ${poolId} has no brand_id`);
        }

        if (!pool.card_value) {
          throw new Error(`Pool ${poolId} has no card_value`);
        }

        console.log(`   Pool: ${pool.pool_name}`);
        console.log(`   → Brand ID: ${pool.brand_id}`);
        console.log(`   → Card Value: $${pool.card_value}`);

        // Update condition with brand_id + card_value
        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('campaign_conditions')
            .update({
              brand_id: pool.brand_id,
              card_value: pool.card_value,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conditionId);

          if (updateError) {
            throw new Error(`Failed to update condition: ${updateError.message}`);
          }

          console.log('   ✅ Migrated successfully');
        } else {
          console.log('   🔍 Would migrate (dry run)');
        }

        result.migrated++;
        result.details.push({
          conditionId,
          poolId,
          brandId: pool.brand_id,
          cardValue: pool.card_value,
        });

      } catch (error) {
        console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.failed++;
        result.errors.push({
          conditionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('\n' + '─'.repeat(80));

  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error);
    throw error;
  }

  return result;
}

/**
 * Print migration summary
 */
function printSummary(result: MigrationResult, dryRun: boolean) {
  console.log('\n📊 Migration Summary\n');
  console.log('─'.repeat(80));
  console.log(`Total Conditions:     ${result.total}`);
  console.log(`Migrated:             ${result.migrated} ✅`);
  console.log(`Failed:               ${result.failed} ❌`);
  console.log(`Skipped:              ${result.skipped} ⏭️`);
  console.log('─'.repeat(80));

  if (result.failed > 0) {
    console.log('\n❌ Errors:\n');
    result.errors.forEach(({ conditionId, error }) => {
      console.log(`   - Condition ${conditionId}: ${error}`);
    });
  }

  if (dryRun && result.migrated > 0) {
    console.log('\n💡 This was a dry run. To apply changes, run:');
    console.log('   npm run migrate:gift-cards -- --apply\n');
  } else if (!dryRun && result.migrated > 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('   1. Verify campaigns are working correctly');
    console.log('   2. Test gift card selection in campaign wizard');
    console.log('   3. Test gift card redemption flows');
    console.log('   4. Monitor for any issues\n');
    console.log('💡 Rollback: pool_id fields are preserved for safety\n');
  }
}

/**
 * Create rollback script
 */
async function createRollbackScript(result: MigrationResult) {
  const rollbackSQL = `
-- Rollback Script: Clear brand_id and card_value to restore pool_id usage
-- Generated: ${new Date().toISOString()}
-- Migrated Conditions: ${result.migrated}

BEGIN;

${result.details
  .map(
    (detail) => `
-- Condition: ${detail.conditionId}
UPDATE campaign_conditions
SET 
  brand_id = NULL,
  card_value = NULL,
  updated_at = NOW()
WHERE id = '${detail.conditionId}';
`
  )
  .join('\n')}

-- Verify rollback
SELECT 
  id,
  condition_name,
  gift_card_pool_id AS pool_id,
  brand_id,
  card_value
FROM campaign_conditions
WHERE id IN (${result.details.map((d) => `'${d.conditionId}'`).join(', ')});

-- COMMIT or ROLLBACK as needed
COMMIT;
-- ROLLBACK;
`;

  const filename = `rollback-gift-card-migration-${Date.now()}.sql`;
  const fs = await import('fs/promises');
  await fs.writeFile(filename, rollbackSQL, 'utf-8');
  console.log(`\n💾 Rollback script saved: ${filename}\n`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: No changes will be made to the database');
    console.log('   Add --apply flag to apply changes\n');
  } else {
    console.log('⚠️  LIVE MODE: Changes will be applied to the database');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    
    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    const result = await migrateCampaignsToBrandDenomination(dryRun);
    printSummary(result, dryRun);

    if (!dryRun && result.migrated > 0) {
      await createRollbackScript(result);
    }

    // Exit with error code if any migrations failed
    process.exit(result.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  main();
}

export { migrateCampaignsToBrandDenomination };

