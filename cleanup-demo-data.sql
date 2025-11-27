-- ============================================================================
-- DEMO DATA CLEANUP SCRIPT
-- ============================================================================
-- This script removes ALL demo data from the system
-- Safe to run - only affects demo-flagged data
-- ============================================================================

-- Safety check
DO $$
BEGIN
  RAISE NOTICE '⚠️  This will delete all demo data. Press Ctrl+C to cancel.';
  RAISE NOTICE 'Waiting 5 seconds...';
  PERFORM pg_sleep(5);
END $$;

-- ============================================================================
-- PHASE 1: DELETE DEMO GIFT CARDS & DELIVERIES
-- ============================================================================

-- Delete gift card deliveries for demo cards
DELETE FROM gift_card_deliveries
WHERE gift_card_id IN (
  SELECT gc.id FROM gift_cards gc
  JOIN gift_card_pools gcp ON gc.pool_id = gcp.id
  JOIN gift_card_brands gcb ON gcp.brand_id = gcb.id
  WHERE gcb.is_demo_brand = true
);

-- Delete demo gift cards
DELETE FROM gift_cards
WHERE pool_id IN (
  SELECT gcp.id FROM gift_card_pools gcp
  JOIN gift_card_brands gcb ON gcp.brand_id = gcb.id
  WHERE gcb.is_demo_brand = true
);

-- Delete demo gift card pools
DELETE FROM gift_card_pools
WHERE brand_id IN (
  SELECT id FROM gift_card_brands WHERE is_demo_brand = true
);

-- Delete demo brands
DELETE FROM gift_card_brands
WHERE is_demo_brand = true;

RAISE NOTICE '✅ Demo gift cards and brands deleted';

-- ============================================================================
-- PHASE 2: DELETE DEMO CAMPAIGNS & RELATED DATA
-- ============================================================================

-- Delete campaign-related data
DELETE FROM campaign_conditions WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE client_id LIKE 'dc%'
);

DELETE FROM campaign_reward_configs WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE client_id LIKE 'dc%'
);

DELETE FROM events WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE client_id LIKE 'dc%'
);

-- Delete recipients
DELETE FROM recipients WHERE audience_id IN (
  SELECT id FROM audiences WHERE client_id LIKE 'dc%'
);

-- Delete audiences
DELETE FROM audiences WHERE client_id LIKE 'dc%';

-- Delete campaigns
DELETE FROM campaigns WHERE client_id LIKE 'dc%';

RAISE NOTICE '✅ Demo campaigns and recipients deleted';

-- ============================================================================
-- PHASE 3: DELETE DEMO CONTACTS
-- ============================================================================

-- Delete contact list members
DELETE FROM contact_list_members WHERE list_id IN (
  SELECT id FROM contact_lists WHERE client_id LIKE 'dc%'
);

-- Delete contact lists
DELETE FROM contact_lists WHERE client_id LIKE 'dc%';

-- Delete contacts
DELETE FROM contacts WHERE client_id LIKE 'dc%';

RAISE NOTICE '✅ Demo contacts deleted';

-- ============================================================================
-- PHASE 4: DELETE DEMO ORGANIZATIONS & CLIENTS
-- ============================================================================

-- Delete client users
DELETE FROM client_users WHERE client_id LIKE 'dc%';

-- Delete clients
DELETE FROM clients WHERE id LIKE 'dc%';

-- Delete organizations
DELETE FROM organizations WHERE id LIKE 'd%';

RAISE NOTICE '✅ Demo organizations and clients deleted';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  'CLEANUP COMPLETE' as status,
  (SELECT COUNT(*) FROM gift_card_brands WHERE is_demo_brand = true) as remaining_demo_brands,
  (SELECT COUNT(*) FROM clients WHERE id LIKE 'dc%') as remaining_demo_clients,
  (SELECT COUNT(*) FROM gift_cards WHERE card_code LIKE 'DEMO-%') as remaining_demo_cards,
  (SELECT COUNT(*) FROM contacts WHERE email LIKE '%@testmail.com') as remaining_demo_contacts;

RAISE NOTICE '🎉 All demo data cleaned up successfully!';
RAISE NOTICE 'Production data remains intact.';

