-- =====================================================
-- TESTING & TROUBLESHOOTING SCRIPT
-- =====================================================
-- Run this after deploying the credit system migrations
-- to verify everything works and fix common issues
-- =====================================================

-- =====================================================
-- PART 1: VERIFY TABLES EXIST
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Checking if credit system tables exist...';
  
  -- Check credit_accounts
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_accounts') THEN
    RAISE NOTICE '✓ credit_accounts table exists';
  ELSE
    RAISE WARNING '✗ credit_accounts table missing - run migration 20251201000000';
  END IF;
  
  -- Check credit_transactions
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_transactions') THEN
    RAISE NOTICE '✓ credit_transactions table exists';
  ELSE
    RAISE WARNING '✗ credit_transactions table missing';
  END IF;
  
  -- Check gift_card_redemptions
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gift_card_redemptions') THEN
    RAISE NOTICE '✓ gift_card_redemptions table exists';
  ELSE
    RAISE WARNING '✗ gift_card_redemptions table missing';
  END IF;
  
  -- Check agencies
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agencies') THEN
    RAISE NOTICE '✓ agencies table exists';
  ELSE
    RAISE WARNING '✗ agencies table missing';
  END IF;
  
  -- Check system_alerts
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_alerts') THEN
    RAISE NOTICE '✓ system_alerts table exists';
  ELSE
    RAISE WARNING '✗ system_alerts table missing';
  END IF;
END $$;

-- =====================================================
-- PART 2: CHECK HELPER FUNCTIONS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Checking helper functions...';
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'has_role') THEN
    RAISE NOTICE '✓ has_role function exists';
  ELSE
    RAISE WARNING '✗ has_role function missing';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'user_can_access_client') THEN
    RAISE NOTICE '✓ user_can_access_client function exists';
  ELSE
    RAISE WARNING '✗ user_can_access_client function missing';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_or_create_credit_account') THEN
    RAISE NOTICE '✓ get_or_create_credit_account function exists';
  ELSE
    RAISE WARNING '✗ get_or_create_credit_account function missing';
  END IF;
  
  IF EXISTS (SELECT FROM pg_proc WHERE proname = 'claim_available_card') THEN
    RAISE NOTICE '✓ claim_available_card function exists';
  ELSE
    RAISE WARNING '✗ claim_available_card function missing';
  END IF;
END $$;

-- =====================================================
-- PART 3: CHECK COLUMN ADDITIONS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Checking enhanced columns...';
  
  -- Check clients.credit_account_id
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='clients' AND column_name='credit_account_id'
  ) THEN
    RAISE NOTICE '✓ clients.credit_account_id exists';
  ELSE
    RAISE WARNING '✗ clients.credit_account_id missing';
  END IF;
  
  -- Check campaigns.credit_account_id
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='campaigns' AND column_name='credit_account_id'
  ) THEN
    RAISE NOTICE '✓ campaigns.credit_account_id exists';
  ELSE
    RAISE WARNING '✗ campaigns.credit_account_id missing';
  END IF;
  
  -- Check campaigns.uses_shared_credit
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='campaigns' AND column_name='uses_shared_credit'
  ) THEN
    RAISE NOTICE '✓ campaigns.uses_shared_credit exists';
  ELSE
    RAISE WARNING '✗ campaigns.uses_shared_credit missing';
  END IF;
  
  -- Check gift_card_pools.pool_type
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name='gift_card_pools' AND column_name='pool_type'
  ) THEN
    RAISE NOTICE '✓ gift_card_pools.pool_type exists';
  ELSE
    RAISE WARNING '✗ gift_card_pools.pool_type missing';
  END IF;
END $$;

-- =====================================================
-- PART 4: CREATE TEST DATA (OPTIONAL)
-- =====================================================

-- Uncomment to create test data

/*
-- Create a test agency
INSERT INTO agencies (name, slug, status)
VALUES ('Test Agency', 'test-agency', 'active')
ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Get the agency ID
DO $$
DECLARE
  v_agency_id UUID;
  v_credit_account_id UUID;
BEGIN
  SELECT id INTO v_agency_id FROM agencies WHERE slug = 'test-agency';
  
  IF v_agency_id IS NOT NULL THEN
    -- Create credit account for agency
    SELECT get_or_create_credit_account('agency', v_agency_id, NULL) INTO v_credit_account_id;
    
    -- Link agency to credit account
    UPDATE agencies SET credit_account_id = v_credit_account_id WHERE id = v_agency_id;
    
    -- Give agency $10,000 credit
    UPDATE credit_accounts 
    SET total_purchased = 10000, total_remaining = 10000 
    WHERE id = v_credit_account_id;
    
    RAISE NOTICE 'Test agency created with $10,000 credit';
  END IF;
END $$;
*/

-- =====================================================
-- PART 5: VERIFY RLS POLICIES
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('credit_accounts', 'credit_transactions', 'gift_card_redemptions', 'agencies')
ORDER BY tablename, policyname;

-- =====================================================
-- PART 6: CHECK FOR CONFLICTS
-- =====================================================

-- Check for any duplicate policies
SELECT 
  tablename,
  policyname,
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;

-- =====================================================
-- PART 7: SAMPLE QUERIES TO TEST
-- =====================================================

-- Test 1: Can we query credit accounts?
SELECT 'Test 1: Credit Accounts' as test_name;
SELECT 
  account_type,
  COUNT(*) as count,
  SUM(total_remaining) as total_credit
FROM credit_accounts
GROUP BY account_type;

-- Test 2: Can we query agencies?
SELECT 'Test 2: Agencies' as test_name;
SELECT id, name, status, credit_account_id FROM agencies LIMIT 5;

-- Test 3: Check gift card pools with pool_type
SELECT 'Test 3: Gift Card Pools' as test_name;
SELECT 
  pool_type,
  COUNT(*) as pool_count,
  SUM(available_cards) as total_cards
FROM gift_card_pools
WHERE is_active = true
GROUP BY pool_type;

-- Test 4: Check for existing redemptions
SELECT 'Test 4: Redemptions' as test_name;
SELECT COUNT(*) as total_redemptions FROM gift_card_redemptions;

-- =====================================================
-- DONE
-- =====================================================

SELECT '
╔════════════════════════════════════════╗
║   TESTING SCRIPT COMPLETE             ║
║                                        ║
║   Review the output above for any     ║
║   warnings or errors.                 ║
║                                        ║
║   Next steps:                         ║
║   1. Fix any missing tables           ║
║   2. Deploy edge functions            ║
║   3. Test UI components               ║
╚════════════════════════════════════════╝
' as status;

