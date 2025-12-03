-- ============================================================
-- FIX SPRING 27 AND ANY RECENT CAMPAIGNS WITH NULL GIFT CARD CONFIG
-- ============================================================
-- This migration fixes campaigns created with missing brand_id/card_value
-- by setting them to the first enabled brand with $25 denomination
-- ============================================================

-- Step 1: Report what we're about to fix
DO $$
DECLARE
  v_affected_count INTEGER;
  v_default_brand_id UUID;
  v_default_brand_name TEXT;
BEGIN
  -- Count affected conditions
  SELECT COUNT(*) INTO v_affected_count
  FROM campaign_conditions 
  WHERE is_active = true 
    AND (brand_id IS NULL OR card_value IS NULL);
  
  RAISE NOTICE 'Found % active conditions with missing brand_id or card_value', v_affected_count;

  -- Find a default brand to use (prefer Starbucks, then Amazon, then any enabled)
  SELECT id, brand_name INTO v_default_brand_id, v_default_brand_name
  FROM gift_card_brands
  WHERE is_enabled_by_admin = true
  ORDER BY 
    CASE 
      WHEN brand_name ILIKE '%starbucks%' THEN 1
      WHEN brand_name ILIKE '%amazon%' THEN 2
      WHEN brand_name ILIKE '%visa%' THEN 3
      WHEN brand_name ILIKE '%mastercard%' THEN 4
      ELSE 10
    END,
    brand_name
  LIMIT 1;

  IF v_default_brand_id IS NULL THEN
    RAISE NOTICE 'No enabled brands found. Please add brands first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using default brand: % (%)', v_default_brand_name, v_default_brand_id;
END $$;

-- Step 2: Update all active conditions missing brand_id
UPDATE campaign_conditions
SET 
  brand_id = (
    SELECT id FROM gift_card_brands
    WHERE is_enabled_by_admin = true
    ORDER BY 
      CASE 
        WHEN brand_name ILIKE '%starbucks%' THEN 1
        WHEN brand_name ILIKE '%amazon%' THEN 2
        WHEN brand_name ILIKE '%visa%' THEN 3
        ELSE 10
      END,
      brand_name
    LIMIT 1
  ),
  card_value = COALESCE(card_value, 25.00)
WHERE is_active = true
  AND brand_id IS NULL;

-- Step 3: Update conditions that have brand_id but missing card_value
UPDATE campaign_conditions
SET card_value = 25.00
WHERE is_active = true
  AND brand_id IS NOT NULL
  AND card_value IS NULL;

-- Step 4: Set default SMS template for conditions missing it
UPDATE campaign_conditions
SET sms_template = 'Hi {first_name}! Here''s your ${value} {provider} gift card: {link}'
WHERE is_active = true
  AND sms_template IS NULL;

-- Step 5: Ensure campaign_gift_card_config is also populated
-- For each condition with brand_id and card_value, ensure there's a corresponding config row
INSERT INTO campaign_gift_card_config (campaign_id, condition_number, brand_id, denomination)
SELECT 
  cc.campaign_id,
  cc.condition_number,
  cc.brand_id,
  cc.card_value
FROM campaign_conditions cc
WHERE cc.is_active = true
  AND cc.brand_id IS NOT NULL
  AND cc.card_value IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM campaign_gift_card_config cgc
    WHERE cgc.campaign_id = cc.campaign_id
      AND cgc.condition_number = cc.condition_number
  )
ON CONFLICT DO NOTHING;

-- Step 6: Report final state
DO $$
DECLARE
  v_still_missing INTEGER;
  v_fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_still_missing
  FROM campaign_conditions 
  WHERE is_active = true 
    AND (brand_id IS NULL OR card_value IS NULL);
  
  SELECT COUNT(*) INTO v_fixed_count
  FROM campaign_conditions 
  WHERE is_active = true 
    AND brand_id IS NOT NULL 
    AND card_value IS NOT NULL;
  
  IF v_still_missing > 0 THEN
    RAISE WARNING 'Still have % conditions with missing configuration!', v_still_missing;
  ELSE
    RAISE NOTICE 'All % active conditions now have valid gift card configuration!', v_fixed_count;
  END IF;
END $$;

-- Step 7: Show updated Spring 27 campaign specifically
DO $$
DECLARE
  v_campaign_id UUID;
  v_campaign_name TEXT;
  v_condition_count INTEGER;
BEGIN
  -- Find spring 27 campaign
  SELECT id, name INTO v_campaign_id, v_campaign_name
  FROM campaigns 
  WHERE name ILIKE '%spring%27%' 
     OR name ILIKE '%spring 27%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_campaign_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_condition_count
    FROM campaign_conditions
    WHERE campaign_id = v_campaign_id
      AND is_active = true
      AND brand_id IS NOT NULL
      AND card_value IS NOT NULL;
    
    RAISE NOTICE 'Campaign "%" now has % fully configured conditions', v_campaign_name, v_condition_count;
  ELSE
    -- Try to find most recent campaign
    SELECT id, name INTO v_campaign_id, v_campaign_name
    FROM campaigns 
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_campaign_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_condition_count
      FROM campaign_conditions
      WHERE campaign_id = v_campaign_id
        AND is_active = true
        AND brand_id IS NOT NULL
        AND card_value IS NOT NULL;
      
      RAISE NOTICE 'Most recent campaign "%" has % fully configured conditions', v_campaign_name, v_condition_count;
    END IF;
  END IF;
END $$;

