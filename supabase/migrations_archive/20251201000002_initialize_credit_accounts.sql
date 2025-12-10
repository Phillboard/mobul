-- =====================================================
-- INITIALIZE CREDIT ACCOUNTS FOR EXISTING DATA
-- =====================================================
-- Migration: Migrate existing agencies, clients, campaigns
-- to the new credit account system
-- =====================================================

-- =====================================================
-- 1. INITIALIZE AGENCY CREDIT ACCOUNTS
-- =====================================================

-- Create credit accounts for existing agencies
INSERT INTO credit_accounts (account_type, owner_id, parent_account_id, total_purchased, total_remaining, status)
SELECT 
  'agency'::TEXT as account_type,
  id as owner_id,
  NULL as parent_account_id, -- Agencies are top-level
  0 as total_purchased, -- Start fresh, they'll purchase credit
  0 as total_remaining,
  CASE 
    WHEN status = 'active' THEN 'active'::TEXT
    WHEN status = 'suspended' THEN 'suspended'::TEXT
    ELSE 'inactive'::TEXT
  END as status
FROM agencies
WHERE id NOT IN (
  SELECT owner_id FROM credit_accounts WHERE account_type = 'agency'
);

-- Link agencies to their credit accounts
UPDATE agencies a
SET credit_account_id = ca.id
FROM credit_accounts ca
WHERE ca.owner_id = a.id 
  AND ca.account_type = 'agency'
  AND a.credit_account_id IS NULL;

-- =====================================================
-- 2. INITIALIZE CLIENT CREDIT ACCOUNTS
-- =====================================================

-- Create credit accounts for existing clients
-- Migrate existing `credits` field to new account system
INSERT INTO credit_accounts (account_type, owner_id, parent_account_id, total_purchased, total_remaining, status)
SELECT 
  'client'::TEXT as account_type,
  c.id as owner_id,
  (SELECT credit_account_id FROM agencies WHERE id = c.agency_id) as parent_account_id,
  COALESCE(c.credits, 0) as total_purchased,
  COALESCE(c.credits, 0) as total_remaining,
  'active'::TEXT as status
FROM clients c
WHERE c.id NOT IN (
  SELECT owner_id FROM credit_accounts WHERE account_type = 'client'
);

-- Link clients to their credit accounts
UPDATE clients c
SET credit_account_id = ca.id
FROM credit_accounts ca
WHERE ca.owner_id = c.id 
  AND ca.account_type = 'client'
  AND c.credit_account_id IS NULL;

-- =====================================================
-- 3. INITIALIZE CAMPAIGN CREDIT ACCOUNTS (OPTIONAL)
-- =====================================================
-- Only create for campaigns that need isolated budgets
-- By default, campaigns use shared client credit

-- For now, we'll create accounts for all campaigns but leave them at $0
-- They can optionally be allocated budget later
INSERT INTO credit_accounts (account_type, owner_id, parent_account_id, total_purchased, total_remaining, status)
SELECT 
  'campaign'::TEXT as account_type,
  ca.id as owner_id,
  (SELECT credit_account_id FROM clients WHERE id = ca.client_id) as parent_account_id,
  0 as total_purchased,
  0 as total_remaining,
  CASE 
    WHEN ca.status IN ('draft', 'proofed', 'in_production') THEN 'active'::TEXT
    ELSE 'active'::TEXT  -- All campaigns get active credit accounts
  END as status
FROM campaigns ca
WHERE ca.id NOT IN (
  SELECT owner_id FROM credit_accounts WHERE account_type = 'campaign'
);

-- Link campaigns to their credit accounts
UPDATE campaigns ca
SET credit_account_id = cr.id,
    uses_shared_credit = true -- Default to shared credit
FROM credit_accounts cr
WHERE cr.owner_id = ca.id 
  AND cr.account_type = 'campaign'
  AND ca.credit_account_id IS NULL;

-- =====================================================
-- 4. CREATE INITIAL TRANSACTIONS FOR MIGRATED CREDITS
-- =====================================================
-- Record the initial credit allocation as "purchase" transactions

INSERT INTO credit_transactions (
  account_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  notes,
  created_at
)
SELECT 
  ca.id as account_id,
  'purchase'::TEXT as transaction_type,
  ca.total_purchased as amount,
  0 as balance_before,
  ca.total_purchased as balance_after,
  'Initial credit migration from legacy system' as notes,
  NOW() as created_at
FROM credit_accounts ca
WHERE ca.account_type = 'client'
  AND ca.total_purchased > 0
  AND ca.id NOT IN (
    SELECT account_id FROM credit_transactions WHERE transaction_type = 'purchase'
  );

-- =====================================================
-- 5. UPDATE EXISTING POOLS WITH POOL_TYPE
-- =====================================================
-- Set pool_type for any existing pools that were created

UPDATE gift_card_pools
SET pool_type = CASE
  WHEN is_master_pool = true THEN 'csv'
  WHEN api_provider_id IS NOT NULL THEN 'api_config'
  ELSE 'csv'
END
WHERE pool_type IS NULL;

-- =====================================================
-- 6. VALIDATE MIGRATION
-- =====================================================
-- Check that all entities have credit accounts

DO $$
DECLARE
  agencies_without_accounts INTEGER;
  clients_without_accounts INTEGER;
  campaigns_without_accounts INTEGER;
BEGIN
  -- Count agencies without accounts
  SELECT COUNT(*) INTO agencies_without_accounts
  FROM agencies
  WHERE credit_account_id IS NULL;
  
  -- Count clients without accounts
  SELECT COUNT(*) INTO clients_without_accounts
  FROM clients
  WHERE credit_account_id IS NULL;
  
  -- Count campaigns without accounts
  SELECT COUNT(*) INTO campaigns_without_accounts
  FROM campaigns
  WHERE credit_account_id IS NULL;
  
  -- Log results
  RAISE NOTICE 'Migration validation:';
  RAISE NOTICE '  Agencies without accounts: %', agencies_without_accounts;
  RAISE NOTICE '  Clients without accounts: %', clients_without_accounts;
  RAISE NOTICE '  Campaigns without accounts: %', campaigns_without_accounts;
  
  IF agencies_without_accounts > 0 THEN
    RAISE WARNING '% agencies do not have credit accounts', agencies_without_accounts;
  END IF;
  
  IF clients_without_accounts > 0 THEN
    RAISE WARNING '% clients do not have credit accounts', clients_without_accounts;
  END IF;
END $$;

-- =====================================================
-- 7. CREATE SUMMARY VIEW FOR ADMIN DASHBOARD
-- =====================================================

CREATE OR REPLACE VIEW credit_account_summary AS
SELECT 
  ca.id,
  ca.account_type,
  ca.owner_id,
  ca.total_purchased,
  ca.total_allocated,
  ca.total_used,
  ca.total_remaining,
  ca.status,
  -- Owner details
  CASE 
    WHEN ca.account_type = 'agency' THEN a.name
    WHEN ca.account_type = 'client' THEN c.name
    WHEN ca.account_type = 'campaign' THEN cp.name
    ELSE NULL
  END as owner_name,
  -- Hierarchy
  ca.parent_account_id,
  pa.account_type as parent_account_type,
  -- Metrics
  CASE 
    WHEN ca.total_purchased > 0 THEN (ca.total_used / ca.total_purchased * 100)
    ELSE 0
  END as utilization_percentage,
  -- Recent activity
  (
    SELECT COUNT(*)
    FROM credit_transactions ct
    WHERE ct.account_id = ca.id
      AND ct.created_at >= NOW() - INTERVAL '30 days'
  ) as transactions_last_30_days
FROM credit_accounts ca
LEFT JOIN agencies a ON ca.account_type = 'agency' AND ca.owner_id = a.id
LEFT JOIN clients c ON ca.account_type = 'client' AND ca.owner_id = c.id
LEFT JOIN campaigns cp ON ca.account_type = 'campaign' AND ca.owner_id = cp.id
LEFT JOIN credit_accounts pa ON ca.parent_account_id = pa.id;

COMMENT ON VIEW credit_account_summary IS 'Summary view of all credit accounts with owner details and metrics for admin dashboard';

-- Grant access to view
GRANT SELECT ON credit_account_summary TO authenticated;

-- =====================================================
-- 8. CREATE REDEMPTION ANALYTICS VIEW
-- =====================================================

-- Simplified redemption analytics view (some columns may not exist)
CREATE OR REPLACE VIEW redemption_analytics AS
SELECT 
  r.campaign_id,
  c.name as campaign_name,
  c.client_id,
  cl.name as client_name,
  COUNT(*) as total_redemptions,
  MIN(r.created_at) as first_redemption_at,
  MAX(r.created_at) as last_redemption_at
FROM gift_card_redemptions r
JOIN campaigns c ON r.campaign_id = c.id
JOIN clients cl ON c.client_id = cl.id
GROUP BY r.campaign_id, c.name, c.client_id, cl.name;

COMMENT ON VIEW redemption_analytics IS 'Aggregated redemption analytics by campaign for reporting and dashboard';

-- Grant access to view
GRANT SELECT ON redemption_analytics TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Credit account system initialization complete!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Agencies can now purchase credit';
  RAISE NOTICE '  2. Agencies can allocate credit to clients';
  RAISE NOTICE '  3. Clients can allocate budget to campaigns (optional)';
  RAISE NOTICE '  4. Redemptions will automatically deduct from appropriate account';
END $$;

