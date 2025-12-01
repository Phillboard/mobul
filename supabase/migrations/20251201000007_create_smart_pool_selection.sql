-- Create function to intelligently select the best pool for a brand+denomination combination
-- Prioritizes pools with more available cards for better distribution

CREATE OR REPLACE FUNCTION select_best_pool_for_card(
  p_brand_id UUID,
  p_card_value NUMERIC,
  p_client_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_pool_id UUID;
BEGIN
  -- Select pool with most available cards
  -- This ensures we distribute load across pools and maximize longevity
  SELECT id INTO v_pool_id
  FROM gift_card_pools
  WHERE client_id = p_client_id
    AND brand_id = p_brand_id
    AND card_value = p_card_value
    AND is_active = true
    AND available_cards > 0
  ORDER BY available_cards DESC, created_at ASC
  LIMIT 1;
  
  RETURN v_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION select_best_pool_for_card IS 'Selects the optimal pool for a brand+denomination combination. Prioritizes pools with more inventory.';

GRANT EXECUTE ON FUNCTION select_best_pool_for_card TO authenticated;
GRANT EXECUTE ON FUNCTION select_best_pool_for_card TO service_role;

-- Function to check if brand+denomination has any available cards
CREATE OR REPLACE FUNCTION has_available_cards(
  p_brand_id UUID,
  p_card_value NUMERIC,
  p_client_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM gift_card_pools
    WHERE client_id = p_client_id
      AND brand_id = p_brand_id
      AND card_value = p_card_value
      AND is_active = true
      AND available_cards > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_available_cards IS 'Quick check if any pools have available cards for a brand+denomination combination';

GRANT EXECUTE ON FUNCTION has_available_cards TO authenticated;
GRANT EXECUTE ON FUNCTION has_available_cards TO service_role;

-- Function to get total available cards for brand+denomination
CREATE OR REPLACE FUNCTION get_total_available_cards(
  p_brand_id UUID,
  p_card_value NUMERIC,
  p_client_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(available_cards), 0)::INTEGER INTO v_total
  FROM gift_card_pools
  WHERE client_id = p_client_id
    AND brand_id = p_brand_id
    AND card_value = p_card_value
    AND is_active = true;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_total_available_cards IS 'Returns total available cards across all pools for a brand+denomination';

GRANT EXECUTE ON FUNCTION get_total_available_cards TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_available_cards TO service_role;

