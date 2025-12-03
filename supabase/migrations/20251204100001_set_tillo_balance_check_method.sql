-- =====================================================
-- Migration: Set balance_check_method for Tillo brands
-- =====================================================
-- This migration updates existing Tillo-supported brands to explicitly
-- set balance_check_method = 'tillo_api' for clarity and consistency.
--
-- While the edge function now auto-detects Tillo brands, having the
-- balance_check_method explicitly set makes the configuration clearer
-- and allows for easier manual override if needed.
-- =====================================================

-- Update all brands that are Tillo-enabled but don't have balance_check_method set
UPDATE gift_card_brands
SET balance_check_method = 'tillo_api'
WHERE (
  -- Brand is from Tillo provider
  provider = 'tillo'
  OR 
  -- Brand has a Tillo brand code configured
  tillo_brand_code IS NOT NULL
)
AND (
  -- balance_check_method is not set or is 'manual' (default)
  balance_check_method IS NULL 
  OR balance_check_method = 'manual'
);

-- Log the update for audit purposes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Tillo brands to use tillo_api balance check method', updated_count;
END $$;

-- Also ensure brands that don't have Tillo support are correctly set to 'manual'
-- (only if they don't already have a valid method configured)
UPDATE gift_card_brands
SET balance_check_method = 'manual'
WHERE provider != 'tillo'
  AND tillo_brand_code IS NULL
  AND (balance_check_method IS NULL);

COMMENT ON COLUMN gift_card_brands.balance_check_method IS 
  'Method to check card balance. Auto-detected for Tillo brands if not set. Values: tillo_api, manual, other_api, none';

