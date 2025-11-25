-- Fix search_path security warning on generate_customer_code function
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search_path security warning on set_customer_code function
CREATE OR REPLACE FUNCTION set_customer_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$;