-- Add simulation tracking columns to core tables
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE gift_card_pools ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE gift_card_pools ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE recipients ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE gift_card_deliveries ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE gift_card_deliveries ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE call_conditions_met ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE call_conditions_met ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE tracked_phone_numbers ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE tracked_phone_numbers ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE campaign_conditions ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE campaign_conditions ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

ALTER TABLE campaign_reward_configs ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;
ALTER TABLE campaign_reward_configs ADD COLUMN IF NOT EXISTS simulation_batch_id UUID;

-- Create simulation batches tracking table
CREATE TABLE IF NOT EXISTS simulation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  data_types TEXT[],
  total_records INTEGER DEFAULT 0,
  parameters JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed',
  error_message TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_simulated ON contacts(is_simulated) WHERE is_simulated = TRUE;
CREATE INDEX IF NOT EXISTS idx_contacts_batch ON contacts(simulation_batch_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_simulated ON gift_cards(is_simulated) WHERE is_simulated = TRUE;
CREATE INDEX IF NOT EXISTS idx_gift_cards_batch ON gift_cards(simulation_batch_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_simulated ON call_sessions(is_simulated) WHERE is_simulated = TRUE;
CREATE INDEX IF NOT EXISTS idx_call_sessions_batch ON call_sessions(simulation_batch_id);

-- Enable RLS on simulation_batches
ALTER TABLE simulation_batches ENABLE ROW LEVEL SECURITY;

-- Admin can view and manage simulation batches
CREATE POLICY "Admins can manage simulation batches"
  ON simulation_batches
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));