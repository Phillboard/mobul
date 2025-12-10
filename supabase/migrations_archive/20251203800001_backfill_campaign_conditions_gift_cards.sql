-- Backfill gift card configuration for existing campaign conditions
-- This fixes campaigns created before the brand_id/card_value fix was implemented

-- Step 1: Get a default brand to use (preferably an enabled one)
-- You can run this query first to see available brands:
-- SELECT id, brand_name, is_enabled_by_admin FROM gift_card_brands WHERE is_enabled_by_admin = true LIMIT 10;

-- Step 2: Update conditions that are missing brand_id/card_value
-- This uses the first enabled brand and $25 as defaults
DO $$
DECLARE
  default_brand_id UUID;
BEGIN
  -- Get first enabled brand
  SELECT id INTO default_brand_id
  FROM gift_card_brands
  WHERE is_enabled_by_admin = true
  ORDER BY brand_name
  LIMIT 1;

  IF default_brand_id IS NULL THEN
    RAISE NOTICE 'No enabled brands found. Please add gift card brands first.';
    RETURN;
  END IF;

  -- Update conditions missing gift card config
  UPDATE campaign_conditions
  SET 
    brand_id = default_brand_id,
    card_value = 25.00
  WHERE brand_id IS NULL
    AND is_active = true;

  RAISE NOTICE 'Updated % conditions with default brand_id and card_value', (
    SELECT COUNT(*) FROM campaign_conditions 
    WHERE brand_id = default_brand_id AND card_value = 25.00
  );
END $$;

-- Optional: Set a specific brand for a specific campaign
-- Uncomment and modify as needed:
/*
UPDATE campaign_conditions
SET 
  brand_id = 'YOUR_BRAND_UUID_HERE',
  card_value = 25.00
WHERE campaign_id = (SELECT id FROM campaigns WHERE campaign_name = 'spring 26')
  AND brand_id IS NULL;
*/

