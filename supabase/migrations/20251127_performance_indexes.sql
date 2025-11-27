-- Performance Optimization Indexes
-- Created: 2025-11-27
-- Purpose: Add missing indexes for frequently queried columns

-- Analytics queries (events table is heavily queried)
CREATE INDEX IF NOT EXISTS idx_events_campaign_type_date 
ON events(campaign_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_recipient 
ON events(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type_date 
ON events(event_type, created_at DESC);

-- Recipients queries
CREATE INDEX IF NOT EXISTS idx_recipients_audience 
ON recipients(audience_id) WHERE approval_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_recipients_redemption_code 
ON recipients(redemption_code) WHERE redemption_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_token 
ON recipients(token);

-- Gift cards queries (status-based filtering is common)
CREATE INDEX IF NOT EXISTS idx_gift_cards_pool_status 
ON gift_cards(pool_id, status);

CREATE INDEX IF NOT EXISTS idx_gift_cards_available 
ON gift_cards(pool_id) WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_gift_cards_brand 
ON gift_cards(brand_id, status);

-- Campaigns queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status_client 
ON campaigns(client_id, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_created 
ON campaigns(client_id, created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_contacts_name_search 
ON contacts USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '')));

CREATE INDEX IF NOT EXISTS idx_campaigns_name_search 
ON campaigns USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_companies_name_search 
ON companies USING gin(to_tsvector('english', name)) 
WHERE name IS NOT NULL;

-- Contact lists queries
CREATE INDEX IF NOT EXISTS idx_contact_list_members_list 
ON contact_list_members(list_id);

CREATE INDEX IF NOT EXISTS idx_contact_list_members_contact 
ON contact_list_members(contact_id);

-- Call sessions queries
CREATE INDEX IF NOT EXISTS idx_call_sessions_campaign 
ON call_sessions(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_sessions_recipient 
ON call_sessions(recipient_id, created_at DESC);

-- Gift card deliveries queries
CREATE INDEX IF NOT EXISTS idx_gift_card_deliveries_gift_card 
ON gift_card_deliveries(gift_card_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_deliveries_recipient 
ON gift_card_deliveries(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gift_card_deliveries_campaign 
ON gift_card_deliveries(campaign_id, delivery_status);

-- Audiences queries
CREATE INDEX IF NOT EXISTS idx_audiences_client_status 
ON audiences(client_id, status);

-- Templates queries  
CREATE INDEX IF NOT EXISTS idx_templates_client 
ON templates(client_id, is_starter_template);

-- Landing pages queries
CREATE INDEX IF NOT EXISTS idx_landing_pages_client 
ON landing_pages(client_id, published);

-- ACE Forms queries
CREATE INDEX IF NOT EXISTS idx_ace_forms_client 
ON ace_forms(client_id, status);

CREATE INDEX IF NOT EXISTS idx_ace_form_submissions_form 
ON ace_form_submissions(form_id, created_at DESC);

-- User management queries
CREATE INDEX IF NOT EXISTS idx_client_users_user 
ON client_users(user_id);

CREATE INDEX IF NOT EXISTS idx_client_users_client 
ON client_users(client_id);

-- Comment explaining the strategy
COMMENT ON INDEX idx_events_campaign_type_date IS 
'Composite index for campaign analytics queries filtering by type and date';

COMMENT ON INDEX idx_gift_cards_available IS 
'Partial index for quickly finding available cards for provisioning';

COMMENT ON INDEX idx_contacts_name_search IS 
'Full-text search index for contact name searches';

-- Analyze tables for query planner
ANALYZE events;
ANALYZE recipients;
ANALYZE gift_cards;
ANALYZE campaigns;
ANALYZE contacts;
ANALYZE gift_card_deliveries;
ANALYZE call_sessions;

SELECT 'Performance indexes created successfully' as status;

