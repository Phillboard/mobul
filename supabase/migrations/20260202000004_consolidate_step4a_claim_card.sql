-- Step 4a: Updated claim_card_atomic - now claims from gift_card_inventory
SET search_path TO public;

CREATE OR REPLACE FUNCTION public.claim_card_atomic(
  p_brand_id uuid,
  p_card_value numeric,
  p_client_id uuid,
  p_recipient_id uuid,
  p_campaign_id uuid,
  p_condition_id uuid,
  p_agent_id uuid DEFAULT NULL,
  p_source text DEFAULT 'call_center'
) RETURNS TABLE(
  card_id uuid,
  card_code text,
  card_number text,
  card_value_amount numeric,
  pool_id uuid,
  pool_name text,
  brand_name text,
  provider text,
  already_assigned boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_card_id UUID;
  v_existing_assignment RECORD;
BEGIN
  -- Check if card already assigned for this recipient+condition
  SELECT rgc.*, gi.id as inv_id, gi.card_code as inv_card_code
  INTO v_existing_assignment
  FROM recipient_gift_cards rgc
  LEFT JOIN gift_card_inventory gi ON gi.id = rgc.inventory_card_id
  LEFT JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id
  LIMIT 1;

  IF FOUND THEN
    -- Already assigned - return existing card
    IF v_existing_assignment.inventory_card_id IS NOT NULL THEN
      -- Return from inventory table
      RETURN QUERY
      SELECT
        gi.id AS card_id,
        gi.card_code,
        gi.card_number,
        gi.denomination AS card_value_amount,
        gi.legacy_pool_id AS pool_id,
        COALESCE(gcp.pool_name, gcb.brand_name || ' Pool') AS pool_name,
        gcb.brand_name,
        COALESCE(gi.provider, gcp.provider, 'unknown') AS provider,
        TRUE AS already_assigned
      FROM gift_card_inventory gi
      JOIN gift_card_brands gcb ON gcb.id = gi.brand_id
      LEFT JOIN gift_card_pools gcp ON gcp.id = gi.legacy_pool_id
      WHERE gi.id = v_existing_assignment.inventory_card_id;
    ELSE
      -- Fallback: return from legacy gift_cards table
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
    END IF;
    RETURN;
  END IF;

  -- Try to claim from gift_card_inventory first (preferred)
  UPDATE gift_card_inventory
  SET
    status = 'assigned',
    assigned_to_recipient_id = p_recipient_id,
    assigned_to_campaign_id = p_campaign_id,
    assignment_condition_id = p_condition_id,
    assignment_source = p_source,
    assigned_at = NOW(),
    claimed_at = NOW(),
    claimed_by_agent_id = p_agent_id
  WHERE id = (
    SELECT gi.id
    FROM gift_card_inventory gi
    WHERE gi.brand_id = p_brand_id
      AND gi.denomination = p_card_value
      AND gi.status = 'available'
      AND gi.assigned_to_recipient_id IS NULL
      AND (gi.expiration_date IS NULL OR gi.expiration_date > CURRENT_DATE)
    ORDER BY gi.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_card_id;

  IF v_card_id IS NOT NULL THEN
    -- Create recipient_gift_cards entry
    INSERT INTO recipient_gift_cards (
      recipient_id,
      campaign_id,
      condition_id,
      inventory_card_id,
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

    -- Charge client credits
    UPDATE clients
    SET credits = credits - p_card_value
    WHERE id = p_client_id;

    -- Update pool stats if card has a legacy pool
    UPDATE gift_card_pools gcp
    SET
      available_cards = available_cards - 1,
      claimed_cards = claimed_cards + 1,
      updated_at = NOW()
    FROM gift_card_inventory gi
    WHERE gi.id = v_card_id
      AND gi.legacy_pool_id = gcp.id;

    -- Return the claimed card details
    RETURN QUERY
    SELECT
      gi.id AS card_id,
      gi.card_code,
      gi.card_number,
      gi.denomination AS card_value_amount,
      gi.legacy_pool_id AS pool_id,
      COALESCE(gcp.pool_name, gcb.brand_name || ' Pool') AS pool_name,
      gcb.brand_name,
      COALESCE(gi.provider, gcp.provider, 'unknown') AS provider,
      FALSE AS already_assigned
    FROM gift_card_inventory gi
    JOIN gift_card_brands gcb ON gcb.id = gi.brand_id
    LEFT JOIN gift_card_pools gcp ON gcp.id = gi.legacy_pool_id
    WHERE gi.id = v_card_id;
    RETURN;
  END IF;

  -- No cards available
  RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No available cards for brand % with value %', p_brand_id, p_card_value;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Claim failed: %', SQLERRM;
END;
$$;
