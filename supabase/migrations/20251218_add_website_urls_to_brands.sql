-- Add website_url values to existing gift card brands
-- This helps the logo fallback system work better

-- Update common brands with their website URLs
UPDATE gift_card_brands 
SET website_url = 'amazon.com'
WHERE brand_code = 'amazon' AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'starbucks.com'
WHERE brand_code = 'starbucks' AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'target.com'
WHERE brand_code = 'target' AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'walmart.com'
WHERE brand_code = 'walmart' AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'visa.com'
WHERE brand_code = 'visa' AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'jimmyjohns.com'
WHERE brand_code = 'jimmyjohns' AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'dunkindonuts.com'
WHERE brand_code IN ('dunkin', 'dunkindonuts') AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'dominos.com'
WHERE brand_code = 'dominos' AND website_url IS NULL;

UPDATE gift_card_brands 
SET website_url = 'pizzahut.com'
WHERE brand_code = 'pizzahut' AND website_url IS NULL;

-- For brands without website_url, try to extract from logo_url
UPDATE gift_card_brands
SET website_url = 
  CASE 
    WHEN logo_url LIKE '%logo.clearbit.com/%' THEN 
      REPLACE(REPLACE(logo_url, 'https://logo.clearbit.com/', ''), 'http://logo.clearbit.com/', '')
    ELSE NULL
  END
WHERE website_url IS NULL 
  AND logo_url IS NOT NULL
  AND logo_url LIKE '%logo.clearbit.com/%';

-- Create index on website_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_gift_card_brands_website_url 
ON gift_card_brands(website_url) 
WHERE website_url IS NOT NULL;
