-- Fix RLS policies for sms_delivery_log table
-- Ensure service_role can always insert/update/delete

-- Drop existing policies if they exist and recreate them properly
DROP POLICY IF EXISTS "Service role has full access to sms delivery log" ON public.sms_delivery_log;
DROP POLICY IF EXISTS "System can insert SMS logs" ON public.sms_delivery_log;
DROP POLICY IF EXISTS "System can update SMS logs" ON public.sms_delivery_log;

-- Create a proper service role policy with full access
CREATE POLICY "Service role has full access to sms delivery log" 
ON public.sms_delivery_log 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create permissive insert policy for authenticated users (edge functions)
CREATE POLICY "Authenticated users can insert SMS logs" 
ON public.sms_delivery_log 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create permissive update policy for authenticated users
CREATE POLICY "Authenticated users can update SMS logs" 
ON public.sms_delivery_log 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Also allow anon role for edge functions that might use anon key
CREATE POLICY "Anon can insert SMS logs" 
ON public.sms_delivery_log 
FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Anon can update SMS logs" 
ON public.sms_delivery_log 
FOR UPDATE 
TO anon 
USING (true)
WITH CHECK (true);
