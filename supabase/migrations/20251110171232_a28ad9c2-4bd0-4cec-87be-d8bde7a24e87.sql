-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_endpoint TEXT,
  api_key_secret_name TEXT,
  capabilities_json JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create events table for tracking
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data_json JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('usps', 'qr', 'purl', 'form', 'external')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create suppressed_addresses table
CREATE TABLE public.suppressed_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  address1 TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('returned', 'invalid', 'opted_out')),
  suppressed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add delivery_status to recipients table
ALTER TABLE public.recipients 
ADD COLUMN IF NOT EXISTS delivery_status TEXT;

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Users can view active vendors"
ON public.vendors FOR SELECT
USING (active = true OR has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Org admins can manage vendors"
ON public.vendors FOR ALL
USING (has_role(auth.uid(), 'org_admin'));

-- RLS Policies for events
CREATE POLICY "Users can view events for accessible campaigns"
ON public.events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = events.campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  )
);

CREATE POLICY "Users can create events for accessible campaigns"
ON public.events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = events.campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  )
);

-- RLS Policies for suppressed_addresses
CREATE POLICY "Users can view suppressed addresses for accessible clients"
ON public.suppressed_addresses FOR SELECT
USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can manage suppressed addresses for accessible clients"
ON public.suppressed_addresses FOR ALL
USING (user_can_access_client(auth.uid(), client_id));

-- Create indexes for performance
CREATE INDEX idx_events_campaign_id ON public.events(campaign_id);
CREATE INDEX idx_events_recipient_id ON public.events(recipient_id);
CREATE INDEX idx_events_occurred_at ON public.events(occurred_at);
CREATE INDEX idx_suppressed_addresses_client_id ON public.suppressed_addresses(client_id);
CREATE INDEX idx_suppressed_addresses_lookup ON public.suppressed_addresses(address1, city, state, zip);

-- Seed vendors table
INSERT INTO public.vendors (name, api_endpoint, api_key_secret_name, capabilities_json, active) VALUES
  ('Lob', 'https://api.lob.com/v1', 'LOB_API_KEY', '{"postcard": true, "letter": true, "check": true}'::jsonb, false),
  ('Stannp', 'https://dash.stannp.com/api/v1', 'STANNP_API_KEY', '{"postcard": true, "letter": true}'::jsonb, false),
  ('Click2Mail', 'https://api.click2mail.com/v1', 'CLICK2MAIL_API_KEY', '{"postcard": true, "letter": true, "catalog": true}'::jsonb, false);