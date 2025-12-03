-- =====================================================
-- Migration: Fix NULL brand_id in campaign_conditions
-- =====================================================
-- This migration identifies and addresses campaign conditions that are 
-- missing gift card configuration (NULL brand_id and/or card_value).
-- These conditions will fail during gift card provisioning.
-- =====================================================

-- Step 1: Create a function to identify problematic conditions
CREATE OR REPLACE FUNCTION get_conditions_missing_gift_card_config()
RETURNS TABLE (
  condition_id UUID,
  campaign_id UUID,
  campaign_name TEXT,
  client_id UUID,
  client_name TEXT,
  condition_number INTEGER,
  condition_name TEXT,
  brand_id UUID,
  card_value NUMERIC,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id AS condition_id,
    cc.campaign_id,
    c.name AS campaign_name,
    c.client_id,
    cl.name AS client_name,
    cc.condition_number,
    cc.condition_name,
    cc.brand_id,
    cc.card_value,
    cc.is_active,
    cc.created_at
  FROM campaign_conditions cc
  INNER JOIN campaigns c ON c.id = cc.campaign_id
  LEFT JOIN clients cl ON cl.id = c.client_id
  WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
    AND cc.is_active = true
  ORDER BY cc.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_conditions_missing_gift_card_config IS 
  'Returns all active campaign conditions that are missing gift card configuration (brand_id or card_value). These conditions will fail during gift card provisioning.';

-- Step 2: Create a view for easy monitoring
CREATE OR REPLACE VIEW v_conditions_needing_gift_card_config AS
SELECT 
  cc.id AS condition_id,
  cc.campaign_id,
  c.name AS campaign_name,
  c.status AS campaign_status,
  cl.name AS client_name,
  cc.condition_number,
  cc.condition_name,
  cc.brand_id,
  cc.card_value,
  cc.is_active,
  CASE 
    WHEN cc.brand_id IS NULL AND cc.card_value IS NULL THEN 'Missing brand and value'
    WHEN cc.brand_id IS NULL THEN 'Missing brand'
    WHEN cc.card_value IS NULL OR cc.card_value = 0 THEN 'Missing value'
    ELSE 'OK'
  END AS issue_type
FROM campaign_conditions cc
INNER JOIN campaigns c ON c.id = cc.campaign_id
LEFT JOIN clients cl ON cl.id = c.client_id
WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
  AND cc.is_active = true;

COMMENT ON VIEW v_conditions_needing_gift_card_config IS 
  'View showing all active campaign conditions that need gift card configuration before they can be used for provisioning.';

-- Step 3: Log the current state of problematic conditions
DO $$
DECLARE
  problem_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO problem_count
  FROM campaign_conditions cc
  WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
    AND cc.is_active = true;
  
  IF problem_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GIFT CARD CONFIGURATION ISSUES FOUND';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Found % active conditions missing gift card configuration', problem_count;
    RAISE NOTICE '';
    RAISE NOTICE 'These conditions will fail during provisioning.';
    RAISE NOTICE 'To fix: Edit each campaign and configure gift card brand/value for all conditions.';
    RAISE NOTICE '';
    RAISE NOTICE 'Run this query to see details:';
    RAISE NOTICE 'SELECT * FROM v_conditions_needing_gift_card_config;';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE 'All active campaign conditions have valid gift card configuration.';
  END IF;
END $$;

-- Step 4: Create helper function to check if a specific condition is ready for provisioning
CREATE OR REPLACE FUNCTION is_condition_ready_for_provisioning(p_condition_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
  v_card_value NUMERIC;
  v_is_active BOOLEAN;
BEGIN
  SELECT brand_id, card_value, is_active
  INTO v_brand_id, v_card_value, v_is_active
  FROM campaign_conditions
  WHERE id = p_condition_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Condition must be active and have both brand_id and card_value
  RETURN v_is_active 
    AND v_brand_id IS NOT NULL 
    AND v_card_value IS NOT NULL 
    AND v_card_value > 0;
END;
$$;

COMMENT ON FUNCTION is_condition_ready_for_provisioning IS 
  'Checks if a campaign condition has all required gift card configuration for provisioning.';

-- Step 5: Create function to get condition details with gift card readiness
CREATE OR REPLACE FUNCTION get_condition_with_readiness(p_condition_id UUID)
RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  condition_number INTEGER,
  condition_name TEXT,
  trigger_type TEXT,
  brand_id UUID,
  card_value NUMERIC,
  brand_name TEXT,
  is_active BOOLEAN,
  is_ready_for_provisioning BOOLEAN,
  missing_config TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.campaign_id,
    cc.condition_number,
    cc.condition_name,
    cc.trigger_type,
    cc.brand_id,
    cc.card_value,
    gcb.brand_name,
    cc.is_active,
    (cc.is_active AND cc.brand_id IS NOT NULL AND cc.card_value IS NOT NULL AND cc.card_value > 0) AS is_ready_for_provisioning,
    CASE 
      WHEN NOT cc.is_active THEN 'Condition is inactive'
      WHEN cc.brand_id IS NULL AND (cc.card_value IS NULL OR cc.card_value = 0) THEN 'Missing gift card brand and value - edit campaign to configure'
      WHEN cc.brand_id IS NULL THEN 'Missing gift card brand - edit campaign to configure'
      WHEN cc.card_value IS NULL OR cc.card_value = 0 THEN 'Missing gift card value - edit campaign to configure'
      ELSE NULL
    END AS missing_config
  FROM campaign_conditions cc
  LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
  WHERE cc.id = p_condition_id;
END;
$$;

COMMENT ON FUNCTION get_condition_with_readiness IS 
  'Returns condition details along with gift card configuration readiness status.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_conditions_missing_gift_card_config TO authenticated;
GRANT EXECUTE ON FUNCTION is_condition_ready_for_provisioning TO authenticated;
GRANT EXECUTE ON FUNCTION get_condition_with_readiness TO authenticated;
GRANT SELECT ON v_conditions_needing_gift_card_config TO authenticated;

