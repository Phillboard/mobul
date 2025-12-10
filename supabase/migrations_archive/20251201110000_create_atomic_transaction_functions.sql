-- Create atomic transaction functions for critical multi-step operations
-- This ensures data consistency by wrapping operations in database transactions

-- Function: Transfer gift cards from admin to client atomically
CREATE OR REPLACE FUNCTION transfer_admin_cards_atomic(
  p_master_pool_id UUID,
  p_buyer_client_id UUID,
  p_quantity INTEGER,
  p_price_per_card NUMERIC,
  p_sold_by_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_master_pool RECORD;
  v_client RECORD;
  v_target_pool_id UUID;
  v_total_amount NUMERIC;
  v_card_ids UUID[];
  v_cost_per_card NUMERIC;
  v_profit NUMERIC;
  v_result JSONB;
BEGIN
  -- 1. Verify master pool has sufficient cards
  SELECT * INTO v_master_pool
  FROM gift_card_pools
  WHERE id = p_master_pool_id
    AND is_master_pool = TRUE
  FOR UPDATE; -- Lock the row

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Master pool not found';
  END IF;

  IF (v_master_pool.available_cards < p_quantity) THEN
    RAISE EXCEPTION 'Insufficient cards in master pool. Available: %, Requested: %', 
      v_master_pool.available_cards, p_quantity;
  END IF;

  -- 2. Verify client has sufficient balance
  v_total_amount := p_quantity * p_price_per_card;
  
  SELECT * INTO v_client
  FROM clients
  WHERE id = p_buyer_client_id
  FOR UPDATE; -- Lock the row

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF (COALESCE(v_client.credits, 0) < v_total_amount) THEN
    RAISE EXCEPTION 'Insufficient client balance. Available: %, Required: %', 
      v_client.credits, v_total_amount;
  END IF;

  -- 3. Find or create target client pool
  SELECT id INTO v_target_pool_id
  FROM gift_card_pools
  WHERE client_id = p_buyer_client_id
    AND brand_id = v_master_pool.brand_id
    AND card_value = v_master_pool.card_value
    AND is_master_pool = FALSE
  LIMIT 1
  FOR UPDATE; -- Lock if exists

  IF v_target_pool_id IS NULL THEN
    -- Create new pool
    INSERT INTO gift_card_pools (
      client_id, brand_id, pool_name, card_value, provider,
      is_master_pool, available_cards, total_cards
    ) VALUES (
      p_buyer_client_id, v_master_pool.brand_id,
      v_master_pool.pool_name || ' (Client)', v_master_pool.card_value,
      v_master_pool.provider, FALSE, 0, 0
    )
    RETURNING id INTO v_target_pool_id;
  END IF;

  -- 4. Get card IDs to transfer (with lock)
  SELECT ARRAY_AGG(id) INTO v_card_ids
  FROM (
    SELECT id
    FROM gift_cards
    WHERE pool_id = p_master_pool_id
      AND status = 'available'
    LIMIT p_quantity
    FOR UPDATE SKIP LOCKED
  ) cards;

  IF ARRAY_LENGTH(v_card_ids, 1) < p_quantity THEN
    RAISE EXCEPTION 'Could not lock % available cards', p_quantity;
  END IF;

  -- 5. Transfer cards
  UPDATE gift_cards
  SET pool_id = v_target_pool_id
  WHERE id = ANY(v_card_ids);

  -- 6. Update pool counts
  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - p_quantity,
    total_cards = total_cards - p_quantity
  WHERE id = p_master_pool_id;

  UPDATE gift_card_pools
  SET 
    available_cards = available_cards + p_quantity,
    total_cards = total_cards + p_quantity
  WHERE id = v_target_pool_id;

  -- 7. Deduct from client wallet
  UPDATE clients
  SET credits = credits - v_total_amount
  WHERE id = p_buyer_client_id;

  -- 8. Calculate profit
  SELECT COALESCE(cost_per_card, 0) INTO v_cost_per_card
  FROM admin_gift_card_inventory
  WHERE brand_id = v_master_pool.brand_id
  ORDER BY purchase_date DESC
  LIMIT 1;

  v_profit := (p_price_per_card - v_cost_per_card) * p_quantity;

  -- 9. Record sale transaction
  INSERT INTO admin_card_sales (
    master_pool_id, buyer_client_id, buyer_pool_id,
    quantity, price_per_card, total_amount, cost_per_card,
    profit, sold_by_user_id, notes
  ) VALUES (
    p_master_pool_id, p_buyer_client_id, v_target_pool_id,
    p_quantity, p_price_per_card, v_total_amount, v_cost_per_card,
    v_profit, p_sold_by_user_id, p_notes
  );

  -- 10. Log audit trail
  INSERT INTO gift_card_audit_log (
    pool_id, action, quantity, performed_by_user_id, notes
  ) VALUES (
    p_master_pool_id, 'transfer_to_client', p_quantity, p_sold_by_user_id,
    format('Transferred %s cards to client %s for $%s each', p_quantity, p_buyer_client_id, p_price_per_card)
  );

  -- Return result
  v_result := jsonb_build_object(
    'success', TRUE,
    'target_pool_id', v_target_pool_id,
    'cards_transferred', p_quantity,
    'total_amount', v_total_amount,
    'remaining_balance', v_client.credits - v_total_amount,
    'profit', v_profit
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Re-raise the exception to rollback transaction
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transfer_admin_cards_atomic IS 'Atomically transfer gift cards from admin pool to client with credit deduction';

GRANT EXECUTE ON FUNCTION transfer_admin_cards_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_admin_cards_atomic TO service_role;

-- Function: Atomic campaign creation with validation
CREATE OR REPLACE FUNCTION create_campaign_atomic(
  p_campaign_data JSONB,
  p_conditions JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_campaign_id UUID;
  v_client_id UUID;
  v_condition JSONB;
  v_brand_id UUID;
  v_card_value NUMERIC;
  v_available_count INTEGER;
  v_result JSONB;
BEGIN
  -- Extract client_id
  v_client_id := (p_campaign_data->>'client_id')::UUID;

  -- Insert campaign
  INSERT INTO campaigns (
    client_id, name, size, lp_mode, base_lp_url,
    utm_source, utm_medium, utm_campaign, status
  )
  SELECT 
    (p_campaign_data->>'client_id')::UUID,
    p_campaign_data->>'name',
    (p_campaign_data->>'size')::template_size,
    COALESCE((p_campaign_data->>'lp_mode')::lp_mode, 'bridge'),
    p_campaign_data->>'base_lp_url',
    COALESCE(p_campaign_data->>'utm_source', 'directmail'),
    COALESCE(p_campaign_data->>'utm_medium', 'postcard'),
    p_campaign_data->>'utm_campaign',
    'draft'::campaign_status
  RETURNING id INTO v_campaign_id;

  -- Create conditions with validation
  FOR v_condition IN SELECT * FROM jsonb_array_elements(p_conditions)
  LOOP
    v_brand_id := (v_condition->>'brand_id')::UUID;
    v_card_value := (v_condition->>'card_value')::NUMERIC;

    -- Validate inventory available
    SELECT COALESCE(SUM(available_cards), 0) INTO v_available_count
    FROM gift_card_pools
    WHERE client_id = v_client_id
      AND brand_id = v_brand_id
      AND card_value = v_card_value
      AND is_active = TRUE;

    IF v_available_count = 0 THEN
      RAISE EXCEPTION 'No gift cards available for brand % with value $%', v_brand_id, v_card_value;
    END IF;

    -- Insert condition
    INSERT INTO campaign_conditions (
      campaign_id, condition_number, condition_name,
      trigger_type, brand_id, card_value, is_active
    ) VALUES (
      v_campaign_id,
      (v_condition->>'condition_number')::INTEGER,
      v_condition->>'condition_name',
      COALESCE(v_condition->>'trigger_type', 'manual_agent'),
      v_brand_id,
      v_card_value,
      COALESCE((v_condition->>'is_active')::BOOLEAN, TRUE)
    );
  END LOOP;

  -- Return result
  v_result := jsonb_build_object(
    'success', TRUE,
    'campaign_id', v_campaign_id,
    'conditions_created', jsonb_array_length(p_conditions)
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_campaign_atomic IS 'Atomically create campaign with conditions and inventory validation';

GRANT EXECUTE ON FUNCTION create_campaign_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION create_campaign_atomic TO service_role;

