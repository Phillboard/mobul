-- =====================================================
-- ROLLBACK TEMPLATE
-- =====================================================
-- Copy this template for each migration rollback script
-- =====================================================

-- Rollback for: [MIGRATION_NAME]
-- Date applied: [YYYY-MM-DD]
-- Applied by: [USER_NAME]
-- Reason for rollback: [REASON]

BEGIN;

-- 1. Drop new tables (if any were created)
-- DROP TABLE IF EXISTS new_table_name CASCADE;

-- 2. Drop new functions (if any were created)
-- DROP FUNCTION IF EXISTS new_function_name CASCADE;

-- 3. Drop new indexes (if any were created)
-- DROP INDEX IF EXISTS idx_new_index;

-- 4. Drop new triggers (if any were created)
-- DROP TRIGGER IF EXISTS trigger_name ON table_name;

-- 5. Remove new columns (if any were added)
-- ALTER TABLE table_name DROP COLUMN IF EXISTS new_column CASCADE;

-- 6. Restore old data (if any was modified)
-- Add specific restoration queries here

-- 7. Verify rollback
SELECT 'Rollback verification:' as status;

COMMIT;

-- Post-rollback notes:
-- - Document what was rolled back
-- - List any manual cleanup needed
-- - Note if application changes are required


