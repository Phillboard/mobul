-- Step 4d: Updated update_gift_card_delivery_status - works with both tables
SET search_path TO public;

CREATE OR REPLACE FUNCTION public.update_gift_card_delivery_status(
  p_recipient_id uuid,
  p_condition_id uuid,
  p_delivery_status text,
  p_delivered_at timestamptz DEFAULT NULL,
  p_delivery_method text DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_error text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated BOOLEAN;
  v_rgc RECORD;
BEGIN
  -- Get the recipient_gift_cards record
  SELECT * INTO v_rgc
  FROM recipient_gift_cards
  WHERE recipient_id = p_recipient_id
    AND condition_id = p_condition_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update recipient_gift_cards
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

  IF v_updated THEN
    -- Update inventory card status (preferred)
    IF v_rgc.inventory_card_id IS NOT NULL THEN
      UPDATE gift_card_inventory
      SET
        status = CASE
          WHEN p_delivery_status = 'delivered' THEN 'delivered'
          WHEN p_delivery_status = 'failed' THEN 'available'
          ELSE status
        END,
        delivered_at = CASE
          WHEN p_delivery_status = 'delivered' THEN COALESCE(p_delivered_at, NOW())
          ELSE delivered_at
        END
      WHERE id = v_rgc.inventory_card_id;
    END IF;

    -- Also update legacy card if it exists
    IF v_rgc.gift_card_id IS NOT NULL THEN
      UPDATE gift_cards
      SET
        status = CASE
          WHEN p_delivery_status = 'delivered' THEN 'delivered'
          WHEN p_delivery_status = 'failed' THEN 'failed'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = v_rgc.gift_card_id;
    END IF;
  END IF;

  RETURN v_updated;
END;
$$;
