-- =====================================================
-- DROP ALL OLD GIFT CARD TABLES
-- =====================================================
-- Migration: Complete cleanup of old gift card system
-- Part of fresh start gift card overhaul
-- =====================================================

-- Disable RLS on tables before dropping
ALTER TABLE IF EXISTS gift_card_pools_legacy DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_cards_legacy DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_card_sales_legacy DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_sales_legacy DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_card_sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_gift_card_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_balance_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_api_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_api_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipient_gift_cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gift_card_redemptions DISABLE ROW LEVEL SECURITY;

-- Drop all old functions that reference old tables
DO $$ 
BEGIN
  DROP FUNCTION IF EXISTS claim_available_card(UUID, UUID, UUID);
  DROP FUNCTION IF EXISTS claim_available_card(UUID, UUID);
  DROP FUNCTION IF EXISTS get_or_create_credit_account(TEXT, UUID, UUID);
  DROP FUNCTION IF EXISTS claim_gift_card_from_inventory(UUID, NUMERIC);
  DROP FUNCTION IF EXISTS record_billing_transaction(UUID, UUID, UUID, NUMERIC, NUMERIC);
  DROP FUNCTION IF EXISTS claim_card_atomic(UUID, UUID, UUID, UUID);
  DROP FUNCTION IF EXISTS update_gift_card_delivery_status(UUID, TEXT, TEXT, TEXT);
END $$;

-- Drop indexes first (some may have dependencies)
DROP INDEX IF EXISTS idx_gift_card_pools_brand;
DROP INDEX IF EXISTS idx_gift_card_pools_client;
DROP INDEX IF EXISTS idx_gift_card_pools_type;
DROP INDEX IF EXISTS idx_gift_card_pools_active;
DROP INDEX IF EXISTS idx_gift_card_pools_master;
DROP INDEX IF EXISTS idx_gift_card_pools_brand_id;
DROP INDEX IF EXISTS idx_gift_cards_pool;
DROP INDEX IF EXISTS idx_gift_cards_status;
DROP INDEX IF EXISTS idx_gift_cards_code;
DROP INDEX IF EXISTS idx_gift_cards_recipient;
DROP INDEX IF EXISTS idx_gift_cards_pool_status;
DROP INDEX IF EXISTS idx_gift_cards_tags;
DROP INDEX IF EXISTS idx_gift_card_deliveries_campaign;
DROP INDEX IF EXISTS idx_gift_card_audit_log_entity;
DROP INDEX IF EXISTS idx_credit_accounts_owner;
DROP INDEX IF EXISTS idx_credit_accounts_parent;
DROP INDEX IF EXISTS idx_credit_accounts_status;
DROP INDEX IF EXISTS idx_credit_transactions_account;
DROP INDEX IF EXISTS idx_credit_transactions_type;
DROP INDEX IF EXISTS idx_credit_transactions_redemption;
DROP INDEX IF EXISTS idx_redemptions_campaign;
DROP INDEX IF EXISTS idx_redemptions_code;
DROP INDEX IF EXISTS idx_redemptions_status;
DROP INDEX IF EXISTS idx_redemptions_account;
DROP INDEX IF EXISTS idx_redemptions_created;

-- Drop junction table first (has foreign keys)
DROP TABLE IF EXISTS recipient_gift_cards CASCADE;

-- Drop old credit system tables
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS gift_card_redemptions CASCADE;
DROP TABLE IF EXISTS credit_accounts CASCADE;

-- Drop current gift card tables
DROP TABLE IF EXISTS gift_card_balance_history CASCADE;
DROP TABLE IF EXISTS gift_card_api_purchases CASCADE;
DROP TABLE IF EXISTS gift_card_audit_log CASCADE;
DROP TABLE IF EXISTS gift_card_deliveries CASCADE;
DROP TABLE IF EXISTS gift_cards CASCADE;
DROP TABLE IF EXISTS gift_card_api_providers CASCADE;
DROP TABLE IF EXISTS admin_gift_card_inventory CASCADE;
DROP TABLE IF EXISTS admin_card_sales CASCADE;
DROP TABLE IF EXISTS gift_card_sales CASCADE;
DROP TABLE IF EXISTS gift_card_pools CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS gift_card_sales_legacy CASCADE;
DROP TABLE IF EXISTS admin_card_sales_legacy CASCADE;
DROP TABLE IF EXISTS gift_cards_legacy CASCADE;
DROP TABLE IF EXISTS gift_card_pools_legacy CASCADE;

-- Drop system_alerts if it exists (from legacy migration)
DROP TABLE IF EXISTS system_alerts CASCADE;

