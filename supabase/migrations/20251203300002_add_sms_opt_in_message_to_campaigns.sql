-- Add sms_opt_in_message column to campaigns table
-- This stores the campaign-level SMS opt-in consent message template

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS sms_opt_in_message TEXT;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.sms_opt_in_message IS 'SMS opt-in consent message template. Variables: {company}, {client_name}. Default: "To send your activation code, we''ll text you a link and a few related messages over the next 30 days from {company}. Msg & data rates may apply. Reply STOP to stop at any time."';

