-- =====================================================
-- PHASE 1: CREDIT-BASED GIFT CARD SYSTEM
-- =====================================================
-- Migration: Create hierarchical credit account system
-- Replaces pool-based system with credit accounts
-- Platform → Agency → Client → Campaign hierarchy
-- =====================================================

-- =====================================================
-- 1. CREDIT ACCOUNTS TABLE
-- =====================================================
-- Foundation of the new system
-- Every entity (agency/client/campaign) gets a credit account

CREATE TABLE IF NOT EXISTS credit_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL CHECK (account_type IN ('platform', 'agency', 'client', 'campaign')),
  owner_id UUID NOT NULL, -- References agencies.id, clients.id, or campaigns.id
  parent_account_id UUID REFERENCES credit_accounts(id),
  
  -- Credit tracking
  total_purchased NUMERIC(12,2) DEFAULT 0 NOT NULL,
  total_allocated NUMERIC(12,2) DEFAULT 0 NOT NULL,
  total_used NUMERIC(12,2) DEFAULT 0 NOT NULL,
  total_remaining NUMERIC(12,2) DEFAULT 0 NOT NULL,
  
  -- Pricing configuration
  pricing_tier TEXT DEFAULT 'standard',
  markup_percentage NUMERIC(5,2), -- Agency can set their markup
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'depleted')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_remaining CHECK (total_remaining >= 0),
  UNIQUE(account_type, owner_id)
);

-- Indexes for performance
CREATE INDEX idx_credit_accounts_owner ON credit_accounts(owner_id, account_type);
CREATE INDEX idx_credit_accounts_parent ON credit_accounts(parent_account_id);
CREATE INDEX idx_credit_accounts_status ON credit_accounts(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Platform admins can view all accounts"
  ON credit_accounts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can manage all accounts"
  ON credit_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agencies can view their account and children"
  ON credit_accounts FOR SELECT
  USING (
    account_type = 'agency' AND owner_id IN (
      SELECT id FROM agencies WHERE id IN (
        SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
      )
    )
    OR 
    parent_account_id IN (
      SELECT id FROM credit_accounts 
      WHERE account_type = 'agency' AND owner_id IN (
        SELECT id FROM agencies WHERE id IN (
          SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Clients can view their account"
  ON credit_accounts FOR SELECT
  USING (
    account_type = 'client' AND owner_id IN (
      SELECT id FROM clients WHERE user_can_access_client(auth.uid(), id)
    )
  );

-- Update trigger
CREATE TRIGGER update_credit_accounts_updated_at
  BEFORE UPDATE ON credit_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. CREDIT TRANSACTIONS TABLE
-- =====================================================
-- Immutable ledger for all credit movements

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES credit_accounts(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'purchase',       -- External money coming in
    'allocation_out', -- Parent allocating to child
    'allocation_in',  -- Child receiving from parent
    'redemption',     -- Gift card provisioned (deduction)
    'refund',         -- Money returned
    'adjustment'      -- Admin correction
  )),
  
  amount NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  
  -- Linkage
  related_transaction_id UUID REFERENCES credit_transactions(id), -- Links allocation pairs
  redemption_id UUID, -- Links to gift_card_redemptions.id
  
  -- Context
  metadata JSONB DEFAULT '{}'::jsonb, -- campaign_id, brand, etc.
  notes TEXT,
  created_by_user_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_credit_transactions_account ON credit_transactions(account_id, created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_redemption ON credit_transactions(redemption_id) WHERE redemption_id IS NOT NULL;

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Platform admins can view all transactions"
  ON credit_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Platform admins can create transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their account transactions"
  ON credit_transactions FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM credit_accounts ca
      WHERE (
        ca.account_type = 'client' AND ca.owner_id IN (
          SELECT id FROM clients WHERE user_can_access_client(auth.uid(), id)
        )
      )
      OR (
        ca.account_type = 'agency' AND ca.owner_id IN (
          SELECT id FROM agencies WHERE id IN (
            SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "System can create transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 3. GIFT CARD REDEMPTIONS TABLE
-- =====================================================
-- Track every card redemption with full context

CREATE TABLE IF NOT EXISTS gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  recipient_id UUID REFERENCES recipients(id),
  redemption_code TEXT NOT NULL UNIQUE, -- Customer enters this
  
  -- Gift card info
  gift_card_id UUID REFERENCES gift_cards(id),
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  denomination NUMERIC(10,2) NOT NULL,
  
  -- Financial tracking
  amount_charged NUMERIC(10,2) NOT NULL, -- What campaign was charged
  cost_basis NUMERIC(10,2), -- What we paid for the card
  profit NUMERIC(10,2) GENERATED ALWAYS AS (amount_charged - COALESCE(cost_basis, 0)) STORED,
  account_charged_id UUID NOT NULL REFERENCES credit_accounts(id),
  credit_transaction_id UUID REFERENCES credit_transactions(id),
  
  -- Redemption tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'provisioned', 'delivered', 'failed')),
  provisioning_source TEXT CHECK (provisioning_source IN ('csv', 'buffer', 'api')),
  
  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN ('sms', 'email')),
  delivery_address TEXT,
  delivered_at TIMESTAMPTZ,
  
  -- Security
  redemption_ip INET,
  redemption_user_agent TEXT,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_redemptions_campaign ON gift_card_redemptions(campaign_id);
CREATE INDEX idx_redemptions_code ON gift_card_redemptions(redemption_code);
CREATE INDEX idx_redemptions_status ON gift_card_redemptions(status);
CREATE INDEX idx_redemptions_account ON gift_card_redemptions(account_charged_id);
CREATE INDEX idx_redemptions_created ON gift_card_redemptions(created_at DESC);

-- Enable RLS
ALTER TABLE gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Platform admins can view all redemptions"
  ON gift_card_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view redemptions for their campaigns"
  ON gift_card_redemptions FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns c
      WHERE user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "System can create redemptions"
  ON gift_card_redemptions FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 4. ENHANCE AGENCIES TABLE
-- =====================================================
-- Integrate agencies with credit accounts

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  
  -- Credit integration
  credit_account_id UUID REFERENCES credit_accounts(id),
  
  -- Configuration
  enabled_brands JSONB DEFAULT '[]'::jsonb, -- Which brands they can offer
  pricing_tier TEXT DEFAULT 'wholesale',
  default_markup_percentage NUMERIC(5,2) DEFAULT 7.5,
  
  -- Metadata
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on agencies
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agencies
CREATE POLICY "Platform admins can manage agencies"
  ON agencies FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agency users can view their agency"
  ON agencies FOR SELECT
  USING (
    id IN (
      SELECT agency_id FROM user_agencies WHERE user_id = auth.uid()
    )
  );

-- Create user_agencies junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agency_id)
);

-- Enable RLS on user_agencies
ALTER TABLE user_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency memberships"
  ON user_agencies FOR SELECT
  USING (user_id = auth.uid());

-- Update trigger for agencies
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ENHANCE CLIENTS TABLE
-- =====================================================
-- Link clients to agencies and credit accounts

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id),
  ADD COLUMN IF NOT EXISTS credit_account_id UUID REFERENCES credit_accounts(id);

-- =====================================================
-- 6. ENHANCE CAMPAIGNS TABLE
-- =====================================================
-- Add credit account support and budget options

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS credit_account_id UUID REFERENCES credit_accounts(id),
  ADD COLUMN IF NOT EXISTS allocated_budget NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS uses_shared_credit BOOLEAN DEFAULT true;

-- =====================================================
-- 7. ENHANCE GIFT_CARD_POOLS TABLE
-- =====================================================
-- Add pool_type to distinguish CSV, buffer, and API config pools

ALTER TABLE gift_card_pools
  ADD COLUMN IF NOT EXISTS pool_type TEXT DEFAULT 'csv' CHECK (pool_type IN ('csv', 'buffer', 'api_config')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS buffer_target_quantity INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS buffer_refill_threshold INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS cost_per_card NUMERIC(10,2); -- What we pay for these cards

-- Update existing pools to type 'csv'
UPDATE gift_card_pools SET pool_type = 'csv' WHERE pool_type IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_type ON gift_card_pools(pool_type, brand_id, card_value);
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_active ON gift_card_pools(is_active) WHERE is_active = true;

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to get or create credit account for an entity
CREATE OR REPLACE FUNCTION get_or_create_credit_account(
  p_account_type TEXT,
  p_owner_id UUID,
  p_parent_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Try to find existing account
  SELECT id INTO v_account_id
  FROM credit_accounts
  WHERE account_type = p_account_type AND owner_id = p_owner_id;
  
  -- Create if doesn't exist
  IF v_account_id IS NULL THEN
    INSERT INTO credit_accounts (account_type, owner_id, parent_account_id)
    VALUES (p_account_type, p_owner_id, p_parent_account_id)
    RETURNING id INTO v_account_id;
  END IF;
  
  RETURN v_account_id;
END;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE credit_accounts IS 'Hierarchical credit accounts for agencies, clients, and campaigns. Money flows DOWN only.';
COMMENT ON TABLE credit_transactions IS 'Immutable ledger of all credit movements (purchases, allocations, redemptions).';
COMMENT ON TABLE gift_card_redemptions IS 'Complete redemption history with financial tracking and profit calculation.';
COMMENT ON COLUMN credit_accounts.total_remaining IS 'Current available credit. NEVER goes negative (enforced by constraint).';
COMMENT ON COLUMN gift_card_redemptions.profit IS 'Auto-calculated profit per redemption (amount_charged - cost_basis).';
COMMENT ON COLUMN gift_card_pools.pool_type IS 'csv = uploaded inventory, buffer = pre-provisioned API cards, api_config = on-demand API configuration';

