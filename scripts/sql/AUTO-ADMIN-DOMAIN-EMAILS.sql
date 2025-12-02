-- ============================================================================
-- AUTO-ADMIN FOR MOBUL.COM AND FUELRESET.COM EMAIL DOMAINS
-- ============================================================================
-- This script updates the handle_new_user() trigger function to automatically
-- assign the admin role to any user who signs up with a @mobul.com or 
-- @fuelreset.com email address.
--
-- Run this script in Supabase SQL Editor to apply immediately.
-- ============================================================================

-- Update the handle_new_user function
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

COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates profile for new users. Auto-assigns admin role for users with @mobul.com or @fuelreset.com email domains.';

-- ============================================================================
-- OPTIONAL: Retroactively grant admin to existing users with these domains
-- ============================================================================
-- Uncomment and run this section if you want to grant admin to existing users
-- who already signed up with Mobul.com or Fuelreset.com emails

/*
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE LOWER(SPLIT_PART(p.email, '@', 2)) IN ('mobul.com', 'fuelreset.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  )
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- ============================================================================
-- VERIFICATION: Check the trigger is properly attached
-- ============================================================================
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE proname = 'handle_new_user';

-- Show the updated function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = 'public'::regnamespace;

