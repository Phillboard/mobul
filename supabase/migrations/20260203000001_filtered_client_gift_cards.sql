-- Migration: Add function to get client gift cards filtered by agency access
-- This ensures hierarchical access control: Platform -> Agency -> Client

-- Function to get available gift cards for a client, filtered by agency access
CREATE OR REPLACE FUNCTION get_client_available_gift_cards_filtered(p_client_id uuid)
RETURNS TABLE(
  id uuid,
  client_id uuid,
  brand_id uuid,
  denomination numeric,
  is_enabled boolean,
  brand_name text,
  brand_code text,
  logo_url text,
  is_enabled_by_admin boolean
) AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  -- Get the client's agency_id
  SELECT c.agency_id INTO v_agency_id
  FROM clients c
  WHERE c.id = p_client_id;
  
  -- If client has no agency, return all enabled client cards (direct admin clients)
  IF v_agency_id IS NULL THEN
    RETURN QUERY
    SELECT 
      cagc.id,
      cagc.client_id,
      cagc.brand_id,
      cagc.denomination,
      cagc.is_enabled,
      gcb.brand_name,
      gcb.brand_code,
      gcb.logo_url,
      gcb.is_enabled_by_admin
    FROM client_available_gift_cards cagc
    JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
    WHERE cagc.client_id = p_client_id
      AND cagc.is_enabled = true
      AND gcb.is_enabled_by_admin = true;
    RETURN;
  END IF;
  
  -- Client has agency - filter by agency access as well
  RETURN QUERY
  SELECT 
    cagc.id,
    cagc.client_id,
    cagc.brand_id,
    cagc.denomination,
    cagc.is_enabled,
    gcb.brand_name,
    gcb.brand_code,
    gcb.logo_url,
    gcb.is_enabled_by_admin
  FROM client_available_gift_cards cagc
  JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
  JOIN agency_available_gift_cards aagc ON 
    aagc.agency_id = v_agency_id AND
    aagc.brand_id = cagc.brand_id AND
    aagc.denomination = cagc.denomination AND
    aagc.is_enabled = true
  WHERE cagc.client_id = p_client_id
    AND cagc.is_enabled = true
    AND gcb.is_enabled_by_admin = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_client_available_gift_cards_filtered(uuid) TO authenticated;

-- Comment
COMMENT ON FUNCTION get_client_available_gift_cards_filtered(uuid) IS 
'Returns gift card brands/denominations available to a client, filtered by:
1. Platform admin enablement (gift_card_brands.is_enabled_by_admin)
2. Agency enablement (agency_available_gift_cards.is_enabled) - if client belongs to agency
3. Client enablement (client_available_gift_cards.is_enabled)';


-- Also create a function to check if a specific brand/denom is available for a client
CREATE OR REPLACE FUNCTION client_can_use_gift_card_filtered(
  p_client_id uuid,
  p_brand_id uuid,
  p_denomination numeric
) RETURNS boolean AS $$
DECLARE
  v_agency_id uuid;
  v_result boolean;
BEGIN
  -- Get the client's agency_id
  SELECT c.agency_id INTO v_agency_id
  FROM clients c
  WHERE c.id = p_client_id;
  
  -- If no agency, just check client and admin access
  IF v_agency_id IS NULL THEN
    SELECT EXISTS(
      SELECT 1
      FROM client_available_gift_cards cagc
      JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
      WHERE cagc.client_id = p_client_id
        AND cagc.brand_id = p_brand_id
        AND cagc.denomination = p_denomination
        AND cagc.is_enabled = true
        AND gcb.is_enabled_by_admin = true
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  -- Check all three levels: admin, agency, client
  SELECT EXISTS(
    SELECT 1
    FROM client_available_gift_cards cagc
    JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
    JOIN agency_available_gift_cards aagc ON 
      aagc.agency_id = v_agency_id AND
      aagc.brand_id = cagc.brand_id AND
      aagc.denomination = cagc.denomination AND
      aagc.is_enabled = true
    WHERE cagc.client_id = p_client_id
      AND cagc.brand_id = p_brand_id
      AND cagc.denomination = p_denomination
      AND cagc.is_enabled = true
      AND gcb.is_enabled_by_admin = true
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION client_can_use_gift_card_filtered(uuid, uuid, numeric) TO authenticated;

-- Comment
COMMENT ON FUNCTION client_can_use_gift_card_filtered(uuid, uuid, numeric) IS 
'Checks if a specific brand/denomination is available for a client, respecting hierarchical access control';
