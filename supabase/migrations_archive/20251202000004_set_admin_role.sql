-- Create a function to set user as admin (bypasses RLS)
-- This function runs with elevated privileges

CREATE OR REPLACE FUNCTION public.set_user_as_admin(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Update the user's metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{app_role}',
    '"admin"'
  )
  WHERE email = user_email;
  
  GET DIAGNOSTICS user_count = ROW_COUNT;
  
  IF user_count = 0 THEN
    RETURN 'User not found with email: ' || user_email;
  ELSE
    RETURN 'Successfully set ' || user_email || ' as admin';
  END IF;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.set_user_as_admin TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_as_admin TO postgres;

COMMENT ON FUNCTION public.set_user_as_admin IS 'Sets a user as admin by email. Call with: SELECT set_user_as_admin(''your-email@example.com'');';

