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
RETURNS BOOLEAN AS $update_status$
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
$update_status$ LANGUAGE plpgsql SECURITY DEFINER;

