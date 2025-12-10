-- Create new version of claim_card_atomic with brand+denomination parameters
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
) AS $claim_atomic$
DECLARE
  v_pool_id UUID;
  v_card_id UUID;
  v_existing_assignment RECORD;
BEGIN
  SELECT * INTO v_existing_assignment
  FROM recipient_gift_cards rgc
  INNER JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id;
  
  IF FOUND THEN
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
  
  v_pool_id := select_best_pool_for_card(p_brand_id, p_card_value, p_client_id);
  
  IF v_pool_id IS NULL THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No available cards for brand % with value %', p_brand_id, p_card_value;
  END IF;
  
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
  
  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - 1,
    claimed_cards = claimed_cards + 1,
    updated_at = NOW()
  WHERE id = v_pool_id;
  
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
    RAISE EXCEPTION 'Claim failed: %', SQLERRM;
END;
$claim_atomic$ LANGUAGE plpgsql SECURITY DEFINER;

