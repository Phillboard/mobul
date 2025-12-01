-- Add brand_id and card_value columns to campaign_conditions
-- This enables simplified gift card selection while maintaining backward compatibility

ALTER TABLE campaign_conditions
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES gift_card_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_value NUMERIC(10,2);

-- Add comment
COMMENT ON COLUMN campaign_conditions.brand_id IS 'Gift card brand for this condition reward - used with card_value for simplified selection';
COMMENT ON COLUMN campaign_conditions.card_value IS 'Gift card denomination for this condition reward - used with brand_id';
COMMENT ON COLUMN campaign_conditions.gift_card_pool_id IS 'Legacy field - use brand_id+card_value for new campaigns. Kept for backward compatibility';

-- Create index for brand+value lookups
CREATE INDEX IF NOT EXISTS idx_campaign_conditions_brand_value 
  ON campaign_conditions(brand_id, card_value)
  WHERE brand_id IS NOT NULL;

-- Helper function to get brand+value from condition
CREATE OR REPLACE FUNCTION get_condition_gift_card_config(p_condition_id UUID)
RETURNS TABLE (
  brand_id UUID,
  brand_name TEXT,
  card_value NUMERIC,
  pool_id UUID,
  uses_new_format BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.brand_id,
    gcb.brand_name,
    cc.card_value,
    cc.gift_card_pool_id AS pool_id,
    (cc.brand_id IS NOT NULL) AS uses_new_format
  FROM campaign_conditions cc
  LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
  WHERE cc.id = p_condition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_condition_gift_card_config IS 'Returns gift card configuration for a condition, supporting both new (brand+value) and legacy (pool_id) formats';

GRANT EXECUTE ON FUNCTION get_condition_gift_card_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_condition_gift_card_config TO service_role;

-- Function to migrate legacy pool_id to brand_id+card_value
CREATE OR REPLACE FUNCTION migrate_condition_to_brand_value(p_condition_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pool_id UUID;
  v_brand_id UUID;
  v_card_value NUMERIC;
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Get pool_id from condition
  SELECT gift_card_pool_id INTO v_pool_id
  FROM campaign_conditions
  WHERE id = p_condition_id
    AND brand_id IS NULL  -- Only migrate if not already done
    AND gift_card_pool_id IS NOT NULL;
  
  IF v_pool_id IS NOT NULL THEN
    -- Get brand_id and card_value from pool
    SELECT brand_id, card_value INTO v_brand_id, v_card_value
    FROM gift_card_pools
    WHERE id = v_pool_id;
    
    IF v_brand_id IS NOT NULL THEN
      -- Update condition with brand+value
      UPDATE campaign_conditions
      SET 
        brand_id = v_brand_id,
        card_value = v_card_value,
        updated_at = NOW()
      WHERE id = p_condition_id;
      
      v_updated := TRUE;
    END IF;
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_condition_to_brand_value IS 'Migrates a legacy condition from pool_id format to brand_id+card_value format';

GRANT EXECUTE ON FUNCTION migrate_condition_to_brand_value TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_condition_to_brand_value TO service_role;

