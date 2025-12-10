-- Migration: Backfill unique codes for contacts
-- Ensures every contact has a unique customer_code

-- Step 1: Find and log contacts without codes
DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.contacts
  WHERE customer_code IS NULL OR customer_code = '';
  
  RAISE NOTICE 'Found % contacts without customer_code', missing_count;
END $$;

-- Step 2: Generate codes for any contacts missing them
UPDATE public.contacts
SET customer_code = generate_customer_code()
WHERE customer_code IS NULL OR customer_code = '';

-- Step 3: Verify all contacts now have codes
DO $$
DECLARE
  remaining_missing integer;
BEGIN
  SELECT COUNT(*) INTO remaining_missing
  FROM public.contacts
  WHERE customer_code IS NULL OR customer_code = '';
  
  IF remaining_missing > 0 THEN
    RAISE EXCEPTION 'Still have % contacts without customer_code after backfill', remaining_missing;
  END IF;
  
  RAISE NOTICE 'Successfully backfilled all customer codes';
END $$;

-- Step 4: Now make customer_code NOT NULL
ALTER TABLE public.contacts 
ALTER COLUMN customer_code SET NOT NULL;

-- Step 5: Verify uniqueness within each client
DO $$
DECLARE
  duplicate_count integer;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT client_id, customer_code, COUNT(*) as cnt
    FROM public.contacts
    GROUP BY client_id, customer_code
    HAVING COUNT(*) > 1
  ) AS duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Found % duplicate customer_code values within clients. These need to be resolved.', duplicate_count;
    
    -- Log the duplicates for manual review
    RAISE NOTICE 'Duplicate codes:';
    FOR rec IN (
      SELECT client_id, customer_code, COUNT(*) as cnt
      FROM public.contacts
      GROUP BY client_id, customer_code
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 10
    ) LOOP
      RAISE NOTICE '  Client: %, Code: %, Count: %', rec.client_id, rec.customer_code, rec.cnt;
    END LOOP;
  ELSE
    RAISE NOTICE 'No duplicate codes found. All customer codes are unique within their clients.';
  END IF;
END $$;

-- Step 6: Add audit logging for code changes
CREATE TABLE IF NOT EXISTS public.contact_code_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  old_code text,
  new_code text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  reason text
);

CREATE INDEX idx_contact_code_audit_contact ON public.contact_code_audit(contact_id);
CREATE INDEX idx_contact_code_audit_date ON public.contact_code_audit(changed_at);

-- Enable RLS
ALTER TABLE public.contact_code_audit ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit table
CREATE POLICY "Users can view code audit for accessible clients"
  ON public.contact_code_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = contact_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Step 7: Create trigger to log code changes
CREATE OR REPLACE FUNCTION log_customer_code_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.customer_code IS DISTINCT FROM NEW.customer_code THEN
    INSERT INTO public.contact_code_audit (
      contact_id,
      old_code,
      new_code,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.customer_code,
      NEW.customer_code,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_log_code_change
  AFTER UPDATE ON public.contacts
  FOR EACH ROW
  WHEN (OLD.customer_code IS DISTINCT FROM NEW.customer_code)
  EXECUTE FUNCTION log_customer_code_change();

-- Step 8: Add function to migrate a contact's code safely
CREATE OR REPLACE FUNCTION migrate_contact_code(
  contact_uuid uuid,
  new_code text,
  migration_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_client_id uuid;
  code_is_unique boolean;
BEGIN
  -- Get the contact's client_id
  SELECT client_id INTO contact_client_id
  FROM public.contacts
  WHERE id = contact_uuid;
  
  IF contact_client_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found: %', contact_uuid;
  END IF;
  
  -- Check if new code is unique for this client
  SELECT is_code_unique_for_client(new_code, contact_client_id, contact_uuid) 
  INTO code_is_unique;
  
  IF NOT code_is_unique THEN
    RAISE EXCEPTION 'Code % is already in use for this client', new_code;
  END IF;
  
  -- Validate format
  IF NOT validate_unique_code_format(new_code) THEN
    RAISE EXCEPTION 'Invalid code format: %', new_code;
  END IF;
  
  -- Update the contact
  UPDATE public.contacts
  SET customer_code = new_code
  WHERE id = contact_uuid;
  
  -- Log the reason if provided
  IF migration_reason IS NOT NULL THEN
    UPDATE public.contact_code_audit
    SET reason = migration_reason
    WHERE contact_id = contact_uuid
      AND new_code = new_code
      AND changed_at = (
        SELECT MAX(changed_at)
        FROM public.contact_code_audit
        WHERE contact_id = contact_uuid
      );
  END IF;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION migrate_contact_code IS 
'Safely migrate a contact''s unique code with validation and audit logging';

