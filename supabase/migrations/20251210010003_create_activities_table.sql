-- Create Activities table (GitHub Issue #11)
-- Provides activity logging functionality for contacts and campaigns

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'other')),
  subject TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client-scoped access
CREATE POLICY "Users can view activities for accessible clients"
ON public.activities
FOR SELECT
USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create activities for accessible clients"
ON public.activities
FOR INSERT
WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update activities for accessible clients"
ON public.activities
FOR UPDATE
USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete activities for accessible clients"
ON public.activities
FOR DELETE
USING (user_can_access_client(auth.uid(), client_id));

-- Indexes for performance
CREATE INDEX idx_activities_client_id ON public.activities(client_id);
CREATE INDEX idx_activities_contact_id ON public.activities(contact_id);
CREATE INDEX idx_activities_campaign_id ON public.activities(campaign_id);
CREATE INDEX idx_activities_type ON public.activities(type);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_activities_scheduled_at ON public.activities(scheduled_at);

-- Trigger for updated_at
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;

COMMENT ON TABLE public.activities IS 'Activity logging table for tracking interactions with contacts and campaigns';

