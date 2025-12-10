-- Phase 1: Add brand_id and automation fields to gift_card_pools
ALTER TABLE gift_card_pools 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES gift_card_brands(id),
ADD COLUMN IF NOT EXISTS auto_balance_check BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS balance_check_frequency_hours INTEGER DEFAULT 168,
ADD COLUMN IF NOT EXISTS last_auto_balance_check TIMESTAMPTZ;

-- Add notes and tags to gift_cards for lifecycle tracking
ALTER TABLE gift_cards
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Insert Mobul Gift Cards brand
INSERT INTO gift_card_brands (
  brand_code,
  brand_name,
  provider,
  category,
  balance_check_enabled,
  typical_denominations,
  is_active
) VALUES (
  'mobul',
  'Mobul Gift Cards',
  'csv_only',
  'multi_category',
  false,
  '[5, 10, 15, 25, 50, 100]'::jsonb,
  true
) ON CONFLICT (brand_code) DO NOTHING;

-- Create index for better performance on brand lookups
CREATE INDEX IF NOT EXISTS idx_gift_card_pools_brand_id ON gift_card_pools(brand_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_tags ON gift_cards USING GIN(tags);

-- Update existing pools to link to brands based on provider field
UPDATE gift_card_pools gcp
SET brand_id = (
  SELECT gcb.id 
  FROM gift_card_brands gcb 
  WHERE gcb.provider = gcp.provider 
  OR (gcp.provider IS NULL AND gcb.brand_code = 'mobul')
  LIMIT 1
)
WHERE brand_id IS NULL;