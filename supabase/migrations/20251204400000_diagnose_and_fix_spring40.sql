-- =====================================================
-- Migration: Diagnose and Fix Spring 40 Campaign
-- =====================================================
-- This migration:
-- 1. Diagnoses all campaign conditions missing gift card config
-- 2. Specifically fixes the "Spring 40" campaign
-- 3. Reports what was fixed
-- =====================================================

-- Step 1: Report current state of broken conditions
DO $$
DECLARE
  problem_count INTEGER;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSING CAMPAIGN CONDITIONS';
  RAISE NOTICE '========================================';
  
  -- Count problematic conditions
  SELECT COUNT(*) INTO problem_count
  FROM campaign_conditions cc
  WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
    AND cc.is_active = true;
  
  IF problem_count > 0 THEN
    RAISE NOTICE 'Found % active conditions missing gift card configuration:', problem_count;
    RAISE NOTICE '';
    
    -- List each problematic condition
    FOR rec IN 
      SELECT 
        cc.id AS condition_id,
        c.name AS campaign_name,
        c.id AS campaign_id,
        cl.name AS client_name,
        cc.condition_number,
        cc.condition_name,
        CASE 
          WHEN cc.brand_id IS NULL AND cc.card_value IS NULL THEN 'Missing brand AND value'
          WHEN cc.brand_id IS NULL THEN 'Missing brand'
          WHEN cc.card_value IS NULL OR cc.card_value = 0 THEN 'Missing value'
          ELSE 'Unknown issue'
        END AS issue
      FROM campaign_conditions cc
      INNER JOIN campaigns c ON c.id = cc.campaign_id
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
        AND cc.is_active = true
      ORDER BY c.name, cc.condition_number
    LOOP
      RAISE NOTICE '  Campaign: % | Condition %: % | Issue: %',
        rec.campaign_name,
        rec.condition_number,
        rec.condition_name,
        rec.issue;
    END LOOP;
  ELSE
    RAISE NOTICE 'All active campaign conditions have valid gift card configuration!';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Step 2: Fix "Spring 40" campaign specifically
DO $$
DECLARE
  v_campaign_id UUID;
  v_client_id UUID;
  v_first_brand_id UUID;
  v_first_denomination NUMERIC;
  v_updated_count INTEGER := 0;
  v_condition RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIXING SPRING 40 CAMPAIGN';
  RAISE NOTICE '========================================';

  -- Find the Spring 40 campaign
  SELECT c.id, c.client_id INTO v_campaign_id, v_client_id
  FROM campaigns c
  WHERE c.name ILIKE '%Spring 40%'
  LIMIT 1;
  
  IF v_campaign_id IS NULL THEN
    RAISE NOTICE 'Campaign "Spring 40" not found. Skipping fix.';
    RAISE NOTICE 'Attempting to find any campaign with broken conditions...';
    
    -- Find any campaign with broken conditions
    SELECT DISTINCT c.id, c.client_id INTO v_campaign_id, v_client_id
    FROM campaigns c
    INNER JOIN campaign_conditions cc ON cc.campaign_id = c.id
    WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
      AND cc.is_active = true
    LIMIT 1;
    
    IF v_campaign_id IS NOT NULL THEN
      RAISE NOTICE 'Found campaign with broken conditions: %', v_campaign_id;
    END IF;
  ELSE
    RAISE NOTICE 'Found Spring 40 campaign: %', v_campaign_id;
    RAISE NOTICE 'Client ID: %', v_client_id;
  END IF;
  
  IF v_campaign_id IS NULL OR v_client_id IS NULL THEN
    RAISE NOTICE 'No campaigns found that need fixing. Exiting.';
    RETURN;
  END IF;

  -- Get first available gift card brand and denomination for this client
  SELECT cagc.brand_id, cagc.denomination 
  INTO v_first_brand_id, v_first_denomination
  FROM client_available_gift_cards cagc
  INNER JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
  WHERE cagc.client_id = v_client_id
    AND cagc.is_enabled = true
    AND gcb.is_enabled_by_admin = true
  ORDER BY gcb.brand_name, cagc.denomination
  LIMIT 1;
  
  -- If no client-specific gift cards, try to find any enabled brand
  IF v_first_brand_id IS NULL THEN
    RAISE NOTICE 'No client-specific gift cards found. Looking for any enabled brand...';
    
    SELECT gcb.id, gcd.denomination
    INTO v_first_brand_id, v_first_denomination
    FROM gift_card_brands gcb
    INNER JOIN gift_card_denominations gcd ON gcd.brand_id = gcb.id
    WHERE gcb.is_enabled_by_admin = true
      AND gcd.is_enabled_by_admin = true
    ORDER BY gcb.brand_name, gcd.denomination
    LIMIT 1;
  END IF;
  
  IF v_first_brand_id IS NULL THEN
    RAISE NOTICE 'ERROR: No enabled gift card brands found in the system!';
    RAISE NOTICE 'Please configure gift card brands in the admin panel first.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Will use brand_id: %, denomination: %', v_first_brand_id, v_first_denomination;
  
  -- Update all conditions for this campaign that are missing gift card config
  FOR v_condition IN
    SELECT id, condition_number, condition_name, brand_id, card_value
    FROM campaign_conditions
    WHERE campaign_id = v_campaign_id
      AND (brand_id IS NULL OR card_value IS NULL OR card_value = 0)
      AND is_active = true
  LOOP
    RAISE NOTICE 'Fixing condition %: % (was brand_id: %, card_value: %)',
      v_condition.condition_number,
      v_condition.condition_name,
      COALESCE(v_condition.brand_id::text, 'NULL'),
      COALESCE(v_condition.card_value::text, 'NULL');
    
    UPDATE campaign_conditions
    SET 
      brand_id = COALESCE(brand_id, v_first_brand_id),
      card_value = COALESCE(NULLIF(card_value, 0), v_first_denomination)
    WHERE id = v_condition.id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Updated % conditions for campaign', v_updated_count;
  RAISE NOTICE '========================================';
  
  -- Verify the fix
  RAISE NOTICE 'VERIFICATION - Current state of campaign conditions:';
  FOR v_condition IN
    SELECT id, condition_number, condition_name, brand_id, card_value
    FROM campaign_conditions
    WHERE campaign_id = v_campaign_id
    ORDER BY condition_number
  LOOP
    RAISE NOTICE '  Condition %: % | brand_id: % | card_value: %',
      v_condition.condition_number,
      v_condition.condition_name,
      COALESCE(v_condition.brand_id::text, 'NULL'),
      COALESCE(v_condition.card_value::text, 'NULL');
  END LOOP;
  RAISE NOTICE '========================================';
END $$;

-- Step 3: Also update the campaign_gift_card_config table for backward compatibility
DO $$
DECLARE
  v_campaign_id UUID;
  v_condition RECORD;
  v_existing_config_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SYNCING CAMPAIGN_GIFT_CARD_CONFIG TABLE';
  RAISE NOTICE '========================================';

  -- Find the Spring 40 campaign (or any campaign we just fixed)
  SELECT c.id INTO v_campaign_id
  FROM campaigns c
  WHERE c.name ILIKE '%Spring 40%'
  LIMIT 1;
  
  IF v_campaign_id IS NULL THEN
    -- Find any campaign we might have fixed
    SELECT DISTINCT c.id INTO v_campaign_id
    FROM campaigns c
    INNER JOIN campaign_conditions cc ON cc.campaign_id = c.id
    WHERE cc.brand_id IS NOT NULL
      AND cc.card_value IS NOT NULL
      AND cc.card_value > 0
    LIMIT 1;
  END IF;
  
  IF v_campaign_id IS NULL THEN
    RAISE NOTICE 'No campaign found to sync. Skipping.';
    RETURN;
  END IF;
  
  -- For each condition with gift card config, ensure there's a matching entry in campaign_gift_card_config
  FOR v_condition IN
    SELECT id, condition_number, brand_id, card_value
    FROM campaign_conditions
    WHERE campaign_id = v_campaign_id
      AND brand_id IS NOT NULL
      AND card_value IS NOT NULL
      AND card_value > 0
  LOOP
    -- Check if config already exists
    SELECT COUNT(*) INTO v_existing_config_count
    FROM campaign_gift_card_config
    WHERE campaign_id = v_campaign_id
      AND condition_number = v_condition.condition_number;
    
    IF v_existing_config_count = 0 THEN
      INSERT INTO campaign_gift_card_config (campaign_id, condition_number, brand_id, denomination)
      VALUES (v_campaign_id, v_condition.condition_number, v_condition.brand_id, v_condition.card_value)
      ON CONFLICT (campaign_id, condition_number) DO UPDATE 
      SET brand_id = EXCLUDED.brand_id, denomination = EXCLUDED.denomination;
      
      RAISE NOTICE 'Created config for condition %', v_condition.condition_number;
    ELSE
      UPDATE campaign_gift_card_config
      SET brand_id = v_condition.brand_id, denomination = v_condition.card_value
      WHERE campaign_id = v_campaign_id
        AND condition_number = v_condition.condition_number;
      
      RAISE NOTICE 'Updated config for condition %', v_condition.condition_number;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Config sync complete for campaign: %', v_campaign_id;
  RAISE NOTICE '========================================';
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'The Spring 40 campaign should now be ready for gift card provisioning.';
  RAISE NOTICE 'Run this query to verify:';
  RAISE NOTICE '  SELECT * FROM v_conditions_needing_gift_card_config;';
  RAISE NOTICE '========================================';
END $$;

