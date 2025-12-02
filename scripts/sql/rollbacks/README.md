# Migration Rollback Scripts

This directory contains rollback scripts for each applied migration, allowing safe recovery if issues are detected.

## Structure

Each rollback script should be named:
```
YYYYMMDD_rollback_MIGRATION_NAME.sql
```

## Rollback Script Template

```sql
-- =====================================================
-- ROLLBACK SCRIPT
-- =====================================================
-- Migration: MIGRATION_FILE_NAME
-- Date Applied: YYYY-MM-DD HH:MM:SS
-- Applied By: USER_NAME
-- Rollback Created: YYYY-MM-DD
-- =====================================================

BEGIN;

-- 1. Drop new tables (in reverse dependency order)
DROP TABLE IF EXISTS new_table_name CASCADE;

-- 2. Drop new functions
DROP FUNCTION IF EXISTS new_function_name(arg_types) CASCADE;

-- 3. Drop new indexes
DROP INDEX IF EXISTS idx_new_index;

-- 4. Drop new triggers
DROP TRIGGER IF EXISTS trigger_name ON table_name;

-- 5. Restore old columns (if any were dropped)
-- ALTER TABLE table_name ADD COLUMN IF NOT EXISTS old_column_name type;

-- 6. Restore old data (if any was modified)
-- UPDATE table_name SET column = old_value WHERE condition;

-- 7. Drop new columns (if any were added)
-- ALTER TABLE table_name DROP COLUMN IF EXISTS new_column_name;

-- 8. Restore old constraints
-- ALTER TABLE table_name ADD CONSTRAINT constraint_name ...;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after rollback to verify success:

-- Check tables were dropped
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'new_table_name';

-- Check functions were dropped
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'new_function_name';

-- Check data integrity
-- SELECT COUNT(*) FROM affected_table;
```

## Usage

1. **Before Applying Migration**: Create a rollback script based on the template
2. **After Migration**: Test rollback script in development environment
3. **In Production**: Only use if critical issues are detected
4. **After Rollback**: Document what went wrong and update migration

## Best Practices

- Always test rollback scripts before applying migration
- Include verification queries
- Document any data transformations
- Keep rollback scripts in version control
- Update rollback if migration changes

## Emergency Rollback Procedure

1. Stop application (if necessary)
2. Create database backup
3. Review rollback script
4. Execute rollback script
5. Verify rollback success
6. Test application functionality
7. Document incident
8. Update migration before retry

