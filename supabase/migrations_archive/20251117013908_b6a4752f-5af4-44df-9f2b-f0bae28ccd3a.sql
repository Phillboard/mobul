-- Fix security issues identified by linter

-- 1. Add search_path to functions that are missing it
CREATE OR REPLACE FUNCTION public.generate_recipient_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  token TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    token := encode(extensions.gen_random_bytes(9), 'base64');
    token := REPLACE(token, '/', '');
    token := REPLACE(token, '+', '');
    token := REPLACE(token, '=', '');
    token := SUBSTRING(token, 1, 12);
    
    IF NOT EXISTS (SELECT 1 FROM public.recipients WHERE recipients.token = token) THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$function$;

-- 2. Add RLS policies for tables with RLS enabled but no policies
-- Find tables with RLS enabled but no policies and add basic policies

-- Policy for role_hierarchy table (if it exists and has RLS enabled)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'role_hierarchy'
  ) THEN
    -- Allow all authenticated users to read role hierarchy
    DROP POLICY IF EXISTS "Allow read access to role hierarchy" ON public.role_hierarchy;
    CREATE POLICY "Allow read access to role hierarchy"
      ON public.role_hierarchy
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Policy for permission_templates table
DROP POLICY IF EXISTS "Allow read access to permission templates" ON public.permission_templates;
CREATE POLICY "Allow read access to permission templates"
  ON public.permission_templates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage permission templates" ON public.permission_templates;
CREATE POLICY "Admins can manage permission templates"
  ON public.permission_templates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy for user_permissions table
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all user permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage all user permissions"
  ON public.user_permissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));