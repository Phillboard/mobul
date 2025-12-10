-- Create leads table for structured lead storage
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  appointment_requested BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Users can view leads for accessible campaigns"
ON public.leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = leads.campaign_id
    AND user_can_access_client(auth.uid(), c.client_id)
  )
);

CREATE POLICY "Public can insert leads"
ON public.leads FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX idx_leads_recipient_id ON public.leads(recipient_id);
CREATE INDEX idx_leads_submitted_at ON public.leads(submitted_at);