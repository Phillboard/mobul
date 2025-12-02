-- =====================================================
-- GIFT CARD SYSTEM - DATABASE FUNCTIONS
-- =====================================================
-- Migration: Create all required RPC functions for gift card system
-- These functions are called by hooks and edge functions
-- =====================================================

-- =====================================================
-- 1. CLAIM GIFT CARD FROM INVENTORY
-- =====================================================
-- Atomically claims an available gift card from CSV inventory

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
  -- Lock and claim the first available card atomically
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
    ORDER BY created_at ASC
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
    gc.id as card_id,
    gc.card_code,
    gc.card_number,
    gc.expiration_date,
    gcb.brand_name,
    gcb.logo_url as brand_logo_url
  FROM gift_card_inventory gc
  JOIN gift_card_brands gcb ON gcb.id = gc.brand_id
  WHERE gc.id = v_card_id;
END;
$$;

COMMENT ON FUNCTION claim_gift_card_from_inventory IS 'Atomically claims an available gift card from inventory and assigns it to a recipient';

-- =====================================================
-- 2. GET INVENTORY COUNT
-- =====================================================
-- Returns the count of available cards for a brand-denomination

CREATE OR REPLACE FUNCTION get_inventory_count(
  p_brand_id UUID,
  p_denomination NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM gift_card_inventory
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination
    AND status = 'available'
    AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE);
  
  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION get_inventory_count IS 'Returns count of available gift cards for a specific brand and denomination';

-- =====================================================
-- 3. GET BILLING ENTITY FOR CAMPAIGN
-- =====================================================
-- Determines whether the client or agency should be billed

CREATE OR REPLACE FUNCTION get_billing_entity_for_campaign(
  p_campaign_id UUID
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_agency_id UUID;
  v_agency_name TEXT;
  v_agency_billing_enabled BOOLEAN;
BEGIN
  -- Get campaign's client and check agency billing settings
  SELECT 
    c.client_id,
    cl.name,
    cl.agency_id,
    cl.agency_billing_enabled
  INTO 
    v_client_id,
    v_client_name,
    v_agency_id,
    v_agency_billing_enabled
  FROM campaigns c
  JOIN clients cl ON cl.id = c.client_id
  WHERE c.id = p_campaign_id;
  
  -- If campaign not found, raise error
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found: %', p_campaign_id;
  END IF;
  
  -- If agency billing is enabled and agency exists, bill the agency
  IF v_agency_billing_enabled AND v_agency_id IS NOT NULL THEN
    SELECT name INTO v_agency_name
    FROM agencies
    WHERE id = v_agency_id;
    
    RETURN QUERY
    SELECT 
      'agency'::TEXT as entity_type,
      v_agency_id as entity_id,
      v_agency_name as entity_name;
  ELSE
    -- Otherwise, bill the client
    RETURN QUERY
    SELECT 
      'client'::TEXT as entity_type,
      v_client_id as entity_id,
      v_client_name as entity_name;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_billing_entity_for_campaign IS 'Determines which entity (client or agency) should be billed for a campaign';

-- =====================================================
-- 4. RECORD BILLING TRANSACTION
-- =====================================================
-- Creates an entry in the gift card billing ledger

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
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Insert billing transaction
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
    metadata,
    notes,
    billed_at
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
    p_metadata,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;

COMMENT ON FUNCTION record_billing_transaction IS 'Records a gift card transaction in the billing ledger';

-- =====================================================
-- 5. GET BRAND DENOMINATIONS WITH INVENTORY
-- =====================================================
-- Returns all denominations for a brand with inventory counts

CREATE OR REPLACE FUNCTION get_brand_denominations_with_inventory(
  p_brand_id UUID
)
RETURNS TABLE (
  denomination_id UUID,
  denomination NUMERIC,
  is_enabled_by_admin BOOLEAN,
  use_custom_pricing BOOLEAN,
  client_price NUMERIC,
  agency_price NUMERIC,
  cost_basis NUMERIC,
  inventory_available INTEGER,
  inventory_assigned INTEGER,
  inventory_delivered INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcd.id as denomination_id,
    gcd.denomination,
    gcd.is_enabled_by_admin,
    gcd.use_custom_pricing,
    gcd.client_price,
    gcd.agency_price,
    gcd.cost_basis,
    COUNT(gci.id) FILTER (WHERE gci.status = 'available') as inventory_available,
    COUNT(gci.id) FILTER (WHERE gci.status = 'assigned') as inventory_assigned,
    COUNT(gci.id) FILTER (WHERE gci.status = 'delivered') as inventory_delivered
  FROM gift_card_denominations gcd
  LEFT JOIN gift_card_inventory gci ON gci.brand_id = gcd.brand_id AND gci.denomination = gcd.denomination
  WHERE gcd.brand_id = p_brand_id
  GROUP BY gcd.id, gcd.denomination, gcd.is_enabled_by_admin, gcd.use_custom_pricing, gcd.client_price, gcd.agency_price, gcd.cost_basis
  ORDER BY gcd.denomination;
END;
$$;

COMMENT ON FUNCTION get_brand_denominations_with_inventory IS 'Returns denominations with inventory counts for a brand';

-- =====================================================
-- 6. GET CLIENT AVAILABLE GIFT CARDS WITH DETAILS
-- =====================================================
-- Returns all gift cards available to a client with full details

CREATE OR REPLACE FUNCTION get_client_gift_cards_with_details(
  p_client_id UUID
)
RETURNS TABLE (
  client_gift_card_id UUID,
  brand_id UUID,
  brand_name TEXT,
  brand_code TEXT,
  brand_logo_url TEXT,
  brand_category TEXT,
  denomination NUMERIC,
  is_enabled BOOLEAN,
  use_custom_pricing BOOLEAN,
  client_price NUMERIC,
  inventory_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cagc.id as client_gift_card_id,
    gcb.id as brand_id,
    gcb.brand_name,
    gcb.brand_code,
    gcb.logo_url as brand_logo_url,
    gcb.category as brand_category,
    cagc.denomination,
    cagc.is_enabled,
    COALESCE(gcd.use_custom_pricing, false) as use_custom_pricing,
    gcd.client_price,
    COUNT(gci.id) FILTER (WHERE gci.status = 'available') as inventory_count
  FROM client_available_gift_cards cagc
  JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
  LEFT JOIN gift_card_denominations gcd ON gcd.brand_id = cagc.brand_id AND gcd.denomination = cagc.denomination
  LEFT JOIN gift_card_inventory gci ON gci.brand_id = cagc.brand_id AND gci.denomination = cagc.denomination
  WHERE cagc.client_id = p_client_id
    AND cagc.is_enabled = true
    AND gcb.is_enabled_by_admin = true
  GROUP BY cagc.id, gcb.id, gcb.brand_name, gcb.brand_code, gcb.logo_url, gcb.category, cagc.denomination, cagc.is_enabled, gcd.use_custom_pricing, gcd.client_price
  ORDER BY gcb.brand_name, cagc.denomination;
END;
$$;

COMMENT ON FUNCTION get_client_gift_cards_with_details IS 'Returns all available gift cards for a client with inventory and pricing details';

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

-- Grant execute to authenticated users for client-facing functions
GRANT EXECUTE ON FUNCTION get_inventory_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_brand_denominations_with_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_gift_cards_with_details TO authenticated;

-- Grant execute to service role for provisioning functions
GRANT EXECUTE ON FUNCTION claim_gift_card_from_inventory TO service_role;
GRANT EXECUTE ON FUNCTION get_billing_entity_for_campaign TO service_role;
GRANT EXECUTE ON FUNCTION record_billing_transaction TO service_role;

-- Also allow authenticated for billing entity (used in edge functions)
GRANT EXECUTE ON FUNCTION get_billing_entity_for_campaign TO authenticated;

