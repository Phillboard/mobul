-- Create lead marketplace tables if they don't exist
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  api_endpoint TEXT,
  adapter_type TEXT,
  pricing_json JSONB DEFAULT '{}'::jsonb,
  available_filters_json JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL CHECK (vertical IN ('roofing', 'rei', 'auto')),
  preset_name TEXT NOT NULL,
  filters_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_source_id UUID REFERENCES public.lead_sources(id),
  filter_json JSONB DEFAULT '{}'::jsonb,
  quantity INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  audience_id UUID REFERENCES public.audiences(id) ON DELETE SET NULL,
  license_terms TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add credits column to clients table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'clients' 
                 AND column_name = 'credits') THEN
    ALTER TABLE public.clients ADD COLUMN credits INTEGER DEFAULT 100000;
    COMMENT ON COLUMN public.clients.credits IS 'Available credits for lead purchases (in cents)';
  END IF;
END $$;

-- Add payment fields to lead_purchases table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'lead_purchases' 
                 AND column_name = 'stripe_payment_id') THEN
    ALTER TABLE public.lead_purchases ADD COLUMN stripe_payment_id TEXT;
    COMMENT ON COLUMN public.lead_purchases.stripe_payment_id IS 'Stripe payment intent ID';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'lead_purchases' 
                 AND column_name = 'payment_status') THEN
    ALTER TABLE public.lead_purchases ADD COLUMN payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed'));
    COMMENT ON COLUMN public.lead_purchases.payment_status IS 'Payment status: pending, paid, or failed';
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_filter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_sources
CREATE POLICY "Users can view active lead sources" ON public.lead_sources
  FOR SELECT USING (active = true OR has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Org admins can manage lead sources" ON public.lead_sources
  FOR ALL USING (has_role(auth.uid(), 'org_admin'));

-- RLS policies for lead_filter_presets
CREATE POLICY "Users can view lead filter presets" ON public.lead_filter_presets
  FOR SELECT USING (true);

CREATE POLICY "Org admins can manage lead filter presets" ON public.lead_filter_presets
  FOR ALL USING (has_role(auth.uid(), 'org_admin'));

-- RLS policies for lead_purchases
CREATE POLICY "Users can view their client's lead purchases" ON public.lead_purchases
  FOR SELECT USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create lead purchases for accessible clients" ON public.lead_purchases
  FOR INSERT WITH CHECK (user_can_access_client(auth.uid(), client_id));

-- Insert mock lead source
INSERT INTO public.lead_sources (id, vendor_name, adapter_type, active, pricing_json, available_filters_json)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mock Lead Vendor',
  'mock',
  true,
  '{"base_price_cents": 15}'::jsonb,
  '{"roofing": ["homeAge", "roofAge", "hailZone", "income", "creditScore"], "rei": ["absenteeOwner", "equity", "ownershipLength", "distressed"], "auto": ["vehicleMake", "vehicleAge", "mileage", "serviceLapsed"]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample filter presets
INSERT INTO public.lead_filter_presets (vertical, preset_name, filters_json)
VALUES 
  ('roofing', 'High-Value Homeowners', '{"homeAge": "20+", "income": "100k+"}'::jsonb),
  ('roofing', 'Storm Zone Targets', '{"hailZone": true}'::jsonb),
  ('rei', 'High Equity Absentee', '{"absenteeOwner": true, "equity": "70%+"}'::jsonb),
  ('auto', 'Service Lapsed Vehicles', '{"serviceLapsed": "6+ months"}'::jsonb)
ON CONFLICT DO NOTHING;