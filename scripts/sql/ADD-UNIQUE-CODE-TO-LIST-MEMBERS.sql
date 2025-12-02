-- =====================================================
-- ADD UNIQUE_CODE TO CONTACT_LIST_MEMBERS
-- =====================================================
-- This migration adds the unique_code column to contact_list_members
-- so the same contact can have different codes in different lists/campaigns.
--
-- Run this in the Supabase SQL Editor.
-- =====================================================

-- Add unique_code column to contact_list_members
ALTER TABLE contact_list_members
  ADD COLUMN IF NOT EXISTS unique_code TEXT;

-- Create index for fast lookups by unique_code
CREATE INDEX IF NOT EXISTS idx_contact_list_members_unique_code 
  ON contact_list_members(unique_code) 
  WHERE unique_code IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN contact_list_members.unique_code IS 
  'Unique redemption code for this contact in this specific list. Allows same contact to have different codes per campaign.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration Complete: unique_code added to contact_list_members';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Now each contact can have a different code per list!';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage:';
  RAISE NOTICE '  - Upload lists with unique_code column';
  RAISE NOTICE '  - Same contact in different lists = different codes';
  RAISE NOTICE '  - Campaign creation reads code from list membership';
  RAISE NOTICE '=====================================================';
END $$;

