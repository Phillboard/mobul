-- Update claim_card_atomic to support brand+denomination selection with full atomic locking
-- This is the critical function that prevents double redemptions

-- Drop old version if it exists
DROP FUNCTION IF EXISTS claim_card_atomic(UUID, UUID, UUID, UUID);

-- Create new version with brand+denomination parameters
CREATE OR REPLACE FUNCTION claim_card_atomic(
  p_brand_id UUID,
  p_card_value NUMERIC,
  p_client_id UUID,
  p_recipient_id UUID,
  p_campaign_id UUID,
  p_condition_id UUID,
  p_agent_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'call_center'
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  card_value_amount NUMERIC,
  pool_id UUID,
  pool_name TEXT,
  brand_name TEXT,
  provider TEXT,
  already_assigned BOOLEAN
) AS $$
DECLARE
  v_pool_id UUID;
  v_card_id UUID;
  v_existing_assignment RECORD;
BEGIN
  -- Check if recipient already has a card for this condition
  SELECT * INTO v_existing_assignment
  FROM recipient_gift_cards rgc
  INNER JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id;
  
  IF FOUND THEN
    -- Return existing assignment
    RETURN QUERY
    SELECT 
      gc.id AS card_id,
      gc.card_code,
      gc.card_number,
      gc.card_value AS card_value_amount,
      gc.pool_id,
      gcp.pool_name,
      gcb.brand_name,
      gcp.provider,
      TRUE AS already_assigned
    FROM gift_cards gc
    INNER JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
    INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
    WHERE gc.id = v_existing_assignment.gift_card_id;
    RETURN;
  END IF;
  
  -- Select best pool for this brand+denomination
  v_pool_id := select_best_pool_for_card(p_brand_id, p_card_value, p_client_id);
  
  IF v_pool_id IS NULL THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No available cards for brand % with value %', p_brand_id, p_card_value;
  END IF;
  
  -- Atomically claim a card from the selected pool
  -- Using FOR UPDATE SKIP LOCKED prevents race conditions
  SELECT id INTO v_card_id
  FROM gift_cards
  WHERE pool_id = v_pool_id
    AND status = 'available'
    AND assigned_to_recipient_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: Pool exhausted during claim attempt';
  END IF;
  
  -- Update the gift card with assignment information
  UPDATE gift_cards
  SET 
    status = 'claimed',
    assigned_to_recipient_id = p_recipient_id,
    assignment_locked_at = NOW(),
    assignment_source = p_source,
    assignment_campaign_id = p_campaign_id,
    assignment_condition_id = p_condition_id,
    claimed_at = NOW(),
    claimed_by_agent_id = p_agent_id,
    updated_at = NOW()
  WHERE id = v_card_id;
  
  -- Insert into recipient_gift_cards junction table
  INSERT INTO recipient_gift_cards (
    recipient_id,
    campaign_id,
    condition_id,
    gift_card_id,
    assigned_at,
    delivery_status
  ) VALUES (
    p_recipient_id,
    p_campaign_id,
    p_condition_id,
    v_card_id,
    NOW(),
    'pending'
  );
  
  -- Update pool counts
  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - 1,
    claimed_cards = claimed_cards + 1,
    updated_at = NOW()
  WHERE id = v_pool_id;
  
  -- Return the claimed card information
  RETURN QUERY
  SELECT 
    gc.id AS card_id,
    gc.card_code,
    gc.card_number,
    gc.card_value AS card_value_amount,
    gc.pool_id,
    gcp.pool_name,
    gcb.brand_name,
    gcp.provider,
    FALSE AS already_assigned
  FROM gift_cards gc
  INNER JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gc.id = v_card_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with context
    RAISE EXCEPTION 'Claim failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION claim_card_atomic IS 'Atomically claims a gift card for a recipient+condition using brand+denomination. Prevents double redemptions with assignment locking. Returns existing card if already assigned.';

GRANT EXECUTE ON FUNCTION claim_card_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION claim_card_atomic TO service_role;

-- Helper function to update delivery status
CREATE OR REPLACE FUNCTION update_gift_card_delivery_status(
  p_recipient_id UUID,
  p_condition_id UUID,
  p_delivery_status TEXT,
  p_delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_delivery_method TEXT DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE recipient_gift_cards
  SET 
    delivery_status = p_delivery_status,
    delivered_at = COALESCE(p_delivered_at, delivered_at),
    delivery_method = COALESCE(p_delivery_method, delivery_method),
    delivery_address = COALESCE(p_delivery_address, delivery_address),
    delivery_error = p_delivery_error,
    updated_at = NOW()
  WHERE recipient_id = p_recipient_id
    AND condition_id = p_condition_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Also update gift_cards table status
  IF v_updated THEN
    UPDATE gift_cards gc
    SET 
      status = CASE 
        WHEN p_delivery_status = 'delivered' THEN 'delivered'
        WHEN p_delivery_status = 'failed' THEN 'failed'
        ELSE gc.status
      END,
      updated_at = NOW()
    WHERE gc.id = (
      SELECT gift_card_id 
      FROM recipient_gift_cards 
      WHERE recipient_id = p_recipient_id 
        AND condition_id = p_condition_id
    );
  END IF;
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_gift_card_delivery_status IS 'Updates delivery status for a recipient+condition gift card assignment';

GRANT EXECUTE ON FUNCTION update_gift_card_delivery_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_gift_card_delivery_status TO service_role;

