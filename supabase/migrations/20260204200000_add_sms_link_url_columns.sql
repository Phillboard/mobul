-- Add SMS Link URL columns for configurable {link} variable
-- This allows users to configure what URL the {link} variable resolves to
-- instead of just falling back to the gift card code

-- 1. Add to message_templates (client-level default)
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS sms_delivery_link_url TEXT;

COMMENT ON COLUMN message_templates.sms_delivery_link_url IS 
  'URL template for {link} variable in gift card delivery SMS. Supports variables: {code}, {email}, {first_name}, {last_name}, {phone}, {value}, {brand}, etc.';

-- 2. Add to campaign_conditions (condition-level override)
ALTER TABLE campaign_conditions 
ADD COLUMN IF NOT EXISTS sms_link_url TEXT;

COMMENT ON COLUMN campaign_conditions.sms_link_url IS 
  'Condition-specific URL for {link} variable. Overrides client default from message_templates.';

-- Add index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_message_templates_sms_link_lookup 
ON message_templates (client_id, template_type, name, is_default) 
WHERE template_type = 'sms' AND name = 'gift_card_delivery' AND is_default = true;
