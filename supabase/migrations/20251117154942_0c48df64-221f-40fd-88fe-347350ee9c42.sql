-- Phase 1: Zapier Connection Architecture

-- Create zapier_connections table
CREATE TABLE IF NOT EXISTS public.zapier_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  connection_name TEXT NOT NULL,
  zap_webhook_url TEXT NOT NULL,
  description TEXT,
  trigger_events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create zapier_trigger_logs table
CREATE TABLE IF NOT EXISTS public.zapier_trigger_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zapier_connection_id UUID NOT NULL REFERENCES public.zapier_connections(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  triggered_at TIMESTAMPTZ DEFAULT now()
);

-- Extend webhooks table for Zapier support
ALTER TABLE public.webhooks 
ADD COLUMN IF NOT EXISTS integration_type TEXT DEFAULT 'generic',
ADD COLUMN IF NOT EXISTS zapier_metadata JSONB DEFAULT '{}'::jsonb;

-- Enable RLS on new tables
ALTER TABLE public.zapier_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zapier_trigger_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zapier_connections
CREATE POLICY "Users can view zapier connections for accessible clients"
  ON public.zapier_connections FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create zapier connections for accessible clients"
  ON public.zapier_connections FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update zapier connections for accessible clients"
  ON public.zapier_connections FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete zapier connections for accessible clients"
  ON public.zapier_connections FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for zapier_trigger_logs
CREATE POLICY "Users can view zapier logs for accessible connections"
  ON public.zapier_trigger_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zapier_connections zc
      WHERE zc.id = zapier_trigger_logs.zapier_connection_id
        AND user_can_access_client(auth.uid(), zc.client_id)
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_zapier_connections_client_id ON public.zapier_connections(client_id);
CREATE INDEX IF NOT EXISTS idx_zapier_connections_active ON public.zapier_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_zapier_trigger_logs_connection_id ON public.zapier_trigger_logs(zapier_connection_id);
CREATE INDEX IF NOT EXISTS idx_zapier_trigger_logs_triggered_at ON public.zapier_trigger_logs(triggered_at DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_zapier_connections_updated_at
  BEFORE UPDATE ON public.zapier_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();