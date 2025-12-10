-- Add call recording fields to call_sessions
ALTER TABLE call_sessions 
ADD COLUMN IF NOT EXISTS recording_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_duration INTEGER,
ADD COLUMN IF NOT EXISTS forward_to_number TEXT;

-- Add SMS delivery tracking fields to gift_card_deliveries
ALTER TABLE gift_card_deliveries
ADD COLUMN IF NOT EXISTS sms_message TEXT,
ADD COLUMN IF NOT EXISTS sms_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_error_message TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add SMS template to campaign_reward_configs (already exists, just ensure it's there)
-- sms_template column already exists per schema

-- Add Twilio configuration to tracked_phone_numbers
ALTER TABLE tracked_phone_numbers
ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS forward_to_number TEXT,
ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS friendly_name TEXT;

-- Create index for faster SMS status lookups
CREATE INDEX IF NOT EXISTS idx_gift_card_deliveries_sms_status 
ON gift_card_deliveries(sms_status) WHERE sms_status = 'pending';

-- Create index for call recordings
CREATE INDEX IF NOT EXISTS idx_call_sessions_recording_sid 
ON call_sessions(recording_sid) WHERE recording_sid IS NOT NULL;