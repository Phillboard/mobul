-- Add sms_template column to campaign_conditions table
-- This stores the SMS message template for gift card delivery per condition

ALTER TABLE campaign_conditions
ADD COLUMN IF NOT EXISTS sms_template TEXT;

-- Set default template for existing conditions
UPDATE campaign_conditions
SET sms_template = 'Hi {first_name}! Your ${value} {provider} gift card: {link}'
WHERE sms_template IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN campaign_conditions.sms_template IS 'SMS message template for gift card delivery. Variables: {first_name}, {last_name}, {value}, {provider}, {link}';

