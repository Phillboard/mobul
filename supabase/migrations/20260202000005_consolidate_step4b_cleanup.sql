-- Step 4b: Updated cleanup_stuck_gift_cards - now works on gift_card_inventory
SET search_path TO public;

CREATE OR REPLACE FUNCTION public.cleanup_stuck_gift_cards()
RETURNS TABLE(cleaned_count integer, card_ids uuid[])
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cleaned_count INTEGER;
  v_card_ids UUID[];
BEGIN
  -- Clean stuck cards in gift_card_inventory (primary)
  WITH stuck_inventory AS (
    SELECT gi.id
    FROM gift_card_inventory gi
    LEFT JOIN sms_delivery_log sdl
      ON gi.id::text = sdl.gift_card_id::text
      AND sdl.delivery_status IN ('sent', 'delivered')
    WHERE gi.status = 'assigned'
      AND gi.assigned_at < NOW() - INTERVAL '10 minutes'
      AND gi.delivered_at IS NULL
      AND sdl.id IS NULL
  ),
  updated_inventory AS (
    UPDATE gift_card_inventory
    SET
      status = 'available',
      assigned_at = NULL,
      assigned_to_recipient_id = NULL,
      assigned_to_campaign_id = NULL,
      assignment_condition_id = NULL,
      claimed_at = NULL,
      claimed_by_agent_id = NULL
    WHERE id IN (SELECT id FROM stuck_inventory)
    RETURNING id
  )
  SELECT ARRAY_AGG(id) INTO v_card_ids FROM updated_inventory;

  v_cleaned_count := COALESCE(array_length(v_card_ids, 1), 0);

  -- Log the cleanup
  IF v_cleaned_count > 0 THEN
    INSERT INTO error_logs (
      error_type,
      error_message,
      component_name,
      request_data
    ) VALUES (
      'gift_card_cleanup',
      v_cleaned_count || ' stuck gift cards were automatically released back to inventory',
      'cleanup_stuck_gift_cards',
      jsonb_build_object(
        'cleaned_count', v_cleaned_count,
        'card_ids', v_card_ids,
        'source', 'gift_card_inventory'
      )
    );
  END IF;

  RETURN QUERY SELECT v_cleaned_count, v_card_ids;
END;
$$;
