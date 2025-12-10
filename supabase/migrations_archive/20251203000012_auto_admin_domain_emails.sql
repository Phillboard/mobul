-- Auto-assign admin role for Mobul.com and Fuelreset.com email domains
-- When a user signs up and confirms their email with these domains, they get admin role

-- Update the handle_new_user function to auto-assign admin role for specific domains
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Create profile for the new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Extract email domain (case insensitive)
  email_domain := LOWER(SPLIT_PART(NEW.email, '@', 2));
  
  -- Auto-assign admin role for Mobul.com or Fuelreset.com domains
  IF email_domain = 'mobul.com' OR email_domain = 'fuelreset.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE LOG 'Auto-assigned admin role to user % with email %', NEW.id, NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add a comment explaining the auto-admin behavior
COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates profile for new users. Auto-assigns admin role for users with @mobul.com or @fuelreset.com email domains.';


