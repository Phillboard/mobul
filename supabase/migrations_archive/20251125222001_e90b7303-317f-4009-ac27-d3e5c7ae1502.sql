-- Create mail_provider_settings table
CREATE TABLE public.mail_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Can be set at org level (agency) or client level
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Provider configuration
  provider_type TEXT NOT NULL CHECK (provider_type IN ('postgrid', 'custom', 'both')),
  
  -- PostGrid configuration
  postgrid_enabled BOOLEAN DEFAULT true,
  postgrid_test_mode BOOLEAN DEFAULT true,
  postgrid_api_key_name TEXT, -- References secret name in Supabase secrets
  
  -- Custom mailhouse configuration
  custom_enabled BOOLEAN DEFAULT false,
  custom_webhook_url TEXT,
  custom_webhook_secret_name TEXT, -- References secret name in Supabase secrets
  custom_provider_name TEXT,
  custom_auth_type TEXT CHECK (custom_auth_type IN ('api_key', 'basic', 'bearer', 'custom_header', 'none')),
  custom_auth_header_name TEXT,
  
  -- Agency controls (only for org-level settings)
  allow_clients_postgrid BOOLEAN DEFAULT true,
  allow_clients_custom BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id),
  
  -- Constraint: must be either org or client, not both
  CONSTRAINT org_or_client CHECK (
    (org_id IS NOT NULL AND client_id IS NULL) OR 
    (org_id IS NULL AND client_id IS NOT NULL)
  )
);

-- Indexes for lookups
CREATE INDEX idx_mail_provider_org ON public.mail_provider_settings(org_id);
CREATE INDEX idx_mail_provider_client ON public.mail_provider_settings(client_id);

-- Enable RLS
ALTER TABLE public.mail_provider_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all settings
CREATE POLICY "Admins can manage all mail provider settings"
  ON public.mail_provider_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Agency owners can manage their org settings
CREATE POLICY "Agency owners can manage org mail provider settings"
  ON public.mail_provider_settings
  FOR ALL
  USING (
    org_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      JOIN public.user_roles ur ON ur.user_id = om.user_id
      WHERE om.org_id = mail_provider_settings.org_id
        AND om.user_id = auth.uid()
        AND ur.role = 'agency_owner'
    )
  );

-- Clients can view and edit their own settings (if they have permission)
CREATE POLICY "Clients can manage their mail provider settings"
  ON public.mail_provider_settings
  FOR ALL
  USING (
    client_id IS NOT NULL
    AND user_can_access_client(auth.uid(), client_id)
  );

-- Create mail_submissions audit table
CREATE TABLE public.mail_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  provider_type TEXT NOT NULL,
  provider_name TEXT,
  
  -- Request details
  recipient_count INTEGER NOT NULL,
  request_payload JSONB,
  
  -- Response details
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'processing', 'completed', 'failed', 'cancelled')),
  provider_job_id TEXT,
  response_payload JSONB,
  error_message TEXT,
  
  -- Timing
  submitted_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Cost tracking
  estimated_cost_cents INTEGER,
  actual_cost_cents INTEGER,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_mail_submissions_campaign ON public.mail_submissions(campaign_id);
CREATE INDEX idx_mail_submissions_client ON public.mail_submissions(client_id);
CREATE INDEX idx_mail_submissions_status ON public.mail_submissions(status);
CREATE INDEX idx_mail_submissions_submitted_at ON public.mail_submissions(submitted_at);

-- Enable RLS
ALTER TABLE public.mail_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mail_submissions
CREATE POLICY "Admins can view all mail submissions"
  ON public.mail_submissions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view mail submissions for accessible clients"
  ON public.mail_submissions
  FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "System can insert mail submissions"
  ON public.mail_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update mail submissions"
  ON public.mail_submissions
  FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_mail_provider_settings_updated_at
  BEFORE UPDATE ON public.mail_provider_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mail_submissions_updated_at
  BEFORE UPDATE ON public.mail_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();