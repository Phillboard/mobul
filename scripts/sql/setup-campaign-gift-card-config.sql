-- Setup Campaign Gift Card Configuration
-- Run this script to configure gift card for campaign with code AB6-1061
-- This links the campaign to a gift card brand/denomination

DO $$
DECLARE
  v_campaign_id UUID;
  v_brand_id UUID;
  v_client_id UUID;
  v_denomination NUMERIC := 25.00;  -- Default $25, adjust as needed
  v_condition_number INT := 1;       -- Default condition 1
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setting up gift card config for AB6-1061';
  RAISE NOTICE '========================================';
  
  -- ==========================================
  -- STEP 1: Get campaign ID and client ID
  -- ==========================================
  SELECT c.id, c.client_id 
  INTO v_campaign_id, v_client_id
  FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
  LIMIT 1;

  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: No campaign found for code AB6-1061. Create campaign first!';
  END IF;

  RAISE NOTICE 'Found campaign ID: %', v_campaign_id;
  RAISE NOTICE 'Client ID: %', v_client_id;

  -- ==========================================
  -- STEP 2: Get or select a brand
  -- ==========================================
  -- Try to find Starbucks first (popular choice)
  SELECT id INTO v_brand_id 
  FROM gift_card_brands 
  WHERE name ILIKE '%starbucks%'
  LIMIT 1;

  -- If no Starbucks, try Amazon
  IF v_brand_id IS NULL THEN
    SELECT id INTO v_brand_id 
    FROM gift_card_brands 
    WHERE name ILIKE '%amazon%'
    LIMIT 1;
  END IF;

  -- If still nothing, get the first available brand
  IF v_brand_id IS NULL THEN
    SELECT id INTO v_brand_id 
    FROM gift_card_brands 
    WHERE status = 'active'
    ORDER BY name
    LIMIT 1;
  END IF;

  IF v_brand_id IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: No gift card brands found in database. Add brands first!';
  END IF;

  RAISE NOTICE 'Selected brand ID: % (name: %)', 
    v_brand_id, 
    (SELECT name FROM gift_card_brands WHERE id = v_brand_id);

  -- ==========================================
  -- STEP 3: Ensure client has access to this gift card
  -- ==========================================
  INSERT INTO client_available_gift_cards (
    client_id,
    brand_id,
    denomination,
    is_enabled,
    created_at
  ) VALUES (
    v_client_id,
    v_brand_id,
    v_denomination,
    true,
    NOW()
  ) 
  ON CONFLICT (client_id, brand_id, denomination) 
  DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();

  RAISE NOTICE '✓ Client access granted to gift card';

  -- ==========================================
  -- STEP 4: Add gift card config to campaign
  -- ==========================================
  INSERT INTO campaign_gift_card_config (
    campaign_id,
    brand_id,
    denomination,
    condition_number,
    created_at
  ) VALUES (
    v_campaign_id,
    v_brand_id,
    v_denomination,
    v_condition_number,
    NOW()
  ) 
  ON CONFLICT (campaign_id, condition_number) 
  DO UPDATE SET 
    brand_id = v_brand_id,
    denomination = v_denomination,
    updated_at = NOW();

  RAISE NOTICE '✓ Gift card config added to campaign';

  -- ==========================================
  -- STEP 5: Ensure campaign has at least one condition
  -- ==========================================
  IF NOT EXISTS (
    SELECT 1 FROM campaign_conditions 
    WHERE campaign_id = v_campaign_id 
      AND condition_number = v_condition_number
  ) THEN
    INSERT INTO campaign_conditions (
      campaign_id,
      condition_number,
      condition_name,
      trigger_type,
      is_active,
      created_at
    ) VALUES (
      v_campaign_id,
      v_condition_number,
      'Sales Call Completion',
      'manual_approval',
      true,
      NOW()
    );
    RAISE NOTICE '✓ Created campaign condition';
  ELSE
    RAISE NOTICE '✓ Campaign condition already exists';
  END IF;

  -- ==========================================
  -- STEP 6: Verify setup
  -- ==========================================
  DECLARE
    v_inventory_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_inventory_count
    FROM gift_card_inventory
    WHERE brand_id = v_brand_id
      AND denomination = v_denomination
      AND status = 'available';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SETUP COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Campaign: %', (SELECT name FROM campaigns WHERE id = v_campaign_id);
    RAISE NOTICE 'Gift Card: % $%', 
      (SELECT name FROM gift_card_brands WHERE id = v_brand_id),
      v_denomination;
    RAISE NOTICE 'Condition Number: %', v_condition_number;
    RAISE NOTICE 'Available Inventory: % cards', v_inventory_count;
    RAISE NOTICE '';
    
    IF v_inventory_count = 0 THEN
      RAISE WARNING 'No inventory available! Upload gift cards to platform inventory.';
      RAISE NOTICE 'Next step: Upload gift cards via Admin > Platform Inventory';
    ELSE
      RAISE NOTICE '✓ Call center is ready to use!';
      RAISE NOTICE 'Try code AB6-1061 in call center now.';
    END IF;
  END;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ERROR OCCURRED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Hint: Check that campaign and recipient exist first.';
    RAISE;
END $$;

-- ==========================================
-- Final verification query
-- ==========================================
SELECT 
  'Verification' as step,
  r.redemption_code,
  c.name as campaign_name,
  gc.brand_id,
  gc.denomination,
  gc.condition_number,
  gb.name as brand_name
FROM recipients r
INNER JOIN audiences a ON r.audience_id = a.id
INNER JOIN campaigns c ON c.audience_id = a.id
INNER JOIN campaign_gift_card_config gc ON gc.campaign_id = c.id
INNER JOIN gift_card_brands gb ON gc.brand_id = gb.id
WHERE UPPER(r.redemption_code) = 'AB6-1061';

