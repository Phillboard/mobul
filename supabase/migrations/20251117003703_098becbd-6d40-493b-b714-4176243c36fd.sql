-- Fix security issues: Enable RLS on role_hierarchy and add policies

-- Enable RLS on role_hierarchy (it's a reference table, everyone can read)
ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read role hierarchy (it's just metadata)
CREATE POLICY "Anyone can view role hierarchy"
  ON public.role_hierarchy FOR SELECT
  USING (true);

-- Check for other tables with RLS but no policies and add them
-- Admin impersonations table policies
CREATE POLICY "Admins can view all impersonations"
  ON public.admin_impersonations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert impersonations"
  ON public.admin_impersonations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update impersonations"  
  ON public.admin_impersonations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));