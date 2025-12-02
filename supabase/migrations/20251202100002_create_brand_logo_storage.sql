-- =====================================================
-- CREATE STORAGE BUCKET FOR BRAND LOGOS
-- =====================================================
-- Create public bucket for gift card brand logo uploads
-- Authenticated users can upload, anyone can read

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
CREATE POLICY "Authenticated users can upload brand logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gift-card-brand-logos');

-- Allow authenticated users to update their uploaded logos
CREATE POLICY "Authenticated users can update brand logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gift-card-brand-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete brand logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gift-card-brand-logos');

-- Allow anyone to read logos (public bucket)
CREATE POLICY "Anyone can view brand logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gift-card-brand-logos');

