-- Enhanced Campaign System - Complete Redesign
-- This migration adds comprehensive campaign management features including:
-- - Direct reward pool connections
-- - Campaign version tracking
-- - Post-publish editing capabilities
-- - Atomic gift card claiming
-- - Form and landing page enforcement

-- ============================================================================
-- PART 1: Add new columns to campaigns table
-- ============================================================================

-- Add reward configuration columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS reward_pool_id UUID REFERENCES gift_card_pools(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reward_condition TEXT DEFAULT 'form_submission' CHECK (reward_condition IN ('form_submission', 'call_completed', 'immediate')),
ADD COLUMN IF NOT EXISTS rewards_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS editable_after_publish BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS codes_uploaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_codes BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN campaigns.reward_pool_id IS 'Direct link to gift card pool for this campaign';
COMMENT ON COLUMN campaigns.reward_condition IS 'When to provision gift cards: form_submission, call_completed, or immediate';
COMMENT ON COLUMN campaigns.rewards_enabled IS 'Toggle to enable/disable gift card rewards for this campaign';
COMMENT ON COLUMN campaigns.version IS 'Version number for tracking campaign edits';
COMMENT ON COLUMN campaigns.editable_after_publish IS 'Allow editing campaign after it has been published';
COMMENT ON COLUMN campaigns.codes_uploaded IS 'Whether customer codes have been uploaded for this campaign';
COMMENT ON COLUMN campaigns.requires_codes IS 'Whether this campaign requires code upload (false for testing/demos)';

-- Create index for reward pool lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_reward_pool ON campaigns(reward_pool_id) WHERE reward_pool_id IS NOT NULL;

-- ============================================================================
-- PART 2: Add campaign_id to ace_forms and landing_pages
-- ============================================================================

-- Add campaign link to ace_forms
ALTER TABLE ace_forms 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ace_forms_campaign ON ace_forms(campaign_id) WHERE campaign_id IS NOT NULL;

COMMENT ON COLUMN ace_forms.campaign_id IS 'Links form to a specific campaign for code validation and reward provisioning';

-- Add campaign link to landing_pages (for reverse lookup)
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_landing_pages_campaign ON landing_pages(campaign_id) WHERE campaign_id IS NOT NULL;

COMMENT ON COLUMN landing_pages.campaign_id IS 'Links landing page to a specific campaign';

-- ============================================================================
-- PART 3: Create campaign_versions table for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  previous_state JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_versions_campaign ON campaign_versions(campaign_id, version_number DESC);

COMMENT ON TABLE campaign_versions IS 'Tracks all changes made to campaigns after creation';
COMMENT ON COLUMN campaign_versions.changes IS 'JSON object containing the fields that were changed';
COMMENT ON COLUMN campaign_versions.previous_state IS 'Snapshot of campaign state before this change';

-- Enable RLS
ALTER TABLE campaign_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_versions
CREATE POLICY "Users can view versions for accessible campaigns"
  ON campaign_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_versions.campaign_id 
      AND user_can_access_client(auth.uid(), campaigns.client_id)
    )
  );

CREATE POLICY "Users can create versions for accessible campaigns"
  ON campaign_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_versions.campaign_id 
      AND user_can_access_client(auth.uid(), campaigns.client_id)
    )
  );

-- ============================================================================
-- PART 4: Create atomic gift card claiming function
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_card_atomic(
  p_pool_id UUID,
  p_recipient_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  card_value NUMERIC,
  expiration_date TIMESTAMPTZ,
  provider TEXT,
  brand_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_pool RECORD;
BEGIN
  -- Lock the pool row to prevent race conditions
  SELECT * INTO v_pool
  FROM gift_card_pools
  WHERE id = p_pool_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'POOL_NOT_FOUND: Gift card pool % not found', p_pool_id;
  END IF;

  -- Check if pool has available cards
  IF v_pool.available_cards <= 0 THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: Pool % has no available cards', v_pool.pool_name;
  END IF;

  -- Atomically select and lock one available card
  -- SKIP LOCKED prevents blocking on cards being claimed by other transactions
  SELECT 
    gc.id,
    gc.card_code,
    gc.card_number,
    gc.expiration_date,
    v_pool.card_value,
    v_pool.provider,
    v_pool.brand_id
  INTO v_card
  FROM gift_cards gc
  WHERE gc.pool_id = p_pool_id
    AND gc.status = 'available'
  ORDER BY gc.created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No cards available in pool %', v_pool.pool_name;
  END IF;

  -- Update the card status to claimed
  UPDATE gift_cards
  SET 
    status = 'claimed',
    claimed_at = NOW(),
    claimed_by_recipient_id = p_recipient_id,
    updated_at = NOW()
  WHERE id = v_card.id;

  -- Update pool counts atomically
  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - 1,
    claimed_cards = claimed_cards + 1,
    updated_at = NOW()
  WHERE id = p_pool_id;

  -- Return the claimed card details
  RETURN QUERY
  SELECT 
    v_card.id,
    v_card.card_code,
    v_card.card_number,
    v_card.card_value,
    v_card.expiration_date,
    v_card.provider,
    v_card.brand_id;
END;
$$;

COMMENT ON FUNCTION claim_card_atomic IS 'Atomically claims a gift card from a pool, preventing race conditions. Uses row-level locking and SKIP LOCKED for high concurrency.';

-- ============================================================================
-- PART 5: Add validation constraints
-- ============================================================================

-- Published campaigns must have landing page (unless grandfathered)
-- This constraint is added as a check but won't break existing campaigns
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_published_needs_landing_page;
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_published_needs_landing_page 
CHECK (
  (status NOT IN ('in_production', 'mailed')) 
  OR landing_page_id IS NOT NULL 
  OR requires_codes = false  -- Grandfathered campaigns
);

-- If rewards are enabled, must have a pool
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_rewards_needs_pool;
ALTER TABLE campaigns
ADD CONSTRAINT campaigns_rewards_needs_pool
CHECK (
  (rewards_enabled = false OR rewards_enabled IS NULL)
  OR reward_pool_id IS NOT NULL
);

-- ============================================================================
-- PART 6: Create indexes for performance
-- ============================================================================

-- Fast code lookups by redemption code and campaign
CREATE INDEX IF NOT EXISTS idx_recipients_code_campaign 
ON recipients(redemption_code, campaign_id) 
WHERE redemption_code IS NOT NULL;

-- Fast lookups for gift cards by status and pool
CREATE INDEX IF NOT EXISTS idx_gift_cards_pool_status 
ON gift_cards(pool_id, status) 
WHERE status = 'available';

-- Fast campaign lookups by reward configuration
CREATE INDEX IF NOT EXISTS idx_campaigns_rewards_enabled 
ON campaigns(client_id, rewards_enabled) 
WHERE rewards_enabled = true;

-- ============================================================================
-- PART 7: Create admin notification table for pool empty alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'resolved')),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES gift_card_pools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_admin_notifications_status ON admin_notifications(status, created_at DESC);
CREATE INDEX idx_admin_notifications_client ON admin_notifications(client_id, created_at DESC);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(notification_type, status);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can see all notifications
CREATE POLICY "Admins can view all notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Users can see notifications for their clients
CREATE POLICY "Users can view notifications for accessible clients"
  ON admin_notifications FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- Users can acknowledge notifications
CREATE POLICY "Users can acknowledge notifications for accessible clients"
  ON admin_notifications FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id))
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

COMMENT ON TABLE admin_notifications IS 'Stores administrative alerts such as pool empty warnings';

-- ============================================================================
-- PART 8: Helper function to create pool empty notification
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_pool_empty(
  p_pool_id UUID,
  p_campaign_id UUID,
  p_recipient_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pool RECORD;
  v_campaign RECORD;
  v_notification_id UUID;
BEGIN
  -- Get pool details
  SELECT pool_name, client_id INTO v_pool
  FROM gift_card_pools
  WHERE id = p_pool_id;

  -- Get campaign details
  SELECT name INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  -- Create notification
  INSERT INTO admin_notifications (
    notification_type,
    title,
    message,
    metadata,
    priority,
    client_id,
    campaign_id,
    pool_id
  ) VALUES (
    'pool_empty',
    'Gift Card Pool Empty',
    format('Pool "%s" has no available cards. Campaign "%s" attempted to provision a card but failed.', 
           v_pool.pool_name, v_campaign.name),
    jsonb_build_object(
      'pool_id', p_pool_id,
      'pool_name', v_pool.pool_name,
      'campaign_id', p_campaign_id,
      'campaign_name', v_campaign.name,
      'recipient_id', p_recipient_id,
      'timestamp', NOW()
    ),
    'high',
    v_pool.client_id,
    p_campaign_id,
    p_pool_id
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

COMMENT ON FUNCTION notify_pool_empty IS 'Creates an admin notification when a pool runs out of cards during redemption';

-- ============================================================================
-- PART 9: Migration support - grandfather existing campaigns
-- ============================================================================

-- Set existing campaigns to not require codes (grandfather them)
UPDATE campaigns
SET 
  requires_codes = false,
  editable_after_publish = true,
  codes_uploaded = CASE 
    WHEN audience_id IS NOT NULL THEN true 
    ELSE false 
  END
WHERE created_at < NOW(); -- All existing campaigns

-- Set reward pool from existing campaign_reward_configs if exists
UPDATE campaigns c
SET reward_pool_id = (
  SELECT crc.gift_card_pool_id 
  FROM campaign_reward_configs crc 
  WHERE crc.campaign_id = c.id 
  ORDER BY crc.condition_number 
  LIMIT 1
),
rewards_enabled = EXISTS (
  SELECT 1 FROM campaign_reward_configs crc 
  WHERE crc.campaign_id = c.id
)
WHERE EXISTS (
  SELECT 1 FROM campaign_reward_configs crc 
  WHERE crc.campaign_id = c.id
);

-- ============================================================================
-- PART 10: Grant permissions
-- ============================================================================

-- Grant execute permission on claim_card_atomic to authenticated users
GRANT EXECUTE ON FUNCTION claim_card_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION notify_pool_empty TO authenticated;

-- Grant permissions on new tables
GRANT SELECT, INSERT ON campaign_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin_notifications TO authenticated;

