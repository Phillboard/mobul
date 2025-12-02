-- =====================================================
-- RLS POLICIES FOR NEW GIFT CARD SYSTEM
-- =====================================================
-- Migration: Row Level Security policies
-- =====================================================

-- =====================================================
-- 1. GIFT_CARD_BRANDS TABLE
-- =====================================================

ALTER TABLE gift_card_brands ENABLE ROW LEVEL SECURITY;

-- Everyone can view active brands
DROP POLICY IF EXISTS "Anyone can view enabled brands" ON gift_card_brands;
CREATE POLICY "Anyone can view enabled brands"
  ON gift_card_brands FOR SELECT
  USING (is_enabled_by_admin = true OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage brands
DROP POLICY IF EXISTS "Admins can manage brands" ON gift_card_brands;
CREATE POLICY "Admins can manage brands"
  ON gift_card_brands FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 2. GIFT_CARD_DENOMINATIONS TABLE
-- =====================================================

ALTER TABLE gift_card_denominations ENABLE ROW LEVEL SECURITY;

-- Users can view enabled denominations or all if admin
DROP POLICY IF EXISTS "Users can view enabled denominations" ON gift_card_denominations;
CREATE POLICY "Users can view enabled denominations"
  ON gift_card_denominations FOR SELECT
  USING (
    is_enabled_by_admin = true 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Only admins can manage denominations
DROP POLICY IF EXISTS "Admins can manage denominations" ON gift_card_denominations;
CREATE POLICY "Admins can manage denominations"
  ON gift_card_denominations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. GIFT_CARD_INVENTORY TABLE
-- =====================================================

ALTER TABLE gift_card_inventory ENABLE ROW LEVEL SECURITY;

-- Admins can view all inventory
DROP POLICY IF EXISTS "Admins can view all inventory" ON gift_card_inventory;
CREATE POLICY "Admins can view all inventory"
  ON gift_card_inventory FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert/update inventory
DROP POLICY IF EXISTS "Admins can manage inventory" ON gift_card_inventory;
CREATE POLICY "Admins can manage inventory"
  ON gift_card_inventory FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update inventory" ON gift_card_inventory;
CREATE POLICY "Admins can update inventory"
  ON gift_card_inventory FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their assigned cards
DROP POLICY IF EXISTS "Users can view assigned cards" ON gift_card_inventory;
CREATE POLICY "Users can view assigned cards"
  ON gift_card_inventory FOR SELECT
  USING (
    assigned_to_campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- System/service role can update for provisioning
DROP POLICY IF EXISTS "Service can update inventory" ON gift_card_inventory;
CREATE POLICY "Service can update inventory"
  ON gift_card_inventory FOR UPDATE
  USING (true) -- Service role bypasses RLS
  WITH CHECK (true);

-- =====================================================
-- 4. CLIENT_AVAILABLE_GIFT_CARDS TABLE
-- =====================================================

ALTER TABLE client_available_gift_cards ENABLE ROW LEVEL SECURITY;

-- Users can view their client's available gift cards
DROP POLICY IF EXISTS "Users can view client gift cards" ON client_available_gift_cards;
CREATE POLICY "Users can view client gift cards"
  ON client_available_gift_cards FOR SELECT
  USING (
    user_can_access_client(auth.uid(), client_id)
  );

-- Admins and client owners can manage
DROP POLICY IF EXISTS "Admins can manage client gift cards" ON client_available_gift_cards;
CREATE POLICY "Admins can manage client gift cards"
  ON client_available_gift_cards FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      user_can_access_client(auth.uid(), client_id)
      AND has_role(auth.uid(), 'company_owner'::app_role)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      user_can_access_client(auth.uid(), client_id)
      AND has_role(auth.uid(), 'company_owner'::app_role)
    )
  );

-- =====================================================
-- 5. AGENCY_AVAILABLE_GIFT_CARDS TABLE
-- =====================================================

ALTER TABLE agency_available_gift_cards ENABLE ROW LEVEL SECURITY;

-- Agency users can view their agency's gift cards
DROP POLICY IF EXISTS "Agency users can view agency gift cards" ON agency_available_gift_cards;
CREATE POLICY "Agency users can view agency gift cards"
  ON agency_available_gift_cards FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR agency_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );

-- Agency owners and admins can manage
DROP POLICY IF EXISTS "Agency owners can manage gift cards" ON agency_available_gift_cards;
CREATE POLICY "Agency owners can manage gift cards"
  ON agency_available_gift_cards FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      agency_id IN (
        SELECT agency_id FROM user_agencies 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      agency_id IN (
        SELECT agency_id FROM user_agencies 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

-- =====================================================
-- 6. GIFT_CARD_BILLING_LEDGER TABLE
-- =====================================================

ALTER TABLE gift_card_billing_ledger ENABLE ROW LEVEL SECURITY;

-- Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all billing" ON gift_card_billing_ledger;
CREATE POLICY "Admins can view all billing"
  ON gift_card_billing_ledger FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Clients can view their transactions
DROP POLICY IF EXISTS "Clients can view their billing" ON gift_card_billing_ledger;
CREATE POLICY "Clients can view their billing"
  ON gift_card_billing_ledger FOR SELECT
  USING (
    billed_entity_type = 'client'
    AND billed_entity_id IN (
      SELECT id FROM clients WHERE user_can_access_client(auth.uid(), id)
    )
  );

-- Agencies can view their transactions
DROP POLICY IF EXISTS "Agencies can view their billing" ON gift_card_billing_ledger;
CREATE POLICY "Agencies can view their billing"
  ON gift_card_billing_ledger FOR SELECT
  USING (
    billed_entity_type = 'agency'
    AND billed_entity_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );

-- System can insert billing records (service role)
DROP POLICY IF EXISTS "Service can insert billing" ON gift_card_billing_ledger;
CREATE POLICY "Service can insert billing"
  ON gift_card_billing_ledger FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- =====================================================
-- 7. CAMPAIGN_GIFT_CARD_CONFIG TABLE
-- =====================================================

ALTER TABLE campaign_gift_card_config ENABLE ROW LEVEL SECURITY;

-- Users can view gift card configs for campaigns they can access
DROP POLICY IF EXISTS "Users can view campaign gift card config" ON campaign_gift_card_config;
CREATE POLICY "Users can view campaign gift card config"
  ON campaign_gift_card_config FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Users can manage configs for campaigns they can access
DROP POLICY IF EXISTS "Users can manage campaign gift card config" ON campaign_gift_card_config;
CREATE POLICY "Users can manage campaign gift card config"
  ON campaign_gift_card_config FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can update campaign gift card config" ON campaign_gift_card_config;
CREATE POLICY "Users can update campaign gift card config"
  ON campaign_gift_card_config FOR UPDATE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

DROP POLICY IF EXISTS "Users can delete campaign gift card config" ON campaign_gift_card_config;
CREATE POLICY "Users can delete campaign gift card config"
  ON campaign_gift_card_config FOR DELETE
  USING (
    campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- =====================================================
-- GRANT PERMISSIONS ON TABLES
-- =====================================================

GRANT SELECT ON gift_card_brands TO authenticated;
GRANT SELECT ON gift_card_denominations TO authenticated;
GRANT SELECT ON gift_card_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_available_gift_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agency_available_gift_cards TO authenticated;
GRANT SELECT ON gift_card_billing_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_gift_card_config TO authenticated;

-- Service role gets full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMENT ON POLICY "Anyone can view enabled brands" ON gift_card_brands 
  IS 'Public can see enabled brands; admins see all';
COMMENT ON POLICY "Users can view client gift cards" ON client_available_gift_cards 
  IS 'Users can only see gift cards for clients they have access to';
COMMENT ON POLICY "Admins can view all billing" ON gift_card_billing_ledger 
  IS 'Complete financial transparency for platform admins';

