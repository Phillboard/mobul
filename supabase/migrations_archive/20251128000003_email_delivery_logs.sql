-- Email Delivery Logs Table
-- Tracks all email deliveries for gift cards, notifications, and forms

CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_name TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  
  -- Foreign keys to related entities
  recipient_id UUID REFERENCES public.recipients(id) ON DELETE SET NULL,
  gift_card_id UUID REFERENCES public.gift_cards(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  form_id UUID REFERENCES public.ace_forms(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Metadata
  email_body_html TEXT,
  email_body_text TEXT,
  metadata_json JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_email_delivery_logs_recipient_email ON public.email_delivery_logs(recipient_email);
CREATE INDEX idx_email_delivery_logs_delivery_status ON public.email_delivery_logs(delivery_status);
CREATE INDEX idx_email_delivery_logs_template_name ON public.email_delivery_logs(template_name);
CREATE INDEX idx_email_delivery_logs_sent_at ON public.email_delivery_logs(sent_at DESC);
CREATE INDEX idx_email_delivery_logs_recipient_id ON public.email_delivery_logs(recipient_id);
CREATE INDEX idx_email_delivery_logs_gift_card_id ON public.email_delivery_logs(gift_card_id);
CREATE INDEX idx_email_delivery_logs_campaign_id ON public.email_delivery_logs(campaign_id);
CREATE INDEX idx_email_delivery_logs_client_id ON public.email_delivery_logs(client_id);

-- Enable RLS
ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their client's email logs"
  ON public.email_delivery_logs FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all email logs"
  ON public.email_delivery_logs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_delivery_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_email_delivery_logs_updated_at
  BEFORE UPDATE ON public.email_delivery_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_delivery_logs_updated_at();

-- Comments
COMMENT ON TABLE public.email_delivery_logs IS 'Tracks all email deliveries for audit and monitoring';
COMMENT ON COLUMN public.email_delivery_logs.delivery_status IS 'Status: pending, sent, failed, bounced, opened, clicked';
COMMENT ON COLUMN public.email_delivery_logs.provider_message_id IS 'Message ID from email provider (e.g., Resend)';
COMMENT ON COLUMN public.email_delivery_logs.template_name IS 'Name of email template used';

