-- Create API Keys Table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(key_hash)
);

-- RLS Policies for api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view api keys for their client"
  ON api_keys FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Admins can create api keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'org_admin'::app_role) 
    OR has_role(auth.uid(), 'agency_admin'::app_role)
  );

CREATE POLICY "Admins can update api keys"
  ON api_keys FOR UPDATE
  USING (
    user_can_access_client(auth.uid(), client_id)
    AND (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'agency_admin'::app_role))
  );

-- Create Webhooks Table
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0
);

-- RLS Policies for webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhooks for their client"
  ON webhooks FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Admins can manage webhooks"
  ON webhooks FOR ALL
  USING (
    user_can_access_client(auth.uid(), client_id)
    AND (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'agency_admin'::app_role))
  )
  WITH CHECK (
    user_can_access_client(auth.uid(), client_id)
    AND (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'agency_admin'::app_role))
  );

-- Trigger for updated_at
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create Webhook Logs Table
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy for webhook_logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM webhooks w
      WHERE w.id = webhook_logs.webhook_id
      AND user_can_access_client(auth.uid(), w.client_id)
    )
  );