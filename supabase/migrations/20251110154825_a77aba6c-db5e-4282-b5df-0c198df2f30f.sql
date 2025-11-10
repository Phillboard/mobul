-- Create organization type enum
CREATE TYPE public.org_type AS ENUM ('internal', 'agency');

-- Create industry enum for clients
CREATE TYPE public.industry_type AS ENUM ('roofing', 'rei', 'auto_service', 'auto_warranty', 'auto_buyback');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.org_type NOT NULL DEFAULT 'agency',
  settings_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  industry public.industry_type NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  logo_url TEXT,
  brand_colors_json JSONB DEFAULT '{}'::jsonb,
  api_key_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create org_members junction table
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Create client_users junction table
CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, user_id)
);

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- Helper functions for access control
CREATE OR REPLACE FUNCTION public.user_has_org_access(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE org_id = _org_id
      AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_users
    WHERE client_id = _client_id
      AND user_id = _user_id
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Org admins can view all organizations"
  ON public.organizations
  FOR SELECT
  USING (public.has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Users can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (public.user_has_org_access(auth.uid(), id));

CREATE POLICY "Org admins can manage organizations"
  ON public.organizations
  FOR ALL
  USING (public.has_role(auth.uid(), 'org_admin'));

-- RLS Policies for clients
CREATE POLICY "Org admins can view all clients"
  ON public.clients
  FOR SELECT
  USING (public.has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Agency admins can view their org's clients"
  ON public.clients
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'agency_admin') 
    AND public.user_has_org_access(auth.uid(), org_id)
  );

CREATE POLICY "Client users can view their assigned clients"
  ON public.clients
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'client_user')
    AND public.user_has_client_access(auth.uid(), id)
  );

CREATE POLICY "Org and agency admins can manage clients in their org"
  ON public.clients
  FOR ALL
  USING (
    (public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'agency_admin'))
    AND public.user_has_org_access(auth.uid(), org_id)
  );

-- RLS Policies for org_members
CREATE POLICY "Users can view org members of their orgs"
  ON public.org_members
  FOR SELECT
  USING (public.user_has_org_access(auth.uid(), org_id));

CREATE POLICY "Org admins can manage all org members"
  ON public.org_members
  FOR ALL
  USING (public.has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Agency admins can manage members in their org"
  ON public.org_members
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'agency_admin')
    AND public.user_has_org_access(auth.uid(), org_id)
  );

-- RLS Policies for client_users
CREATE POLICY "Users can view client assignments they have access to"
  ON public.client_users
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
      AND (
        public.has_role(auth.uid(), 'org_admin')
        OR (public.has_role(auth.uid(), 'agency_admin') AND public.user_has_org_access(auth.uid(), c.org_id))
      )
    )
  );

CREATE POLICY "Org and agency admins can manage client assignments"
  ON public.client_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id
      AND (
        public.has_role(auth.uid(), 'org_admin')
        OR (public.has_role(auth.uid(), 'agency_admin') AND public.user_has_org_access(auth.uid(), c.org_id))
      )
    )
  );