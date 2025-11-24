-- Fix search_path for cleanup_stuck_gift_cards function
CREATE OR REPLACE FUNCTION cleanup_stuck_gift_cards()
RETURNS TABLE(
  cleaned_count INTEGER,
  card_ids UUID[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned_count INTEGER;
  v_card_ids UUID[];
BEGIN
  -- Find cards stuck in 'claimed' for >10 minutes without successful delivery
  WITH stuck_cards AS (
    SELECT gc.id
    FROM gift_cards gc
    LEFT JOIN sms_delivery_log sdl 
      ON gc.id = sdl.gift_card_id 
      AND sdl.delivery_status IN ('sent', 'delivered')
    WHERE gc.status = 'claimed'
      AND gc.claimed_at < NOW() - INTERVAL '10 minutes'
      AND sdl.id IS NULL
  ),
  updated AS (
    UPDATE gift_cards
    SET 
      status = 'available',
      claimed_at = NULL,
      claimed_by_recipient_id = NULL
    WHERE id IN (SELECT id FROM stuck_cards)
    RETURNING id
  )
  SELECT ARRAY_AGG(id) INTO v_card_ids FROM updated;
  
  v_cleaned_count := COALESCE(array_length(v_card_ids, 1), 0);
  
  -- Log the cleanup if any cards were cleaned
  IF v_cleaned_count > 0 THEN
    INSERT INTO error_logs (
      error_type,
      error_message,
      component_name,
      request_data
    ) VALUES (
      'gift_card_cleanup',
      v_cleaned_count || ' stuck gift cards were automatically released back to pool',
      'cleanup_stuck_gift_cards',
      jsonb_build_object(
        'cleaned_count', v_cleaned_count,
        'card_ids', v_card_ids
      )
    );
  END IF;
  
  RETURN QUERY SELECT v_cleaned_count, v_card_ids;
END;
$$;