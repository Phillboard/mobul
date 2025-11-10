-- Create storage bucket for template thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-thumbnails', 'template-thumbnails', true);

-- Create RLS policies for template thumbnails
CREATE POLICY "Users can view template thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'template-thumbnails');

CREATE POLICY "Users can upload their own template thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'template-thumbnails' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own template thumbnails"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'template-thumbnails' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own template thumbnails"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'template-thumbnails' AND
  auth.uid() IS NOT NULL
);

-- Add favorite flag to templates table
ALTER TABLE public.templates
ADD COLUMN is_favorite BOOLEAN DEFAULT false;