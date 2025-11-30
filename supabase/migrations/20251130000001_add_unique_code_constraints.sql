-- Migration: Add unique_code constraint and update existing customer_code implementation
-- This migration ensures unique_code integrity per client

-- Step 1: Rename customer_code to unique_code for clarity
-- Note: We're keeping customer_code column but making it the primary unique code field

-- Step 2: Add unique constraint scoped to client
-- Drop the global unique constraint
DROP INDEX IF EXISTS contacts_customer_code_key;

-- Add composite unique constraint per client
CREATE UNIQUE INDEX IF NOT EXISTS contacts_unique_code_per_client_key 
ON public.contacts(client_id, customer_code);

-- Step 3: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_customer_code 
ON public.contacts(customer_code);

-- Step 4: Update the trigger function to ensure customer_code is always set
CREATE OR REPLACE FUNCTION set_customer_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if null or empty
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Step 5: Make customer_code NOT NULL (after backfill)
-- This will be done in a separate migration after ensuring all records have codes

-- Step 6: Add validation function for unique codes
CREATE OR REPLACE FUNCTION validate_unique_code_format(code text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow alphanumeric with dashes and underscores, min 3 chars, max 50
  RETURN code IS NOT NULL 
    AND length(code) >= 3 
    AND length(code) <= 50
    AND code ~ '^[A-Za-z0-9][A-Za-z0-9\-_]+$';
END;
$$;

-- Step 7: Add check constraint for code format
ALTER TABLE public.contacts 
ADD CONSTRAINT customer_code_format_check 
CHECK (validate_unique_code_format(customer_code));

-- Step 8: Update RLS policies to include customer_code in relevant queries
-- (Existing RLS policies already use client_id, so they should work)

-- Step 9: Create helper function to check code uniqueness within client
CREATE OR REPLACE FUNCTION is_code_unique_for_client(code text, client_uuid uuid, exclude_contact_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM contacts 
    WHERE client_id = client_uuid 
      AND customer_code = code
      AND (exclude_contact_id IS NULL OR id != exclude_contact_id)
  ) INTO code_exists;
  
  RETURN NOT code_exists;
END;
$$;

-- Step 10: Add comment explaining the unique_code system
COMMENT ON COLUMN public.contacts.customer_code IS 
'Unique identifier for the contact within the client scope. Must be unique per client. Format: UC-{timestamp}-{random} or custom alphanumeric code.';

