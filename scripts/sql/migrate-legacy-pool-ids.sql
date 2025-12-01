-- SQL Migration Script: Migrate all legacy campaign conditions to brand+value format
-- 
-- This script should be run in the Supabase SQL Editor after deploying the schema changes.
-- It uses the migrate_condition_to_brand_value() function to convert all conditions.
--
-- Safety: Can be run multiple times - it only migrates conditions that haven't been migrated yet

DO $$
DECLARE
  v_condition_record RECORD;
  v_migrated_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_migration_result BOOLEAN;
BEGIN
  RAISE NOTICE 'Starting gift card pool migration...';
  RAISE NOTICE '';

  -- Find all conditions needing migration
  FOR v_condition_record IN 
    SELECT 
      cc.id,
      cc.condition_name,
      cc.gift_card_pool_id,
      c.name as campaign_name
    FROM campaign_conditions cc
    JOIN campaigns c ON c.id = cc.campaign_id
    WHERE cc.brand_id IS NULL 
      AND cc.gift_card_pool_id IS NOT NULL
    ORDER BY c.created_at DESC
  LOOP
    BEGIN
      RAISE NOTICE 'Migrating condition: % (Campaign: %)', 
        v_condition_record.condition_name, 
        v_condition_record.campaign_name;

      -- Call migration function
      SELECT migrate_condition_to_brand_value(v_condition_record.id)
      INTO v_migration_result;

      IF v_migration_result THEN
        v_migrated_count := v_migrated_count + 1;
        RAISE NOTICE '  ✓ Successfully migrated';
      ELSE
        v_skipped_count := v_skipped_count + 1;
        RAISE NOTICE '  ⊘ Skipped (no pool data or already migrated)';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      RAISE WARNING '  ✗ Failed to migrate: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Total processed:  %', (v_migrated_count + v_skipped_count + v_failed_count);
  RAISE NOTICE '  ✓ Migrated:       %', v_migrated_count;
  RAISE NOTICE '  ⊘ Skipped:        %', v_skipped_count;
  RAISE NOTICE '  ✗ Failed:         %', v_failed_count;
  RAISE NOTICE '========================================';

  IF v_failed_count > 0 THEN
    RAISE WARNING 'Some conditions failed to migrate. Review errors above.';
  ELSIF v_migrated_count = 0 AND v_skipped_count = 0 THEN
    RAISE NOTICE 'No conditions found needing migration.';
  ELSE
    RAISE NOTICE 'Migration completed successfully!';
  END IF;
END $$;

-- Verification: Check if any conditions still need migration
DO $$
DECLARE
  v_remaining_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_remaining_count
  FROM campaign_conditions
  WHERE brand_id IS NULL 
    AND gift_card_pool_id IS NOT NULL;

  IF v_remaining_count > 0 THEN
    RAISE WARNING 'Still have % conditions needing migration!', v_remaining_count;
  ELSE
    RAISE NOTICE 'All conditions have been migrated! ✓';
  END IF;
END $$;

