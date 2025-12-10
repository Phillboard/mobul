-- ============================================================================
-- Create Storage Buckets for Designer System
-- ============================================================================
-- This migration creates the storage buckets needed for:
-- 1. designs - User-uploaded background images
-- 2. designer-backgrounds - AI-generated background images
-- ============================================================================

-- Create 'designs' bucket for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'designs',
  'designs',
  true,  -- Public access for canvas rendering
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Create 'designer-backgrounds' bucket for AI-generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'designer-backgrounds',
  'designer-backgrounds',
  true,  -- Public access for canvas rendering
  20971520,  -- 20MB max file size (AI images can be larger)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ============================================================================
-- Storage Policies for 'designs' bucket
-- ============================================================================

-- Allow anyone to view images (needed for canvas rendering)
DROP POLICY IF EXISTS "Public read access for designs" ON storage.objects;
CREATE POLICY "Public read access for designs"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload designs" ON storage.objects;
CREATE POLICY "Authenticated users can upload designs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designs');

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update own design uploads" ON storage.objects;
CREATE POLICY "Users can update own design uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'designs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own design uploads" ON storage.objects;
CREATE POLICY "Users can delete own design uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'designs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- Storage Policies for 'designer-backgrounds' bucket
-- ============================================================================

-- Allow anyone to view AI-generated backgrounds (needed for canvas rendering)
DROP POLICY IF EXISTS "Public read access for designer backgrounds" ON storage.objects;
CREATE POLICY "Public read access for designer backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'designer-backgrounds');

-- Allow authenticated users to upload (from edge function)
DROP POLICY IF EXISTS "Authenticated users can upload designer backgrounds" ON storage.objects;
CREATE POLICY "Authenticated users can upload designer backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designer-backgrounds');

-- Allow service role to upload (for edge function)
DROP POLICY IF EXISTS "Service role can upload designer backgrounds" ON storage.objects;
CREATE POLICY "Service role can upload designer backgrounds"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'designer-backgrounds');

-- Allow service role full access (for edge function operations)
DROP POLICY IF EXISTS "Service role full access to designer backgrounds" ON storage.objects;
CREATE POLICY "Service role full access to designer backgrounds"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'designer-backgrounds');

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;

