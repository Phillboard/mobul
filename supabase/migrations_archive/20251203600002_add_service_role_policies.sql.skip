-- =====================================================
-- ADD SERVICE_ROLE POLICIES TO ALL REQUIRED TABLES
-- =====================================================
-- Root cause fix: RLS was blocking service_role from reading tables
-- Edge functions need explicit service_role policies to access tables with RLS
-- =====================================================

-- =====================================================
-- 1. CAMPAIGN_CONDITIONS TABLE (CRITICAL)
-- This is the main table that was blocking provisioning
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to campaign conditions" ON public.campaign_conditions;
CREATE POLICY "Service role has full access to campaign conditions"
  ON public.campaign_conditions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. RECIPIENTS TABLE
-- Edge functions need to look up recipients by redemption code
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to recipients" ON public.recipients;
CREATE POLICY "Service role has full access to recipients"
  ON public.recipients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. AUDIENCES TABLE
-- Recipients are linked to audiences which link to campaigns
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to audiences" ON public.audiences;
CREATE POLICY "Service role has full access to audiences"
  ON public.audiences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 4. CAMPAIGNS TABLE
-- Need to look up campaign details and client_id
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to campaigns" ON public.campaigns;
CREATE POLICY "Service role has full access to campaigns"
  ON public.campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 5. GIFT_CARD_BRANDS TABLE
-- Need to look up brand details (name, tillo_brand_code, etc.)
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to gift card brands" ON public.gift_card_brands;
CREATE POLICY "Service role has full access to gift card brands"
  ON public.gift_card_brands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 6. GIFT_CARD_INVENTORY TABLE
-- Need to claim cards from inventory
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to gift card inventory" ON public.gift_card_inventory;
CREATE POLICY "Service role has full access to gift card inventory"
  ON public.gift_card_inventory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 7. GIFT_CARD_BILLING_LEDGER TABLE
-- Need to insert billing records
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to gift card billing" ON public.gift_card_billing_ledger;
CREATE POLICY "Service role has full access to gift card billing"
  ON public.gift_card_billing_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 8. GIFT_CARD_DENOMINATIONS TABLE
-- Need to look up pricing
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to gift card denominations" ON public.gift_card_denominations;
CREATE POLICY "Service role has full access to gift card denominations"
  ON public.gift_card_denominations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 9. CAMPAIGN_GIFT_CARD_CONFIG TABLE
-- Alternative place to look up gift card config
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to campaign gift card config" ON public.campaign_gift_card_config;
CREATE POLICY "Service role has full access to campaign gift card config"
  ON public.campaign_gift_card_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 10. CLIENTS TABLE
-- Need for billing entity lookup
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to clients" ON public.clients;
CREATE POLICY "Service role has full access to clients"
  ON public.clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 11. CALL_SESSIONS TABLE
-- Need to update call session with gift card info
-- =====================================================
DROP POLICY IF EXISTS "Service role has full access to call sessions" ON public.call_sessions;
CREATE POLICY "Service role has full access to call sessions"
  ON public.call_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 12. SMS_DELIVERY_LOG TABLE (if exists)
-- For logging SMS delivery
-- =====================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_delivery_log') THEN
    DROP POLICY IF EXISTS "Service role has full access to sms delivery log" ON public.sms_delivery_log;
    CREATE POLICY "Service role has full access to sms delivery log"
      ON public.sms_delivery_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- 13. ERROR_LOGS TABLE
-- For logging errors
-- =====================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_logs') THEN
    DROP POLICY IF EXISTS "Service role has full access to error logs" ON public.error_logs;
    CREATE POLICY "Service role has full access to error logs"
      ON public.error_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Service role has full access to campaign conditions" 
  ON public.campaign_conditions 
  IS 'Allows edge functions to read gift card configuration during provisioning';

COMMENT ON POLICY "Service role has full access to recipients" 
  ON public.recipients 
  IS 'Allows edge functions to look up recipients by redemption code';

COMMENT ON POLICY "Service role has full access to gift card inventory" 
  ON public.gift_card_inventory 
  IS 'Allows edge functions to claim cards from inventory during provisioning';

