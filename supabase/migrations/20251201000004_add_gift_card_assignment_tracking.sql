-- Add gift card assignment tracking fields
-- This enables atomic assignment to prevent double redemptions

-- Add assignment tracking columns to gift_cards table
ALTER TABLE gift_cards
  ADD COLUMN IF NOT EXISTS assigned_to_recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS assignment_source TEXT CHECK (assignment_source IN ('call_center', 'landing_page', 'form_submission', 'api', 'manual')),
  ADD COLUMN IF NOT EXISTS assignment_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_condition_id UUID REFERENCES campaign_conditions(id) ON DELETE SET NULL;

-- Create index for fast assignment lookups
CREATE INDEX IF NOT EXISTS idx_gift_cards_assignment_lookup 
  ON gift_cards(assigned_to_recipient_id, assignment_condition_id)
  WHERE assigned_to_recipient_id IS NOT NULL;

-- Create index for brand/value availability queries
CREATE INDEX IF NOT EXISTS idx_gift_cards_brand_value_available 
  ON gift_cards(brand_id, card_value, status, pool_id)
  WHERE status = 'available';

-- Add comment explaining the assignment tracking
COMMENT ON COLUMN gift_cards.assigned_to_recipient_id IS 'Recipient this card is locked to - prevents double redemption';
COMMENT ON COLUMN gift_cards.assignment_locked_at IS 'When the card was assigned (locked) to prevent other claims';
COMMENT ON COLUMN gift_cards.assignment_source IS 'Where the assignment originated: call_center, landing_page, form_submission, api, or manual';
COMMENT ON COLUMN gift_cards.assignment_campaign_id IS 'Campaign this assignment is for';
COMMENT ON COLUMN gift_cards.assignment_condition_id IS 'Specific condition this card fulfills';

-- Update RLS policies to prevent double assignment
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "prevent_double_assignment" ON gift_cards;

-- Create policy to prevent assigning already-assigned cards
CREATE POLICY "prevent_double_assignment" ON gift_cards
  FOR UPDATE
  USING (
    -- Only allow updating cards that are:
    -- 1. Available (not yet assigned), OR
    -- 2. Already assigned to the same recipient+condition (allow updates like delivery status)
    status = 'available' 
    OR (assigned_to_recipient_id = auth.uid() AND assignment_locked_at IS NOT NULL)
  );

-- Function to check if a card is available for assignment
CREATE OR REPLACE FUNCTION is_card_available_for_assignment(card_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gift_cards
    WHERE id = card_id
      AND status = 'available'
      AND assigned_to_recipient_id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_card_available_for_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION is_card_available_for_assignment TO service_role;

