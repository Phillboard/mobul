-- =====================================================
-- CONSOLIDATED GIFT CARD SCHEMA MIGRATIONS
-- =====================================================
-- Run this script in the Supabase SQL Editor to apply
-- all pending gift card system migrations at once.
-- 
-- This script is IDEMPOTENT - safe to run multiple times.
-- =====================================================

-- =====================================================
-- PART 1: UPDATE CAMPAIGN_CONDITIONS TABLE
-- Add brand_id and card_value columns for simplified gift card selection
-- =====================================================

DO $$
BEGIN
  -- Add brand_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_conditions' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE campaign_conditions
      ADD COLUMN brand_id UUID REFERENCES gift_card_brands(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added brand_id column to campaign_conditions';
  ELSE
    RAISE NOTICE 'brand_id column already exists in campaign_conditions';
  END IF;

  -- Add card_value column if not exists  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_conditions' AND column_name = 'card_value'
  ) THEN
    ALTER TABLE campaign_conditions
      ADD COLUMN card_value NUMERIC(10,2);
    RAISE NOTICE 'Added card_value column to campaign_conditions';
  ELSE
    RAISE NOTICE 'card_value column already exists in campaign_conditions';
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN campaign_conditions.brand_id IS 'Gift card brand for this condition reward - used with card_value for simplified selection';
COMMENT ON COLUMN campaign_conditions.card_value IS 'Gift card denomination for this condition reward - used with brand_id';

-- Create index for brand+value lookups
CREATE INDEX IF NOT EXISTS idx_campaign_conditions_brand_value 
  ON campaign_conditions(brand_id, card_value)
  WHERE brand_id IS NOT NULL;

-- =====================================================
-- PART 2: CREATE UPDATE TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: ENHANCE GIFT_CARD_BRANDS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gift_card_brands' AND column_name = 'is_enabled_by_admin'
  ) THEN
    ALTER TABLE gift_card_brands 
      ADD COLUMN is_enabled_by_admin BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_enabled_by_admin to gift_card_brands';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gift_card_brands' AND column_name = 'tillo_brand_code'
  ) THEN
    ALTER TABLE gift_card_brands 
      ADD COLUMN tillo_brand_code TEXT;
    RAISE NOTICE 'Added tillo_brand_code to gift_card_brands';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gift_card_brands' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE gift_card_brands 
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at to gift_card_brands';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gift_card_brands_tillo_code 
  ON gift_card_brands(tillo_brand_code) WHERE tillo_brand_code IS NOT NULL;

DROP TRIGGER IF EXISTS update_gift_card_brands_updated_at ON gift_card_brands;
CREATE TRIGGER update_gift_card_brands_updated_at
  BEFORE UPDATE ON gift_card_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 4: CREATE GIFT_CARD_DENOMINATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS gift_card_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id) ON DELETE CASCADE,
  denomination NUMERIC(10,2) NOT NULL CHECK (denomination > 0),
  
  -- Admin enablement
  is_enabled_by_admin BOOLEAN DEFAULT false,
  
  -- Cost tracking
  admin_cost_per_card NUMERIC(10,2),
  tillo_cost_per_card NUMERIC(10,2),
  last_tillo_price_check TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique brand-denomination pairs
  UNIQUE(brand_id, denomination)
);

CREATE INDEX IF NOT EXISTS idx_denominations_brand ON gift_card_denominations(brand_id);
CREATE INDEX IF NOT EXISTS idx_denominations_enabled ON gift_card_denominations(is_enabled_by_admin) 
  WHERE is_enabled_by_admin = true;

DROP TRIGGER IF EXISTS update_gift_card_denominations_updated_at ON gift_card_denominations;
CREATE TRIGGER update_gift_card_denominations_updated_at
  BEFORE UPDATE ON gift_card_denominations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 5: CREATE GIFT_CARD_INVENTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS gift_card_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Card identification
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  denomination NUMERIC(10,2) NOT NULL CHECK (denomination > 0),
  card_code TEXT NOT NULL UNIQUE,
  card_number TEXT,
  expiration_date DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available',
    'assigned',
    'delivered',
    'expired'
  )),
  
  -- Upload tracking
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by_user_id UUID,
  upload_batch_id UUID,
  
  -- Assignment tracking
  assigned_to_recipient_id UUID REFERENCES recipients(id),
  assigned_to_campaign_id UUID REFERENCES campaigns(id),
  assigned_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_brand_denom ON gift_card_inventory(brand_id, denomination);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON gift_card_inventory(status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_inventory_card_code ON gift_card_inventory(card_code);
CREATE INDEX IF NOT EXISTS idx_inventory_recipient ON gift_card_inventory(assigned_to_recipient_id) 
  WHERE assigned_to_recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_campaign ON gift_card_inventory(assigned_to_campaign_id)
  WHERE assigned_to_campaign_id IS NOT NULL;

-- =====================================================
-- PART 6: CREATE CLIENT_AVAILABLE_GIFT_CARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS client_available_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id) ON DELETE CASCADE,
  denomination NUMERIC(10,2) NOT NULL,
  
  is_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, brand_id, denomination)
);

CREATE INDEX IF NOT EXISTS idx_client_giftcards_client ON client_available_gift_cards(client_id);
CREATE INDEX IF NOT EXISTS idx_client_giftcards_brand ON client_available_gift_cards(brand_id);
CREATE INDEX IF NOT EXISTS idx_client_giftcards_enabled ON client_available_gift_cards(is_enabled) 
  WHERE is_enabled = true;

DROP TRIGGER IF EXISTS update_client_available_gift_cards_updated_at ON client_available_gift_cards;
CREATE TRIGGER update_client_available_gift_cards_updated_at
  BEFORE UPDATE ON client_available_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 7: CREATE AGENCY_AVAILABLE_GIFT_CARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS agency_available_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id) ON DELETE CASCADE,
  denomination NUMERIC(10,2) NOT NULL,
  
  is_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agency_id, brand_id, denomination)
);

CREATE INDEX IF NOT EXISTS idx_agency_giftcards_agency ON agency_available_gift_cards(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_giftcards_brand ON agency_available_gift_cards(brand_id);

DROP TRIGGER IF EXISTS update_agency_available_gift_cards_updated_at ON agency_available_gift_cards;
CREATE TRIGGER update_agency_available_gift_cards_updated_at
  BEFORE UPDATE ON agency_available_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 8: CREATE GIFT_CARD_BILLING_LEDGER TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS gift_card_billing_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'purchase_from_inventory',
    'purchase_from_tillo',
    'refund'
  )),
  
  billed_entity_type TEXT NOT NULL CHECK (billed_entity_type IN ('client', 'agency')),
  billed_entity_id UUID NOT NULL,
  
  campaign_id UUID REFERENCES campaigns(id),
  recipient_id UUID REFERENCES recipients(id),
  
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  denomination NUMERIC(10,2) NOT NULL,
  
  amount_billed NUMERIC(10,2) NOT NULL CHECK (amount_billed >= 0),
  cost_basis NUMERIC(10,2) CHECK (cost_basis >= 0),
  profit NUMERIC(10,2) GENERATED ALWAYS AS (amount_billed - COALESCE(cost_basis, 0)) STORED,
  
  inventory_card_id UUID REFERENCES gift_card_inventory(id),
  tillo_transaction_id TEXT,
  tillo_order_reference TEXT,
  
  billed_at TIMESTAMPTZ DEFAULT NOW(),
  
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_entity ON gift_card_billing_ledger(billed_entity_type, billed_entity_id);
CREATE INDEX IF NOT EXISTS idx_billing_ledger_campaign ON gift_card_billing_ledger(campaign_id) 
  WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_ledger_brand ON gift_card_billing_ledger(brand_id);
CREATE INDEX IF NOT EXISTS idx_billing_ledger_date ON gift_card_billing_ledger(billed_at DESC);

-- =====================================================
-- PART 9: CREATE CAMPAIGN_GIFT_CARD_CONFIG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_gift_card_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  denomination NUMERIC(10,2) NOT NULL,
  
  condition_number INTEGER NOT NULL CHECK (condition_number > 0 AND condition_number <= 3),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, condition_number)
);

CREATE INDEX IF NOT EXISTS idx_campaign_giftcard_campaign ON campaign_gift_card_config(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_giftcard_brand ON campaign_gift_card_config(brand_id);

DROP TRIGGER IF EXISTS update_campaign_gift_card_config_updated_at ON campaign_gift_card_config;
CREATE TRIGGER update_campaign_gift_card_config_updated_at
  BEFORE UPDATE ON campaign_gift_card_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PART 10: ADD BILLING COLUMNS TO CLIENTS AND AGENCIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'agency_billing_enabled'
  ) THEN
    ALTER TABLE clients
      ADD COLUMN agency_billing_enabled BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added agency_billing_enabled to clients';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agencies' AND column_name = 'gift_card_markup_percentage'
  ) THEN
    ALTER TABLE agencies
      ADD COLUMN gift_card_markup_percentage NUMERIC(5,2) DEFAULT 0;
    RAISE NOTICE 'Added gift_card_markup_percentage to agencies';
  END IF;
END $$;

-- =====================================================
-- PART 11: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE gift_card_denominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_available_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_available_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_billing_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_gift_card_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 12: CREATE RLS POLICIES
-- =====================================================

-- GIFT_CARD_DENOMINATIONS policies
DROP POLICY IF EXISTS "Users can view enabled denominations" ON gift_card_denominations;
CREATE POLICY "Users can view enabled denominations"
  ON gift_card_denominations FOR SELECT
  USING (is_enabled_by_admin = true OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage denominations" ON gift_card_denominations;
CREATE POLICY "Admins can manage denominations"
  ON gift_card_denominations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- GIFT_CARD_INVENTORY policies
DROP POLICY IF EXISTS "Admins can view all inventory" ON gift_card_inventory;
CREATE POLICY "Admins can view all inventory"
  ON gift_card_inventory FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage inventory" ON gift_card_inventory;
CREATE POLICY "Admins can manage inventory"
  ON gift_card_inventory FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update inventory" ON gift_card_inventory;
CREATE POLICY "Admins can update inventory"
  ON gift_card_inventory FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view assigned cards" ON gift_card_inventory;
CREATE POLICY "Users can view assigned cards"
  ON gift_card_inventory FOR SELECT
  USING (
    assigned_to_campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- CLIENT_AVAILABLE_GIFT_CARDS policies
DROP POLICY IF EXISTS "Users can view client gift cards" ON client_available_gift_cards;
CREATE POLICY "Users can view client gift cards"
  ON client_available_gift_cards FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

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

-- AGENCY_AVAILABLE_GIFT_CARDS policies
DROP POLICY IF EXISTS "Agency users can view agency gift cards" ON agency_available_gift_cards;
CREATE POLICY "Agency users can view agency gift cards"
  ON agency_available_gift_cards FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR agency_id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Agency owners can manage gift cards" ON agency_available_gift_cards;
CREATE POLICY "Agency owners can manage gift cards"
  ON agency_available_gift_cards FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR agency_id IN (
      SELECT agency_id FROM user_agencies 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR agency_id IN (
      SELECT agency_id FROM user_agencies 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- GIFT_CARD_BILLING_LEDGER policies
DROP POLICY IF EXISTS "Admins can view all billing" ON gift_card_billing_ledger;
CREATE POLICY "Admins can view all billing"
  ON gift_card_billing_ledger FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Clients can view their billing" ON gift_card_billing_ledger;
CREATE POLICY "Clients can view their billing"
  ON gift_card_billing_ledger FOR SELECT
  USING (
    billed_entity_type = 'client'
    AND billed_entity_id IN (
      SELECT id FROM clients WHERE user_can_access_client(auth.uid(), id)
    )
  );

DROP POLICY IF EXISTS "Service can insert billing" ON gift_card_billing_ledger;
CREATE POLICY "Service can insert billing"
  ON gift_card_billing_ledger FOR INSERT
  WITH CHECK (true);

-- CAMPAIGN_GIFT_CARD_CONFIG policies
DROP POLICY IF EXISTS "Users can view campaign gift card config" ON campaign_gift_card_config;
CREATE POLICY "Users can view campaign gift card config"
  ON campaign_gift_card_config FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

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
-- PART 13: GRANT PERMISSIONS
-- =====================================================

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

-- =====================================================
-- PART 14: CREATE HELPER FUNCTIONS
-- =====================================================

-- Helper function to get brand+value from condition
CREATE OR REPLACE FUNCTION get_condition_gift_card_config(p_condition_id UUID)
RETURNS TABLE (
  brand_id UUID,
  brand_name TEXT,
  card_value NUMERIC,
  pool_id UUID,
  uses_new_format BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.brand_id,
    gcb.brand_name,
    cc.card_value,
    NULL::UUID AS pool_id,
    (cc.brand_id IS NOT NULL) AS uses_new_format
  FROM campaign_conditions cc
  LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
  WHERE cc.id = p_condition_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_condition_gift_card_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_condition_gift_card_config TO service_role;

-- Function to claim gift card from inventory
CREATE OR REPLACE FUNCTION claim_gift_card_from_inventory(
  p_brand_id UUID,
  p_denomination NUMERIC,
  p_recipient_id UUID,
  p_campaign_id UUID
)
RETURNS TABLE (
  card_id UUID,
  card_code TEXT,
  card_number TEXT,
  expiration_date DATE,
  brand_name TEXT,
  brand_logo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Atomically claim the first available card
  UPDATE gift_card_inventory
  SET 
    status = 'assigned',
    assigned_to_recipient_id = p_recipient_id,
    assigned_to_campaign_id = p_campaign_id,
    assigned_at = NOW()
  WHERE id = (
    SELECT id FROM gift_card_inventory
    WHERE brand_id = p_brand_id
      AND denomination = p_denomination
      AND status = 'available'
      AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
    ORDER BY uploaded_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_card_id;
  
  IF v_card_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    gci.id,
    gci.card_code,
    gci.card_number,
    gci.expiration_date,
    gcb.brand_name,
    gcb.logo_url
  FROM gift_card_inventory gci
  JOIN gift_card_brands gcb ON gcb.id = gci.brand_id
  WHERE gci.id = v_card_id;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_gift_card_from_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION claim_gift_card_from_inventory TO service_role;

-- Function to get inventory count
CREATE OR REPLACE FUNCTION get_inventory_count(
  p_brand_id UUID,
  p_denomination NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM gift_card_inventory
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination
    AND status = 'available'
    AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE);
  
  RETURN COALESCE(v_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_inventory_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_count TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Gift Card Schema Migration Complete!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - campaign_conditions (added brand_id, card_value)';
  RAISE NOTICE '  - gift_card_denominations';
  RAISE NOTICE '  - gift_card_inventory';
  RAISE NOTICE '  - client_available_gift_cards';
  RAISE NOTICE '  - agency_available_gift_cards';
  RAISE NOTICE '  - gift_card_billing_ledger';
  RAISE NOTICE '  - campaign_gift_card_config';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Regenerate TypeScript types with: npx supabase gen types';
  RAISE NOTICE '2. Update application code to use new schema';
  RAISE NOTICE '=====================================================';
END $$;

