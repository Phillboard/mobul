-- Create enums for campaign schema
CREATE TYPE public.template_size AS ENUM ('4x6', '6x9', '6x11', 'letter', 'trifold');
CREATE TYPE public.audience_source AS ENUM ('import', 'purchase', 'manual');
CREATE TYPE public.audience_status AS ENUM ('processing', 'ready', 'failed');
CREATE TYPE public.validation_status AS ENUM ('valid', 'invalid', 'suppressed');
CREATE TYPE public.postage_class AS ENUM ('first_class', 'standard');
CREATE TYPE public.lp_mode AS ENUM ('bridge', 'redirect');
CREATE TYPE public.campaign_status AS ENUM ('draft', 'proofed', 'in_production', 'mailed', 'completed');
CREATE TYPE public.batch_status AS ENUM ('pending', 'printing', 'mailed', 'delivered');

-- Create templates table
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  size public.template_size NOT NULL,
  json_layers JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  industry_vertical public.industry_type,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Create audiences table
CREATE TABLE public.audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  source public.audience_source NOT NULL DEFAULT 'manual',
  total_count INTEGER DEFAULT 0,
  valid_count INTEGER DEFAULT 0,
  invalid_count INTEGER DEFAULT 0,
  hygiene_json JSONB DEFAULT '{}'::jsonb,
  suppressed_json JSONB DEFAULT '{}'::jsonb,
  status public.audience_status DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audiences ENABLE ROW LEVEL SECURITY;

-- Create recipients table
CREATE TABLE public.recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id UUID REFERENCES public.audiences(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  address1 TEXT NOT NULL,
  address2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  zip4 TEXT,
  email TEXT,
  phone TEXT,
  token TEXT UNIQUE NOT NULL,
  geocode_json JSONB DEFAULT '{}'::jsonb,
  validation_status public.validation_status DEFAULT 'valid',
  validation_details_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  audience_id UUID REFERENCES public.audiences(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  size public.template_size NOT NULL,
  postage public.postage_class DEFAULT 'standard',
  vendor TEXT,
  lp_mode public.lp_mode DEFAULT 'bridge',
  base_lp_url TEXT,
  utm_source TEXT DEFAULT 'directmail',
  utm_medium TEXT DEFAULT 'postcard',
  utm_campaign TEXT,
  status public.campaign_status DEFAULT 'draft',
  mail_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create print_batches table
CREATE TABLE public.print_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  vendor TEXT NOT NULL,
  batch_number INTEGER NOT NULL,
  pdf_url TEXT,
  recipient_count INTEGER DEFAULT 0,
  status public.batch_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.print_batches ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_recipients_token ON public.recipients(token);
CREATE INDEX idx_recipients_audience_id ON public.recipients(audience_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_client_id ON public.campaigns(client_id);
CREATE INDEX idx_audiences_client_id ON public.audiences(client_id);
CREATE INDEX idx_templates_client_id ON public.templates(client_id);
CREATE INDEX idx_print_batches_campaign_id ON public.print_batches(campaign_id);

-- Helper function to check client access for RLS
CREATE OR REPLACE FUNCTION public.user_can_access_client(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Org admins can access all clients
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'org_admin'
    )
    OR
    -- Agency admins can access clients in their orgs
    EXISTS (
      SELECT 1 
      FROM public.clients c
      JOIN public.org_members om ON om.org_id = c.org_id
      WHERE c.id = _client_id 
        AND om.user_id = _user_id
        AND om.role = 'agency_admin'
    )
    OR
    -- Client users can access their assigned clients
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = _client_id AND cu.user_id = _user_id
    )
$$;

-- RLS Policies for templates
CREATE POLICY "Users can view templates for accessible clients"
  ON public.templates
  FOR SELECT
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create templates for accessible clients"
  ON public.templates
  FOR INSERT
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update templates for accessible clients"
  ON public.templates
  FOR UPDATE
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete templates for accessible clients"
  ON public.templates
  FOR DELETE
  USING (public.user_can_access_client(auth.uid(), client_id));

-- RLS Policies for audiences
CREATE POLICY "Users can view audiences for accessible clients"
  ON public.audiences
  FOR SELECT
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create audiences for accessible clients"
  ON public.audiences
  FOR INSERT
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update audiences for accessible clients"
  ON public.audiences
  FOR UPDATE
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete audiences for accessible clients"
  ON public.audiences
  FOR DELETE
  USING (public.user_can_access_client(auth.uid(), client_id));

-- RLS Policies for recipients (access through audience -> client relationship)
CREATE POLICY "Users can view recipients for accessible audiences"
  ON public.recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = audience_id
        AND public.user_can_access_client(auth.uid(), a.client_id)
    )
  );

CREATE POLICY "Users can create recipients for accessible audiences"
  ON public.recipients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = audience_id
        AND public.user_can_access_client(auth.uid(), a.client_id)
    )
  );

CREATE POLICY "Users can update recipients for accessible audiences"
  ON public.recipients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = audience_id
        AND public.user_can_access_client(auth.uid(), a.client_id)
    )
  );

CREATE POLICY "Users can delete recipients for accessible audiences"
  ON public.recipients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.audiences a
      WHERE a.id = audience_id
        AND public.user_can_access_client(auth.uid(), a.client_id)
    )
  );

-- RLS Policies for campaigns
CREATE POLICY "Users can view campaigns for accessible clients"
  ON public.campaigns
  FOR SELECT
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create campaigns for accessible clients"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update campaigns for accessible clients"
  ON public.campaigns
  FOR UPDATE
  USING (public.user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete campaigns for accessible clients"
  ON public.campaigns
  FOR DELETE
  USING (public.user_can_access_client(auth.uid(), client_id));

-- RLS Policies for print_batches (access through campaign -> client relationship)
CREATE POLICY "Users can view print batches for accessible campaigns"
  ON public.print_batches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND public.user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can create print batches for accessible campaigns"
  ON public.print_batches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND public.user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "Users can update print batches for accessible campaigns"
  ON public.print_batches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id
        AND public.user_can_access_client(auth.uid(), c.client_id)
    )
  );

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_print_batches_updated_at
  BEFORE UPDATE ON public.print_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique token for recipients
CREATE OR REPLACE FUNCTION public.generate_recipient_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    -- Generate 12 character random alphanumeric token
    token := encode(gen_random_bytes(9), 'base64');
    token := REPLACE(token, '/', '');
    token := REPLACE(token, '+', '');
    token := REPLACE(token, '=', '');
    token := SUBSTRING(token, 1, 12);
    
    -- Check if token already exists
    IF NOT EXISTS (SELECT 1 FROM public.recipients WHERE recipients.token = token) THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql VOLATILE;