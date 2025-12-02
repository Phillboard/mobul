-- FIX REDEMPTION CODE CONSTRAINT
-- 
-- PROBLEM:
-- The recipients table has a UNIQUE constraint on redemption_code alone.
-- This prevents the same contact from being in multiple campaigns with the same mailer code.
--
-- SOLUTION:
-- Change to compound unique (audience_id, redemption_code) so:
-- - Same code can be used in different campaigns (linked to different audiences)
-- - Same code cannot be used twice in the SAME campaign/audience
--
-- APPLY THIS MIGRATION IN SUPABASE SQL EDITOR

-- Step 1: Drop the existing unique constraint (if exists)
ALTER TABLE recipients DROP CONSTRAINT IF EXISTS recipients_redemption_code_key;

-- Step 2: Drop any unique index on redemption_code alone
DROP INDEX IF EXISTS recipients_redemption_code_key;
DROP INDEX IF EXISTS idx_recipients_redemption_code_unique;

-- Step 3: Create new compound unique constraint
-- This allows the same code in different audiences (campaigns) but not duplicates within same audience
ALTER TABLE recipients
  ADD CONSTRAINT recipients_audience_redemption_code_unique 
  UNIQUE (audience_id, redemption_code);

-- Step 4: Keep the regular index for fast lookups by code alone
CREATE INDEX IF NOT EXISTS idx_recipients_redemption_code 
  ON recipients(redemption_code) 
  WHERE redemption_code IS NOT NULL;

-- Verification query
SELECT 
  'Constraint Check' as check_type,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'recipients'::regclass 
  AND conname LIKE '%redemption%';

