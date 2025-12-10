-- Create CRM integrations table
CREATE TABLE crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  crm_provider TEXT NOT NULL CHECK (crm_provider IN ('salesforce', 'hubspot', 'zoho', 'gohighlevel', 'pipedrive', 'custom')),
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  api_credentials_encrypted JSONB,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  event_mappings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create CRM events audit log table
CREATE TABLE crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_integration_id UUID REFERENCES crm_integrations(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  recipient_id UUID REFERENCES recipients(id),
  call_session_id UUID REFERENCES call_sessions(id),
  campaign_id UUID REFERENCES campaigns(id),
  matched BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  condition_triggered INTEGER,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_integrations
CREATE POLICY "Users can view integrations for accessible clients"
  ON crm_integrations FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can create integrations for accessible clients"
  ON crm_integrations FOR INSERT
  WITH CHECK (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can update integrations for accessible clients"
  ON crm_integrations FOR UPDATE
  USING (user_can_access_client(auth.uid(), client_id));

CREATE POLICY "Users can delete integrations for accessible clients"
  ON crm_integrations FOR DELETE
  USING (user_can_access_client(auth.uid(), client_id));

-- RLS Policies for crm_events
CREATE POLICY "Users can view events for accessible integrations"
  ON crm_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_integrations ci
      WHERE ci.id = crm_events.crm_integration_id
      AND user_can_access_client(auth.uid(), ci.client_id)
    )
  );

-- Indexes for performance
CREATE INDEX idx_crm_integrations_client ON crm_integrations(client_id);
CREATE INDEX idx_crm_integrations_campaign ON crm_integrations(campaign_id);
CREATE INDEX idx_crm_integrations_active ON crm_integrations(is_active);
CREATE INDEX idx_crm_events_integration ON crm_events(crm_integration_id);
CREATE INDEX idx_crm_events_recipient ON crm_events(recipient_id);
CREATE INDEX idx_crm_events_processed ON crm_events(processed);

-- Trigger for updated_at
CREATE TRIGGER update_crm_integrations_updated_at
  BEFORE UPDATE ON crm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();