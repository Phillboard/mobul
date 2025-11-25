-- Fix search_path security warning for trigger functions
DROP FUNCTION IF EXISTS update_contacts_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_contacts_timestamp
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();

CREATE TRIGGER update_contact_lists_timestamp
  BEFORE UPDATE ON public.contact_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_updated_at();