-- Create QR tracking events table
CREATE TABLE IF NOT EXISTS public.qr_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT,
  device_type TEXT,
  location_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_qr_tracking_campaign ON public.qr_tracking_events(campaign_id);
CREATE INDEX idx_qr_tracking_recipient ON public.qr_tracking_events(recipient_id);
CREATE INDEX idx_qr_tracking_scanned_at ON public.qr_tracking_events(scanned_at);

-- Enable RLS
ALTER TABLE public.qr_tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view QR tracking for accessible campaigns"
  ON public.qr_tracking_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = qr_tracking_events.campaign_id
      AND user_can_access_client(auth.uid(), c.client_id)
    )
  );

CREATE POLICY "System can insert QR tracking events"
  ON public.qr_tracking_events
  FOR INSERT
  WITH CHECK (true);