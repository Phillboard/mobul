-- ============================================================
-- ADD MISSING RPC FUNCTIONS FOR GIFT CARD SYSTEM
-- ============================================================
-- These functions are called by the frontend but were never created
-- ============================================================

-- Drop existing functions if they exist (for idempotency)
DROP FUNCTION IF EXISTS get_client_gift_cards_with_details(UUID);
DROP FUNCTION IF EXISTS get_inventory_count(UUID, NUMERIC);
-- This one may have different signature, so drop it with CASCADE
DROP FUNCTION IF EXISTS get_condition_gift_card_config(UUID) CASCADE;

-- ============================================================
-- 1. get_client_gift_cards_with_details
-- Returns available gift cards for a client with brand details
-- Used by SimpleBrandDenominationSelector and ConditionsStep
-- ============================================================
CREATE OR REPLACE FUNCTION get_client_gift_cards_with_details(p_client_id UUID)
RETURNS TABLE (
  client_gift_card_id UUID,
  brand_id UUID,
  denomination NUMERIC,
  is_enabled BOOLEAN,
  brand_name TEXT,
  brand_code TEXT,
  brand_logo_url TEXT,
  brand_category TEXT,
  inventory_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cagc.id as client_gift_card_id,
    cagc.brand_id,
    cagc.denomination,
    cagc.is_enabled,
    gcb.brand_name,
    gcb.brand_code,
    gcb.logo_url as brand_logo_url,
    gcb.category as brand_category,
    COALESCE(
      (SELECT COUNT(*) 
       FROM gift_card_inventory gci 
       WHERE gci.brand_id = cagc.brand_id 
         AND gci.denomination = cagc.denomination 
         AND gci.status = 'available'),
      0
    ) as inventory_count
  FROM client_available_gift_cards cagc
  JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
  WHERE cagc.client_id = p_client_id
    AND cagc.is_enabled = true
    AND gcb.is_enabled_by_admin = true
  ORDER BY gcb.brand_name, cagc.denomination;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. get_inventory_count
-- Returns the count of available gift cards for a brand/denomination
-- Used by useInventoryCount hook
-- ============================================================
CREATE OR REPLACE FUNCTION get_inventory_count(p_brand_id UUID, p_denomination NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM gift_card_inventory 
    WHERE brand_id = p_brand_id 
      AND denomination = p_denomination 
      AND status = 'available'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. get_condition_gift_card_config (enhanced version)
-- Returns gift card configuration for a specific condition
-- Used by provisioning edge functions
-- ============================================================
CREATE OR REPLACE FUNCTION get_condition_gift_card_config(p_condition_id UUID)
RETURNS TABLE (
  condition_id UUID,
  condition_number INTEGER,
  condition_name TEXT,
  brand_id UUID,
  card_value NUMERIC,
  sms_template TEXT,
  brand_name TEXT,
  brand_code TEXT,
  tillo_brand_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id as condition_id,
    cc.condition_number,
    cc.condition_name,
    cc.brand_id,
    cc.card_value,
    cc.sms_template,
    gcb.brand_name,
    gcb.brand_code,
    gcb.tillo_brand_code
  FROM campaign_conditions cc
  LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
  WHERE cc.id = p_condition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GRANTS: Allow authenticated users and service_role to execute
-- ============================================================
GRANT EXECUTE ON FUNCTION get_client_gift_cards_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_gift_cards_with_details(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION get_inventory_count(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_count(UUID, NUMERIC) TO service_role;

GRANT EXECUTE ON FUNCTION get_condition_gift_card_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_condition_gift_card_config(UUID) TO service_role;

-- ============================================================
-- COMMENTS for documentation
-- ============================================================
COMMENT ON FUNCTION get_client_gift_cards_with_details(UUID) IS 
  'Returns gift cards available to a client with brand details and inventory counts';

COMMENT ON FUNCTION get_inventory_count(UUID, NUMERIC) IS 
  'Returns count of available gift cards for a specific brand and denomination';

COMMENT ON FUNCTION get_condition_gift_card_config(UUID) IS 
  'Returns gift card configuration for a campaign condition by ID';

