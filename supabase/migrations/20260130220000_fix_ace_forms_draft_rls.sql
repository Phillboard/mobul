-- Fix ACE Forms RLS policy to exclude draft forms from public access
-- This ensures that forms with is_draft=true are not accessible to anonymous users
-- Authenticated users with client access can still view draft forms via the separate client access policy

-- Drop the existing public access policy
DROP POLICY IF EXISTS "Allow public access to active forms" ON ace_forms;

-- Create new policy that checks both is_active AND is_draft
-- The is_draft IS NULL check handles legacy forms that may have NULL value
CREATE POLICY "Allow public access to published forms"
ON ace_forms FOR SELECT
TO anon, authenticated
USING ((is_active = true) AND (is_draft = false OR is_draft IS NULL));

-- Add comment explaining the policy
COMMENT ON POLICY "Allow public access to published forms" ON ace_forms IS 
'Allows anonymous and authenticated users to view forms that are both active AND not drafts. 
Authenticated users with client access can still view draft forms via the separate client access policy.';
