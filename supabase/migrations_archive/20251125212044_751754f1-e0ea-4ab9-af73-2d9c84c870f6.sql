-- Add is_simulated and simulation_batch_id to remaining tables for complete tracking

-- Templates
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_templates_simulated ON templates(is_simulated) WHERE is_simulated = true;

-- Landing Pages
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_landing_pages_simulated ON landing_pages(is_simulated) WHERE is_simulated = true;

-- Audiences
ALTER TABLE audiences
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_audiences_simulated ON audiences(is_simulated) WHERE is_simulated = true;

-- Contact Lists
ALTER TABLE contact_lists
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contact_lists_simulated ON contact_lists(is_simulated) WHERE is_simulated = true;

-- Contact List Members
ALTER TABLE contact_list_members
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

-- Contact Tags
ALTER TABLE contact_tags
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

-- Gift Card Deliveries
ALTER TABLE gift_card_deliveries
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_gift_card_deliveries_simulated ON gift_card_deliveries(is_simulated) WHERE is_simulated = true;

-- SMS Delivery Log
ALTER TABLE sms_delivery_log
ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS simulation_batch_id UUID REFERENCES simulation_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_simulated ON sms_delivery_log(is_simulated) WHERE is_simulated = true;