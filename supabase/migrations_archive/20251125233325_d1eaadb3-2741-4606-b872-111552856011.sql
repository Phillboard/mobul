-- Add public access policy for active ACE forms
-- This allows forms to be embedded on external websites without authentication
CREATE POLICY "Allow public access to active forms"
ON ace_forms
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Update form submissions to allow anonymous submissions
DROP POLICY IF EXISTS "Users can create submissions for forms they can access" ON ace_form_submissions;

CREATE POLICY "Allow public form submissions"
ON ace_form_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);