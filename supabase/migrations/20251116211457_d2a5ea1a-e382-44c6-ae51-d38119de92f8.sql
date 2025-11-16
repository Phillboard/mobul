-- Create admin impersonations tracking table
CREATE TABLE IF NOT EXISTS public.admin_impersonations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_impersonations ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage impersonations
CREATE POLICY "Platform admins can manage impersonations"
ON public.admin_impersonations FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Create index for performance
CREATE INDEX idx_admin_impersonations_admin_user ON public.admin_impersonations(admin_user_id);
CREATE INDEX idx_admin_impersonations_impersonated_user ON public.admin_impersonations(impersonated_user_id);
CREATE INDEX idx_admin_impersonations_active ON public.admin_impersonations(ended_at) WHERE ended_at IS NULL;