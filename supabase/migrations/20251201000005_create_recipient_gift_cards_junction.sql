-- Create junction table for tracking multiple gift card assignments per recipient
-- Allows same recipient to receive different gift cards for different conditions

CREATE TABLE IF NOT EXISTS recipient_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES campaign_conditions(id) ON DELETE CASCADE,
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'email', 'call_center', 'api')),
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  delivery_address TEXT,
  delivery_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one gift card per recipient per condition
  UNIQUE(recipient_id, condition_id)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_recipient 
  ON recipient_gift_cards(recipient_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_campaign 
  ON recipient_gift_cards(campaign_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_condition 
  ON recipient_gift_cards(condition_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_gift_card 
  ON recipient_gift_cards(gift_card_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_delivery_status 
  ON recipient_gift_cards(delivery_status)
  WHERE delivery_status IN ('pending', 'failed');

-- Create composite index for fast recipient+condition lookups
CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_lookup 
  ON recipient_gift_cards(recipient_id, condition_id);

-- Add comments
COMMENT ON TABLE recipient_gift_cards IS 'Tracks which gift cards are assigned to which recipients for which conditions - enables multi-condition rewards';
COMMENT ON COLUMN recipient_gift_cards.recipient_id IS 'The recipient who received the gift card';
COMMENT ON COLUMN recipient_gift_cards.condition_id IS 'The specific condition this gift card fulfills';
COMMENT ON COLUMN recipient_gift_cards.assigned_at IS 'When the card was assigned (locked) to this recipient';
COMMENT ON COLUMN recipient_gift_cards.delivered_at IS 'When the card was successfully delivered';
COMMENT ON COLUMN recipient_gift_cards.delivery_status IS 'Current delivery status for tracking and retry logic';

-- Enable RLS
ALTER TABLE recipient_gift_cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admins can see everything
CREATE POLICY "admin_all_access" ON recipient_gift_cards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Users can see their client's recipient gift cards
CREATE POLICY "client_view_own" ON recipient_gift_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = recipient_gift_cards.campaign_id
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Service role can manage everything
CREATE POLICY "service_role_all" ON recipient_gift_cards
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to get recipient's assigned gift card for a condition
CREATE OR REPLACE FUNCTION get_recipient_gift_card_for_condition(
  p_recipient_id UUID,
  p_condition_id UUID
)
RETURNS TABLE (
  gift_card_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT,
  card_code TEXT,
  card_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rgc.gift_card_id,
    rgc.assigned_at,
    rgc.delivered_at,
    rgc.delivery_status,
    gc.card_code,
    gc.card_value
  FROM recipient_gift_cards rgc
  INNER JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if recipient already has card for condition
CREATE OR REPLACE FUNCTION recipient_has_card_for_condition(
  p_recipient_id UUID,
  p_condition_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM recipient_gift_cards
    WHERE recipient_id = p_recipient_id
      AND condition_id = p_condition_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_recipient_gift_card_for_condition TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipient_gift_card_for_condition TO service_role;
GRANT EXECUTE ON FUNCTION recipient_has_card_for_condition TO authenticated;
GRANT EXECUTE ON FUNCTION recipient_has_card_for_condition TO service_role;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recipient_gift_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipient_gift_cards_updated_at
  BEFORE UPDATE ON recipient_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_recipient_gift_cards_updated_at();

