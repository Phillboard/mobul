-- ============================================================================
-- Setup Designer Storage Buckets
-- ============================================================================
-- Run this in Supabase SQL Editor to create the required storage buckets
-- for the Designer system (user uploads and AI-generated backgrounds).
--
-- To run: Go to Supabase Dashboard > SQL Editor > New Query > Paste & Run
-- ============================================================================

-- Create 'designs' bucket for user-uploaded backgrounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'designs',
  'designs',
  true,
  10485760,  -- 10MB
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
  true,
  20971520,  -- 20MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ============================================================================
-- Policies for 'designs' bucket
-- ============================================================================

-- Public read access
CREATE POLICY IF NOT EXISTS "Public read designs"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs');

-- Authenticated upload
CREATE POLICY IF NOT EXISTS "Auth upload designs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designs');

-- ============================================================================
-- Policies for 'designer-backgrounds' bucket
-- ============================================================================

-- Public read access
CREATE POLICY IF NOT EXISTS "Public read designer-backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'designer-backgrounds');

-- Service role full access (for edge function)
CREATE POLICY IF NOT EXISTS "Service role access designer-backgrounds"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'designer-backgrounds');

-- Authenticated upload
CREATE POLICY IF NOT EXISTS "Auth upload designer-backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designer-backgrounds');

-- ============================================================================
-- Verify buckets were created
-- ============================================================================
SELECT id, name, public, file_size_limit FROM storage.buckets 
WHERE id IN ('designs', 'designer-backgrounds');

