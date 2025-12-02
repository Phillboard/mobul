-- =====================================================
-- FIX LANDING PAGE CONSTRAINT FOR SELF-MAILERS
-- =====================================================
-- This migration:
-- 1. Adds mailing_method column to campaigns
-- 2. Adds form_id column to campaigns (for ACE forms)
-- 3. Fixes the constraint to allow self-mailers without landing page
--
-- Run this in the Supabase SQL Editor.
-- =====================================================

-- =====================================================
-- PHASE 1: Add missing columns
-- =====================================================

-- Add mailing_method column (default 'self' for existing campaigns)
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS mailing_method TEXT DEFAULT 'self';

-- Add form_id column for ACE forms integration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'form_id'
  ) THEN
    -- Check if ace_forms table exists before adding foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ace_forms') THEN
      ALTER TABLE campaigns 
        ADD COLUMN form_id UUID REFERENCES ace_forms(id) ON DELETE SET NULL;
    ELSE
      -- Add column without foreign key if ace_forms doesn't exist
      ALTER TABLE campaigns 
        ADD COLUMN form_id UUID;
    END IF;
  END IF;
END $$;

-- Create index for mailing_method lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_mailing_method 
  ON campaigns(mailing_method);

-- =====================================================
-- PHASE 2: Fix the constraint
-- =====================================================

-- Drop the problematic constraint that references non-existent columns
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_published_needs_landing_page;

-- Create new constraint that allows:
-- 1. Draft/scheduled status (not yet published) = OK
-- 2. Self-mailers (mailing_method = 'self') = OK (they don't need landing page)
-- 3. Campaigns with landing page = OK
-- 4. Campaigns with form = OK
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_published_needs_landing_page 
CHECK (
  (status NOT IN ('in_production', 'mailed'))   -- Draft/scheduled = OK
  OR mailing_method = 'self'                     -- Self-mailers = OK
  OR landing_page_id IS NOT NULL                 -- Has landing page = OK
  OR form_id IS NOT NULL                         -- Has form = OK
);

-- Also drop the rewards constraint that references non-existent columns
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_rewards_needs_pool;

-- =====================================================
-- PHASE 3: Update existing campaigns
-- =====================================================

-- Set mailing_method = 'self' for all existing campaigns that don't have it
UPDATE campaigns 
SET mailing_method = 'self' 
WHERE mailing_method IS NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  -- Check mailing_method column exists
  SELECT COUNT(*) INTO col_count 
  FROM information_schema.columns 
  WHERE table_name = 'campaigns' AND column_name = 'mailing_method';
  
  IF col_count = 0 THEN
    RAISE EXCEPTION 'mailing_method column was not created!';
  END IF;
  
  -- Check form_id column exists
  SELECT COUNT(*) INTO col_count 
  FROM information_schema.columns 
  WHERE table_name = 'campaigns' AND column_name = 'form_id';
  
  IF col_count = 0 THEN
    RAISE EXCEPTION 'form_id column was not created!';
  END IF;
  
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration Complete: Landing page constraint fixed!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Self-mailers can now set status to "mailed" without landing page';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns added:';
  RAISE NOTICE '  - mailing_method (TEXT, default "self")';
  RAISE NOTICE '  - form_id (UUID, optional)';
  RAISE NOTICE '';
  RAISE NOTICE 'Constraint updated to allow:';
  RAISE NOTICE '  - Self-mailers without landing page';
  RAISE NOTICE '  - Campaigns with landing page';
  RAISE NOTICE '  - Campaigns with form';
  RAISE NOTICE '=====================================================';
END $$;

