-- =====================================================
-- DATABASE FUNCTIONS FOR GIFT CARD PROVISIONING
-- =====================================================
-- Migration: Helper functions for atomic operations
-- =====================================================

-- =====================================================
-- 1. CLAIM GIFT CARD FROM INVENTORY
-- =====================================================
-- Atomically claims an available gift card from inventory

CREATE OR REPLACE FUNCTION claim_gift_card_from_inventory(
  p_brand_id UUID,
  p_denomination NUMERIC,
  p_recipient_id UUID,
  p_campaign_id UUID
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  expiration_date DATE,
  brand_name TEXT,
  brand_logo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Atomically claim the first available card
  UPDATE gift_card_inventory
  SET 
    status = 'assigned',
    assigned_to_recipient_id = p_recipient_id,
    assigned_to_campaign_id = p_campaign_id,
    assigned_at = NOW()
  WHERE id = (
    SELECT id FROM gift_card_inventory
    WHERE brand_id = p_brand_id
      AND denomination = p_denomination
      AND status = 'available'
      AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
    ORDER BY uploaded_at ASC -- FIFO: First In, First Out
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_card_id;
  
  -- If no card was claimed, return empty
  IF v_card_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the claimed card details with brand info
  RETURN QUERY
  SELECT 
    gci.id,
    gci.card_code,
    gci.card_number,
    gci.expiration_date,
    gcb.brand_name,
    gcb.logo_url
  FROM gift_card_inventory gci
  JOIN gift_card_brands gcb ON gcb.id = gci.brand_id
  WHERE gci.id = v_card_id;
END;
$$;

COMMENT ON FUNCTION claim_gift_card_from_inventory IS 'Atomically claims an available card from inventory. Returns empty if no cards available.';

-- =====================================================
-- 2. RECORD BILLING TRANSACTION
-- =====================================================
-- Creates an immutable billing ledger entry

CREATE OR REPLACE FUNCTION record_billing_transaction(
  p_transaction_type TEXT,
  p_billed_entity_type TEXT,
  p_billed_entity_id UUID,
  p_campaign_id UUID,
  p_recipient_id UUID,
  p_brand_id UUID,
  p_denomination NUMERIC,
  p_amount_billed NUMERIC,
  p_cost_basis NUMERIC DEFAULT NULL,
  p_inventory_card_id UUID DEFAULT NULL,
  p_tillo_transaction_id TEXT DEFAULT NULL,
  p_tillo_order_reference TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Validate inputs
  IF p_amount_billed < 0 THEN
    RAISE EXCEPTION 'Amount billed cannot be negative';
  END IF;
  
  IF p_cost_basis IS NOT NULL AND p_cost_basis < 0 THEN
    RAISE EXCEPTION 'Cost basis cannot be negative';
  END IF;
  
  -- Insert billing record
  INSERT INTO gift_card_billing_ledger (
    transaction_type,
    billed_entity_type,
    billed_entity_id,
    campaign_id,
    recipient_id,
    brand_id,
    denomination,
    amount_billed,
    cost_basis,
    inventory_card_id,
    tillo_transaction_id,
    tillo_order_reference,
    metadata
  ) VALUES (
    p_transaction_type,
    p_billed_entity_type,
    p_billed_entity_id,
    p_campaign_id,
    p_recipient_id,
    p_brand_id,
    p_denomination,
    p_amount_billed,
    p_cost_basis,
    p_inventory_card_id,
    p_tillo_transaction_id,
    p_tillo_order_reference,
    p_metadata
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;

COMMENT ON FUNCTION record_billing_transaction IS 'Creates immutable billing ledger entry for gift card transactions.';

-- =====================================================
-- 3. GET BILLING ENTITY FOR CAMPAIGN
-- =====================================================
-- Determines who should be billed: client or agency

CREATE OR REPLACE FUNCTION get_billing_entity_for_campaign(
  p_campaign_id UUID
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_agency_id UUID;
  v_agency_billing_enabled BOOLEAN;
  v_client_name TEXT;
  v_agency_name TEXT;
BEGIN
  -- Get campaign's client and check agency billing setting
  SELECT 
    c.client_id,
    cl.agency_id,
    cl.agency_billing_enabled,
    cl.name,
    a.name
  INTO 
    v_client_id,
    v_agency_id,
    v_agency_billing_enabled,
    v_client_name,
    v_agency_name
  FROM campaigns c
  JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN agencies a ON a.id = cl.agency_id
  WHERE c.id = p_campaign_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found: %', p_campaign_id;
  END IF;
  
  -- Return agency if billing is enabled and agency exists
  IF v_agency_billing_enabled AND v_agency_id IS NOT NULL THEN
    RETURN QUERY SELECT 'agency'::TEXT, v_agency_id, v_agency_name;
  ELSE
    -- Default to client billing
    RETURN QUERY SELECT 'client'::TEXT, v_client_id, v_client_name;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_billing_entity_for_campaign IS 'Returns who should be billed for campaign gift cards: agency or client.';

-- =====================================================
-- 4. GET AVAILABLE INVENTORY COUNT
-- =====================================================
-- Quick count of available cards for a brand-denomination

CREATE OR REPLACE FUNCTION get_inventory_count(
  p_brand_id UUID,
  p_denomination NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM gift_card_inventory
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination
    AND status = 'available'
    AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE);
  
  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION get_inventory_count IS 'Returns count of available cards for a specific brand and denomination.';

-- =====================================================
-- 5. CHECK IF CLIENT CAN USE GIFT CARD
-- =====================================================
-- Validates if client has access to a brand-denomination

CREATE OR REPLACE FUNCTION client_can_use_gift_card(
  p_client_id UUID,
  p_brand_id UUID,
  p_denomination NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- Check if client has this gift card enabled
  SELECT is_enabled
  INTO v_enabled
  FROM client_available_gift_cards
  WHERE client_id = p_client_id
    AND brand_id = p_brand_id
    AND denomination = p_denomination;
  
  RETURN COALESCE(v_enabled, false);
END;
$$;

COMMENT ON FUNCTION client_can_use_gift_card IS 'Checks if client has enabled a specific brand-denomination combination.';

-- =====================================================
-- 6. MARK CARD AS DELIVERED
-- =====================================================
-- Updates inventory card status to delivered

CREATE OR REPLACE FUNCTION mark_card_delivered(
  p_card_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE gift_card_inventory
  SET 
    status = 'delivered',
    delivered_at = NOW()
  WHERE id = p_card_id
    AND status = 'assigned';
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION mark_card_delivered IS 'Marks an assigned card as delivered.';

-- =====================================================
-- 7. GET CLIENT SPENDING SUMMARY
-- =====================================================
-- Aggregates billing data for a client

CREATE OR REPLACE FUNCTION get_client_spending_summary(
  p_client_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_spent NUMERIC,
  total_cards INTEGER,
  total_profit NUMERIC,
  by_brand JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH spending AS (
    SELECT 
      SUM(amount_billed) as spent,
      COUNT(*) as cards,
      SUM(profit) as profit_sum,
      jsonb_object_agg(
        brand_name,
        jsonb_build_object(
          'count', brand_count,
          'total', brand_total
        )
      ) as brands
    FROM (
      SELECT 
        gcb.brand_name,
        COUNT(*) as brand_count,
        SUM(gbl.amount_billed) as brand_total
      FROM gift_card_billing_ledger gbl
      JOIN gift_card_brands gcb ON gcb.id = gbl.brand_id
      WHERE gbl.billed_entity_type = 'client'
        AND gbl.billed_entity_id = p_client_id
        AND (p_start_date IS NULL OR gbl.billed_at >= p_start_date)
        AND (p_end_date IS NULL OR gbl.billed_at <= p_end_date)
      GROUP BY gcb.brand_name
    ) brand_summary
  )
  SELECT 
    COALESCE(spent, 0),
    COALESCE(cards::INTEGER, 0),
    COALESCE(profit_sum, 0),
    COALESCE(brands, '{}'::jsonb)
  FROM spending;
END;
$$;

COMMENT ON FUNCTION get_client_spending_summary IS 'Returns spending summary for a client with breakdown by brand.';

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION claim_gift_card_from_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION record_billing_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_billing_entity_for_campaign TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_count TO authenticated;
GRANT EXECUTE ON FUNCTION client_can_use_gift_card TO authenticated;
GRANT EXECUTE ON FUNCTION mark_card_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_spending_summary TO authenticated;

