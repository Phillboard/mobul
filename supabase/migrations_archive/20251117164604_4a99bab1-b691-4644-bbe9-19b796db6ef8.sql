-- Phase 2: Account Settings - Database Schema

-- Add notification preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email": {
    "campaigns": true,
    "gift_cards": true,
    "system_alerts": true
  },
  "sms": false
}'::jsonb;

-- Create login_history table for audit
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at DESC);

-- Enable RLS
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own login history
CREATE POLICY "Users can view their own login history"
  ON login_history FOR SELECT
  USING (auth.uid() = user_id);

-- Add settings-related permissions
INSERT INTO permissions (name, description, module) VALUES
  ('settings.view', 'View general settings', 'settings'),
  ('settings.edit', 'Edit general settings', 'settings'),
  ('settings.phone_numbers', 'Manage phone numbers', 'settings'),
  ('settings.integrations', 'Manage integrations', 'settings'),
  ('settings.api', 'Manage API settings', 'settings'),
  ('settings.billing', 'View billing information', 'settings'),
  ('platform.security.manage', 'Manage platform security', 'platform')
ON CONFLICT (name) DO NOTHING;