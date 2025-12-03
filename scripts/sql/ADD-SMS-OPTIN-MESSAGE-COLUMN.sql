-- Add SMS message columns for campaigns
-- This allows customizing opt-in and delivery SMS messages

-- 1. Add sms_opt_in_message to campaigns (campaign-level opt-in message)
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS sms_opt_in_message TEXT;

COMMENT ON COLUMN campaigns.sms_opt_in_message IS 
  'Custom SMS opt-in message template. Use {company}, {client_name} as placeholders. Default: "To send your activation code, we''ll text you a link and a few related messages over the next 30 days from {company}. Msg & data rates may apply. Reply STOP to stop at any time."';

-- 2. Add sms_template to campaign_conditions (per-condition delivery message)
ALTER TABLE campaign_conditions
ADD COLUMN IF NOT EXISTS sms_template TEXT;

COMMENT ON COLUMN campaign_conditions.sms_template IS 
  'Custom SMS message for gift card delivery. Use {first_name}, {last_name}, {value}, {provider}, {company}, {link} as placeholders. Default: "Hi {first_name}! Here''s your ${value} {provider} gift card from {company}: {link}"';

-- Example of setting custom messages:
-- UPDATE campaigns 
-- SET sms_opt_in_message = 'To send your activation code, we''ll text you from {company}. Msg rates may apply. Reply STOP anytime.'
-- WHERE id = 'your-campaign-id';
--
-- UPDATE campaign_conditions
-- SET sms_template = 'Hi {first_name}! Here''s your ${value} {provider} reward: {link}'
-- WHERE campaign_id = 'your-campaign-id';

