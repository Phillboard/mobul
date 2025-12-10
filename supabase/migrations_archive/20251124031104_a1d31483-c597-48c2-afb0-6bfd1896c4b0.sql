-- Create SMS delivery log table for tracking and retry logic
CREATE TABLE IF NOT EXISTS sms_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE,
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  twilio_message_sid TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_sms_delivery_status ON sms_delivery_log(delivery_status);
CREATE INDEX idx_sms_delivery_retry ON sms_delivery_log(retry_count, last_retry_at) WHERE delivery_status = 'failed';
CREATE INDEX idx_sms_delivery_recipient ON sms_delivery_log(recipient_id);
CREATE INDEX idx_sms_delivery_gift_card ON sms_delivery_log(gift_card_id);

-- Enable RLS
ALTER TABLE sms_delivery_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for SMS delivery log
CREATE POLICY "Users can view SMS logs for accessible campaigns"
ON sms_delivery_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = sms_delivery_log.campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  )
);

CREATE POLICY "System can insert SMS logs"
ON sms_delivery_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update SMS logs"
ON sms_delivery_log FOR UPDATE
USING (true);

-- Function to cleanup stuck gift cards
CREATE OR REPLACE FUNCTION cleanup_stuck_gift_cards()
RETURNS TABLE(
  cleaned_count INTEGER,
  card_ids UUID[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add low_stock_threshold to gift_card_pools if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gift_card_pools' 
    AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE gift_card_pools 
    ADD COLUMN low_stock_threshold INTEGER DEFAULT 20;
  END IF;
END $$;