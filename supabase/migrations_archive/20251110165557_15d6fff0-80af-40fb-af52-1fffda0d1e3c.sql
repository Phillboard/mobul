-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true);

-- Create RLS policies for qr-codes bucket
CREATE POLICY "Users can view QR codes for accessible campaigns"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'qr-codes' 
  AND (
    -- Extract campaign_id from path: qr-codes/{campaign_id}/{recipient_id}.png
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id::text = split_part(name, '/', 1)
        AND user_can_access_client(auth.uid(), c.client_id)
    )
  )
);

CREATE POLICY "Service role can insert QR codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'qr-codes');