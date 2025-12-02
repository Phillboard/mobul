-- =====================================================
-- ENHANCE GIFT CARD BRANDS TABLE
-- =====================================================
-- Add optional metadata fields for comprehensive brand management
-- Required: brand_name, logo_url
-- Optional: website_url, description, terms_url, brand_colors, metadata_source

-- Add new optional fields to gift_card_brands
ALTER TABLE gift_card_brands 
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS terms_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_source TEXT DEFAULT 'manual' CHECK (metadata_source IN ('auto_lookup', 'manual', 'tillo'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gift_card_brands_metadata_source 
  ON gift_card_brands(metadata_source);

CREATE INDEX IF NOT EXISTS idx_gift_card_brands_website 
  ON gift_card_brands(website_url) WHERE website_url IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN gift_card_brands.website_url IS 'Official brand website URL';
COMMENT ON COLUMN gift_card_brands.description IS 'Brand description for display purposes';
COMMENT ON COLUMN gift_card_brands.terms_url IS 'URL to terms and conditions for this brand';
COMMENT ON COLUMN gift_card_brands.brand_colors IS 'JSON object with primary, secondary brand colors for UI theming';
COMMENT ON COLUMN gift_card_brands.metadata_source IS 'Source of brand metadata: auto_lookup (Clearbit), manual (user entered), or tillo (Tillo API)';

-- Create a function to generate brand_code from brand_name if not provided
CREATE OR REPLACE FUNCTION generate_brand_code_from_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.brand_code IS NULL OR NEW.brand_code = '' THEN
    NEW.brand_code := lower(regexp_replace(NEW.brand_name, '[^a-zA-Z0-9]+', '_', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate brand_code
DROP TRIGGER IF EXISTS generate_brand_code_trigger ON gift_card_brands;
CREATE TRIGGER generate_brand_code_trigger
  BEFORE INSERT ON gift_card_brands
  FOR EACH ROW
  EXECUTE FUNCTION generate_brand_code_from_name();

