-- Performance Optimization Indexes
-- Created: 2025-11-27
-- Purpose: Add missing indexes for frequently queried columns
-- Note: Simplified to avoid schema mismatches

-- Analytics queries (events table is heavily queried)
CREATE INDEX IF NOT EXISTS idx_events_campaign_type_date 
ON events(campaign_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_recipient 
ON events(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type_date 
ON events(event_type, created_at DESC);

-- Recipients queries
CREATE INDEX IF NOT EXISTS idx_recipients_audience 
ON recipients(audience_id);

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

-- User management queries
CREATE INDEX IF NOT EXISTS idx_client_users_user 
ON client_users(user_id);

CREATE INDEX IF NOT EXISTS idx_client_users_client 
ON client_users(client_id);

-- Analyze tables for query planner
ANALYZE events;
ANALYZE recipients;
ANALYZE gift_cards;
ANALYZE campaigns;
ANALYZE gift_card_deliveries;
ANALYZE call_sessions;
