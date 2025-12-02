-- =====================================================
-- NEW GIFT CARD SYSTEM - FRESH START
-- =====================================================
-- Migration: Create new simplified gift card system
-- Brand-Denomination marketplace with unified provisioning
-- =====================================================

-- =====================================================
-- 1. ENHANCE GIFT_CARD_BRANDS TABLE
-- =====================================================

-- Add new columns to existing gift_card_brands table
ALTER TABLE gift_card_brands 
  ADD COLUMN IF NOT EXISTS is_enabled_by_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tillo_brand_code TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for Tillo lookups
CREATE INDEX IF NOT EXISTS idx_gift_card_brands_tillo_code 
  ON gift_card_brands(tillo_brand_code) WHERE tillo_brand_code IS NOT NULL;

-- Update trigger for brands
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gift_card_brands_updated_at ON gift_card_brands;
CREATE TRIGGER update_gift_card_brands_updated_at
  BEFORE UPDATE ON gift_card_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gift_card_brands IS 'Master catalog of gift card brands. Admin enables brands for the platform.';
COMMENT ON COLUMN gift_card_brands.is_enabled_by_admin IS 'When true, this brand is available for agencies/clients to use';
COMMENT ON COLUMN gift_card_brands.tillo_brand_code IS 'Tillo API brand identifier for API provisioning';

-- =====================================================
-- 2. GIFT_CARD_DENOMINATIONS TABLE
-- =====================================================

CREATE TABLE gift_card_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id) ON DELETE CASCADE,
  denomination NUMERIC(10,2) NOT NULL CHECK (denomination > 0),
  
  -- Admin enablement
  is_enabled_by_admin BOOLEAN DEFAULT false,
  
  -- Cost tracking
  admin_cost_per_card NUMERIC(10,2), -- What admin pays when buying bulk
  tillo_cost_per_card NUMERIC(10,2), -- Live Tillo API pricing
  last_tillo_price_check TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique brand-denomination pairs
  UNIQUE(brand_id, denomination)
);

CREATE INDEX idx_denominations_brand ON gift_card_denominations(brand_id);
CREATE INDEX idx_denominations_enabled ON gift_card_denominations(is_enabled_by_admin) 
  WHERE is_enabled_by_admin = true;

DROP TRIGGER IF EXISTS update_gift_card_denominations_updated_at ON gift_card_denominations;
CREATE TRIGGER update_gift_card_denominations_updated_at
  BEFORE UPDATE ON gift_card_denominations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gift_card_denominations IS 'Available denominations for each brand. Admin configures which denominations are available.';

-- =====================================================
-- 3. GIFT_CARD_INVENTORY TABLE
-- =====================================================
-- Stores uploaded gift card codes (CSV imports)

CREATE TABLE gift_card_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Card identification
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  denomination NUMERIC(10,2) NOT NULL CHECK (denomination > 0),
  card_code TEXT NOT NULL UNIQUE,
  card_number TEXT,
  expiration_date DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available',   -- Ready to be assigned
    'assigned',    -- Assigned to a recipient
    'delivered',   -- Successfully delivered
    'expired'      -- Past expiration date
  )),
  
  -- Upload tracking
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by_user_id UUID,
  upload_batch_id UUID, -- Group cards from same CSV upload
  
  -- Assignment tracking
  assigned_to_recipient_id UUID REFERENCES recipients(id),
  assigned_to_campaign_id UUID REFERENCES campaigns(id),
  assigned_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_brand_denom ON gift_card_inventory(brand_id, denomination);
CREATE INDEX idx_inventory_status ON gift_card_inventory(status) WHERE status = 'available';
CREATE INDEX idx_inventory_card_code ON gift_card_inventory(card_code);
CREATE INDEX idx_inventory_recipient ON gift_card_inventory(assigned_to_recipient_id) 
  WHERE assigned_to_recipient_id IS NOT NULL;
CREATE INDEX idx_inventory_campaign ON gift_card_inventory(assigned_to_campaign_id)
  WHERE assigned_to_campaign_id IS NOT NULL;
CREATE INDEX idx_inventory_upload_batch ON gift_card_inventory(upload_batch_id)
  WHERE upload_batch_id IS NOT NULL;

COMMENT ON TABLE gift_card_inventory IS 'Inventory of uploaded gift card codes. System uses these before purchasing from Tillo.';

-- =====================================================
-- 4. CLIENT_AVAILABLE_GIFT_CARDS TABLE
-- =====================================================
-- Tracks which brand-denomination combinations each client has enabled

CREATE TABLE client_available_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id) ON DELETE CASCADE,
  denomination NUMERIC(10,2) NOT NULL,
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique combinations per client
  UNIQUE(client_id, brand_id, denomination)
);

CREATE INDEX idx_client_giftcards_client ON client_available_gift_cards(client_id);
CREATE INDEX idx_client_giftcards_brand ON client_available_gift_cards(brand_id);
CREATE INDEX idx_client_giftcards_enabled ON client_available_gift_cards(is_enabled) 
  WHERE is_enabled = true;

DROP TRIGGER IF EXISTS update_client_available_gift_cards_updated_at ON client_available_gift_cards;
CREATE TRIGGER update_client_available_gift_cards_updated_at
  BEFORE UPDATE ON client_available_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE client_available_gift_cards IS 'Defines which gift card options each client can use in their campaigns.';

-- =====================================================
-- 5. AGENCY_AVAILABLE_GIFT_CARDS TABLE
-- =====================================================
-- Tracks which brand-denomination combinations each agency offers

CREATE TABLE agency_available_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id) ON DELETE CASCADE,
  denomination NUMERIC(10,2) NOT NULL,
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique combinations per agency
  UNIQUE(agency_id, brand_id, denomination)
);

CREATE INDEX idx_agency_giftcards_agency ON agency_available_gift_cards(agency_id);
CREATE INDEX idx_agency_giftcards_brand ON agency_available_gift_cards(brand_id);
CREATE INDEX idx_agency_giftcards_enabled ON agency_available_gift_cards(is_enabled) 
  WHERE is_enabled = true;

DROP TRIGGER IF EXISTS update_agency_available_gift_cards_updated_at ON agency_available_gift_cards;
CREATE TRIGGER update_agency_available_gift_cards_updated_at
  BEFORE UPDATE ON agency_available_gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE agency_available_gift_cards IS 'Defines which gift card options each agency offers to their clients.';

-- =====================================================
-- 6. GIFT_CARD_BILLING_LEDGER TABLE
-- =====================================================
-- Immutable ledger of all gift card transactions and billing

CREATE TABLE gift_card_billing_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction type
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'purchase_from_inventory', -- Used uploaded card
    'purchase_from_tillo',     -- Bought from Tillo API
    'refund'                   -- Card refunded
  )),
  
  -- Billing entity
  billed_entity_type TEXT NOT NULL CHECK (billed_entity_type IN ('client', 'agency')),
  billed_entity_id UUID NOT NULL, -- client_id or agency_id
  
  -- Context
  campaign_id UUID REFERENCES campaigns(id),
  recipient_id UUID REFERENCES recipients(id),
  
  -- Gift card details
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  denomination NUMERIC(10,2) NOT NULL,
  
  -- Financial tracking
  amount_billed NUMERIC(10,2) NOT NULL CHECK (amount_billed >= 0),
  cost_basis NUMERIC(10,2) CHECK (cost_basis >= 0), -- What we paid for this card
  profit NUMERIC(10,2) GENERATED ALWAYS AS (amount_billed - COALESCE(cost_basis, 0)) STORED,
  
  -- Source tracking
  inventory_card_id UUID REFERENCES gift_card_inventory(id), -- If from uploaded inventory
  tillo_transaction_id TEXT, -- If from Tillo API
  tillo_order_reference TEXT,
  
  -- Timestamp
  billed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT
);

CREATE INDEX idx_billing_ledger_entity ON gift_card_billing_ledger(billed_entity_type, billed_entity_id);
CREATE INDEX idx_billing_ledger_campaign ON gift_card_billing_ledger(campaign_id) 
  WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_billing_ledger_brand ON gift_card_billing_ledger(brand_id);
CREATE INDEX idx_billing_ledger_date ON gift_card_billing_ledger(billed_at DESC);
CREATE INDEX idx_billing_ledger_type ON gift_card_billing_ledger(transaction_type);
CREATE INDEX idx_billing_ledger_inventory ON gift_card_billing_ledger(inventory_card_id)
  WHERE inventory_card_id IS NOT NULL;

COMMENT ON TABLE gift_card_billing_ledger IS 'Immutable ledger of all gift card transactions. Tracks billing, costs, and profit.';
COMMENT ON COLUMN gift_card_billing_ledger.billed_entity_type IS 'Who gets billed: client (default) or agency (if agency billing enabled)';
COMMENT ON COLUMN gift_card_billing_ledger.profit IS 'Automatically calculated: amount_billed - cost_basis';

-- =====================================================
-- 7. CAMPAIGN_GIFT_CARD_CONFIG TABLE
-- =====================================================
-- Defines which gift cards are used for each campaign condition

CREATE TABLE campaign_gift_card_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Gift card selection
  brand_id UUID NOT NULL REFERENCES gift_card_brands(id),
  denomination NUMERIC(10,2) NOT NULL,
  
  -- Condition linkage
  condition_number INTEGER NOT NULL CHECK (condition_number > 0 AND condition_number <= 3),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one gift card per condition per campaign
  UNIQUE(campaign_id, condition_number)
);

CREATE INDEX idx_campaign_giftcard_campaign ON campaign_gift_card_config(campaign_id);
CREATE INDEX idx_campaign_giftcard_brand ON campaign_gift_card_config(brand_id);

DROP TRIGGER IF EXISTS update_campaign_gift_card_config_updated_at ON campaign_gift_card_config;
CREATE TRIGGER update_campaign_gift_card_config_updated_at
  BEFORE UPDATE ON campaign_gift_card_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE campaign_gift_card_config IS 'Links campaigns to specific gift cards for each condition trigger.';

-- =====================================================
-- 8. AGENCY BILLING CONFIGURATION
-- =====================================================
-- Add agency billing flag to clients table

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS agency_billing_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN clients.agency_billing_enabled IS 'When true, the agency is billed for gift cards instead of the client';

-- Add agency markup configuration
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS gift_card_markup_percentage NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_agencies_updated_at ON agencies;
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN agencies.gift_card_markup_percentage IS 'Markup percentage agency charges on top of base gift card cost';

-- =====================================================
-- SUMMARY
-- =====================================================
-- Tables created:
-- 1. Enhanced gift_card_brands (existing table with new columns)
-- 2. gift_card_denominations (NEW)
-- 3. gift_card_inventory (NEW)
-- 4. client_available_gift_cards (NEW)
-- 5. agency_available_gift_cards (NEW)
-- 6. gift_card_billing_ledger (NEW)
-- 7. campaign_gift_card_config (NEW)
--
-- Enhanced existing tables:
-- - clients (added agency_billing_enabled)
-- - agencies (added gift_card_markup_percentage)

