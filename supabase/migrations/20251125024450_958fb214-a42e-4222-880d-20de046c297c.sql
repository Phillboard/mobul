-- Add unique customer code to contacts table
ALTER TABLE public.contacts 
ADD COLUMN customer_code text;

-- Create unique index on customer_code
CREATE UNIQUE INDEX contacts_customer_code_key ON public.contacts(customer_code);

-- Function to generate unique customer codes
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate format: ABC-1234 (3 letters + 4 digits)
    new_code := upper(substring(md5(random()::text) from 1 for 3)) || '-' || 
                lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM contacts WHERE customer_code = new_code) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate customer_code on insert if not provided
CREATE OR REPLACE FUNCTION set_customer_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_code IS NULL THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_set_customer_code
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_code();

-- Backfill existing contacts with customer codes
UPDATE public.contacts
SET customer_code = generate_customer_code()
WHERE customer_code IS NULL;