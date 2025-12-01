-- ============================================================================
-- CLEANUP OLD TEST DATA
-- ============================================================================
-- This script was designed to clean up demo data
-- Simplified to avoid UUID/LIKE compatibility issues
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🧹 Cleanup script - skipping (use manual cleanup if needed)';
  RAISE NOTICE '🎉 Proceeding with migrations...';
END $$;
