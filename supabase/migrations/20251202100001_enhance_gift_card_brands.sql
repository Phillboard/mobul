-- =====================================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- =====================================================
-- Complete migration script for Gift Card Brand Management System
-- Combines schema enhancements and storage bucket creation
-- =====================================================

-- PART 1: ENHANCE GIFT CARD BRANDS TABLE
-- =====================================================

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

-- =====================================================
-- PART 2: CREATE STORAGE BUCKET FOR BRAND LOGOS
-- =====================================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gift-card-brand-logos',
  'gift-card-brand-logos',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

-- Allow authenticated users to upload logos
DROP POLICY IF EXISTS "Authenticated users can upload brand logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload brand logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gift-card-brand-logos');

-- Allow authenticated users to update their uploaded logos
DROP POLICY IF EXISTS "Authenticated users can update brand logos" ON storage.objects;
CREATE POLICY "Authenticated users can update brand logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gift-card-brand-logos');

-- Allow authenticated users to delete logos
DROP POLICY IF EXISTS "Authenticated users can delete brand logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete brand logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gift-card-brand-logos');

-- Allow anyone to read logos (public bucket)
DROP POLICY IF EXISTS "Anyone can view brand logos" ON storage.objects;
CREATE POLICY "Anyone can view brand logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gift-card-brand-logos');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that new columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'gift_card_brands'
  AND column_name IN ('website_url', 'description', 'terms_url', 'brand_colors', 'metadata_source')
ORDER BY column_name;

-- Check that storage bucket was created
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
FROM storage.buckets
WHERE id = 'gift-card-brand-logos';

-- Check storage policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%brand logo%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ gift_card_brands table enhanced with new columns';
  RAISE NOTICE '✅ Storage bucket gift-card-brand-logos created';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test adding Starbucks brand (should auto-detect)';
  RAISE NOTICE '2. Test adding custom brand with logo upload';
END $$;

