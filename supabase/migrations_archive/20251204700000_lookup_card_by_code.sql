-- Create a SECURITY DEFINER function to lookup gift cards by redemption code
-- This bypasses RLS and directly joins recipients -> gift_card_inventory -> gift_card_brands
-- Solves the ID mismatch issue between edge function and call center contexts

CREATE OR REPLACE FUNCTION lookup_gift_card_by_redemption_code(p_code TEXT)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  denomination NUMERIC,
  expiration_date DATE,
  recipient_first_name TEXT,
  recipient_last_name TEXT,
  brand_name TEXT,
  brand_logo_url TEXT,
  brand_color TEXT,
  balance_check_url TEXT,
  redemption_instructions TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gci.id AS card_id,
    gci.card_code,
    gci.card_number,
    gci.denomination,
    gci.expiration_date,
    r.first_name AS recipient_first_name,
    r.last_name AS recipient_last_name,
    gcb.brand_name,
    gcb.logo_url AS brand_logo_url,
    gcb.brand_color,
    gcb.balance_check_url,
    gcb.redemption_instructions
  FROM gift_card_inventory gci
  JOIN recipients r ON gci.assigned_to_recipient_id = r.id
  LEFT JOIN gift_card_brands gcb ON gci.brand_id = gcb.id
  WHERE UPPER(r.redemption_code) = UPPER(p_code)
    AND gci.status = 'assigned'
  ORDER BY gci.assigned_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION lookup_gift_card_by_redemption_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION lookup_gift_card_by_redemption_code(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION lookup_gift_card_by_redemption_code(TEXT) TO anon;

COMMENT ON FUNCTION lookup_gift_card_by_redemption_code IS 
'Looks up an assigned gift card by recipient redemption code. 
Uses SECURITY DEFINER to bypass RLS and ensure consistent results 
regardless of the calling context (frontend vs edge function).';

