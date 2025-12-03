-- =====================================================
-- Migration: Auto-Repair All Campaign Conditions
-- =====================================================
-- This migration automatically repairs ALL campaign conditions
-- that are missing gift card configuration by:
-- 1. Finding the appropriate gift card brand/denomination for each client
-- 2. Updating conditions with default values
-- 3. Syncing campaign_gift_card_config table
-- =====================================================

-- Step 1: Create a function to auto-repair conditions for a client
CREATE OR REPLACE FUNCTION auto_repair_condition_gift_card_config(
  p_condition_id UUID,
  p_client_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
  v_denomination NUMERIC;
BEGIN
  -- First try client-specific gift cards
  SELECT cagc.brand_id, cagc.denomination 
  INTO v_brand_id, v_denomination
  FROM client_available_gift_cards cagc
  INNER JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
  WHERE cagc.client_id = p_client_id
    AND cagc.is_enabled = true
    AND gcb.is_enabled_by_admin = true
  ORDER BY gcb.brand_name, cagc.denomination
  LIMIT 1;
  
  -- Fallback to any enabled brand if no client-specific
  IF v_brand_id IS NULL THEN
    SELECT gcb.id, gcd.denomination
    INTO v_brand_id, v_denomination
    FROM gift_card_brands gcb
    INNER JOIN gift_card_denominations gcd ON gcd.brand_id = gcb.id
    WHERE gcb.is_enabled_by_admin = true
      AND gcd.is_enabled_by_admin = true
    ORDER BY gcb.brand_name, gcd.denomination
    LIMIT 1;
  END IF;
  
  -- If still no brand found, return false
  IF v_brand_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the condition
  UPDATE campaign_conditions
  SET 
    brand_id = COALESCE(brand_id, v_brand_id),
    card_value = COALESCE(NULLIF(card_value, 0), v_denomination)
  WHERE id = p_condition_id
    AND (brand_id IS NULL OR card_value IS NULL OR card_value = 0);
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION auto_repair_condition_gift_card_config IS 
  'Automatically repairs a condition by assigning the first available gift card brand and denomination for the client.';

-- Step 2: Run the auto-repair on all broken conditions
DO $$
DECLARE
  v_total_broken INTEGER := 0;
  v_repaired INTEGER := 0;
  v_failed INTEGER := 0;
  v_condition RECORD;
  v_repair_success BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUTO-REPAIRING ALL BROKEN CONDITIONS';
  RAISE NOTICE '========================================';
  
  -- Count broken conditions
  SELECT COUNT(*) INTO v_total_broken
  FROM campaign_conditions cc
  INNER JOIN campaigns c ON c.id = cc.campaign_id
  WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
    AND cc.is_active = true;
  
  IF v_total_broken = 0 THEN
    RAISE NOTICE 'No broken conditions found. All conditions have valid gift card configuration!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found % conditions to repair', v_total_broken;
  RAISE NOTICE '';
  
  -- Process each broken condition
  FOR v_condition IN
    SELECT 
      cc.id AS condition_id,
      cc.condition_number,
      cc.condition_name,
      c.id AS campaign_id,
      c.name AS campaign_name,
      c.client_id
    FROM campaign_conditions cc
    INNER JOIN campaigns c ON c.id = cc.campaign_id
    WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
      AND cc.is_active = true
    ORDER BY c.name, cc.condition_number
  LOOP
    RAISE NOTICE 'Repairing: Campaign "%" - Condition %: %',
      v_condition.campaign_name,
      v_condition.condition_number,
      v_condition.condition_name;
    
    -- Attempt repair
    SELECT auto_repair_condition_gift_card_config(
      v_condition.condition_id,
      v_condition.client_id
    ) INTO v_repair_success;
    
    IF v_repair_success THEN
      v_repaired := v_repaired + 1;
      RAISE NOTICE '  ✓ Repaired successfully';
    ELSE
      v_failed := v_failed + 1;
      RAISE NOTICE '  ✗ FAILED - No gift cards available for this client';
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REPAIR SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total broken conditions: %', v_total_broken;
  RAISE NOTICE 'Successfully repaired:   %', v_repaired;
  RAISE NOTICE 'Failed to repair:        %', v_failed;
  RAISE NOTICE '========================================';
END $$;

-- Step 3: Sync all repaired conditions to campaign_gift_card_config
DO $$
DECLARE
  v_synced INTEGER := 0;
  v_condition RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SYNCING TO CAMPAIGN_GIFT_CARD_CONFIG';
  RAISE NOTICE '========================================';
  
  FOR v_condition IN
    SELECT DISTINCT
      cc.campaign_id,
      cc.condition_number,
      cc.brand_id,
      cc.card_value
    FROM campaign_conditions cc
    WHERE cc.brand_id IS NOT NULL
      AND cc.card_value IS NOT NULL
      AND cc.card_value > 0
      AND cc.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM campaign_gift_card_config cgc
        WHERE cgc.campaign_id = cc.campaign_id
          AND cgc.condition_number = cc.condition_number
      )
  LOOP
    INSERT INTO campaign_gift_card_config (campaign_id, condition_number, brand_id, denomination)
    VALUES (v_condition.campaign_id, v_condition.condition_number, v_condition.brand_id, v_condition.card_value)
    ON CONFLICT (campaign_id, condition_number) DO UPDATE 
    SET brand_id = EXCLUDED.brand_id, denomination = EXCLUDED.denomination;
    
    v_synced := v_synced + 1;
  END LOOP;
  
  RAISE NOTICE 'Synced % entries to campaign_gift_card_config', v_synced;
  RAISE NOTICE '========================================';
END $$;

-- Step 4: Final verification
DO $$
DECLARE
  v_remaining INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL VERIFICATION';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO v_remaining
  FROM campaign_conditions cc
  WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
    AND cc.is_active = true;
  
  IF v_remaining = 0 THEN
    RAISE NOTICE '✓ SUCCESS: All active campaign conditions now have gift card configuration!';
  ELSE
    RAISE NOTICE '⚠ WARNING: % conditions still need manual configuration', v_remaining;
    RAISE NOTICE 'These campaigns may not have any gift cards available for their clients.';
    RAISE NOTICE 'Run: SELECT * FROM v_conditions_needing_gift_card_config;';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- Grant execute on the repair function
GRANT EXECUTE ON FUNCTION auto_repair_condition_gift_card_config(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_repair_condition_gift_card_config(UUID, UUID) TO service_role;

