-- Create function to get available brand-denomination combinations
-- This aggregates gift card pools by brand and card value, hiding pool complexity from clients

CREATE OR REPLACE FUNCTION get_available_brand_denominations(p_client_id UUID)
RETURNS TABLE (
  brand_id UUID,
  brand_name TEXT,
  brand_logo TEXT,
  brand_category TEXT,
  card_value NUMERIC,
  total_available INTEGER,
  pool_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcb.id AS brand_id,
    gcb.brand_name,
    gcb.logo_url AS brand_logo,
    gcb.category AS brand_category,
    gcp.card_value,
    SUM(gcp.available_cards)::INTEGER AS total_available,
    ARRAY_AGG(gcp.id) AS pool_ids
  FROM gift_card_pools gcp
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gcp.client_id = p_client_id
    AND gcp.is_active = true
    AND gcp.available_cards > 0
  GROUP BY gcb.id, gcb.brand_name, gcb.logo_url, gcb.category, gcp.card_value
  HAVING SUM(gcp.available_cards) > 0
  ORDER BY gcb.brand_name, gcp.card_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_available_brand_denominations IS 'Aggregates gift card pools by brand and denomination, hiding pool structure from clients. Returns only combinations with available cards.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_brand_denominations TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_brand_denominations TO service_role;

-- Create helper function to get brand info for a specific brand+value combination
CREATE OR REPLACE FUNCTION get_brand_denomination_info(
  p_client_id UUID,
  p_brand_id UUID,
  p_card_value NUMERIC
)
RETURNS TABLE (
  brand_name TEXT,
  brand_logo TEXT,
  total_available INTEGER,
  pool_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcb.brand_name,
    gcb.logo_url AS brand_logo,
    SUM(gcp.available_cards)::INTEGER AS total_available,
    ARRAY_AGG(gcp.id) AS pool_ids
  FROM gift_card_pools gcp
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gcp.client_id = p_client_id
    AND gcp.brand_id = p_brand_id
    AND gcp.card_value = p_card_value
    AND gcp.is_active = true
    AND gcp.available_cards > 0
  GROUP BY gcb.brand_name, gcb.logo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_brand_denomination_info IS 'Gets details for a specific brand+value combination including total availability and pool IDs';

GRANT EXECUTE ON FUNCTION get_brand_denomination_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_brand_denomination_info TO service_role;

