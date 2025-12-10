-- Add new branding fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS font_preferences JSONB DEFAULT '{"heading": "Inter", "body": "Inter"}'::jsonb;

-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for client logos bucket
CREATE POLICY "Anyone can view client logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated users can upload client logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-logos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update client logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'client-logos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete client logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'client-logos' AND
    auth.uid() IS NOT NULL
  );