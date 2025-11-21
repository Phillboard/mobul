-- Phase 1: Critical Database Fixes

-- 1. Add Generic brand if not exists
INSERT INTO gift_card_brands (brand_name, brand_code, provider, is_active, category)
VALUES ('Generic', 'generic', 'csv_only', true, 'general')
ON CONFLICT (brand_code) DO NOTHING;

-- 2. Backfill NULL brand_ids with Generic brand
UPDATE gift_card_pools
SET brand_id = (SELECT id FROM gift_card_brands WHERE brand_code = 'generic')
WHERE brand_id IS NULL;

-- 3. Add index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_available_for_purchase 
ON gift_card_pools(available_for_purchase) 
WHERE available_for_purchase = true;

-- 4. Add index for master pools
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_master
ON gift_card_pools(is_master_pool)
WHERE is_master_pool = true;