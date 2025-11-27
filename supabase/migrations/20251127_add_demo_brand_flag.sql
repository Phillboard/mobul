-- Add demo brand flag to distinguish fake brands from real brands
-- This allows us to filter out demo data before production launch

ALTER TABLE gift_card_brands 
ADD COLUMN IF NOT EXISTS is_demo_brand BOOLEAN DEFAULT false;

-- Update existing brands to mark as production (real brands)
UPDATE gift_card_brands SET is_demo_brand = false WHERE is_demo_brand IS NULL;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_gift_card_brands_is_demo 
ON gift_card_brands(is_demo_brand);

-- Add comment
COMMENT ON COLUMN gift_card_brands.is_demo_brand IS 
'Flag to identify demo/test brands. True = fake brand for testing, False = real brand for production';

