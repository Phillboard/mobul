-- Reset Database: Delete all transactional data while preserving core structure
-- This migration deletes data in FK-respecting order

-- Step 1: Delete dependent records first
DELETE FROM call_conditions_met;
DELETE FROM gift_card_deliveries;
DELETE FROM campaign_reward_configs;
DELETE FROM campaign_conditions;
DELETE FROM campaign_versions;
DELETE FROM campaign_approvals;
DELETE FROM campaign_comments;
DELETE FROM campaign_drafts;
DELETE FROM campaign_prototypes;
DELETE FROM crm_events;

-- Step 2: Delete call and tracking data
DELETE FROM call_sessions;
DELETE FROM tracked_phone_numbers;

-- Step 3: Delete contact-related data
DELETE FROM contact_campaign_participation;
DELETE FROM contact_list_members;
DELETE FROM contact_tags;
DELETE FROM contact_lists;
DELETE FROM recipients;
DELETE FROM contacts;

-- Step 4: Delete campaign data
DELETE FROM campaigns;
DELETE FROM audiences;
DELETE FROM bulk_code_uploads;

-- Step 5: Delete gift card data
DELETE FROM gift_cards;
DELETE FROM admin_card_sales;
DELETE FROM gift_card_pools;
DELETE FROM admin_gift_card_inventory;
DELETE FROM gift_card_brands;

-- Step 6: Delete template and landing page data
DELETE FROM design_versions;
DELETE FROM templates;
DELETE FROM landing_pages;

-- Step 7: Delete form submissions
DELETE FROM ace_form_submissions;

-- Step 8: Clear simulation history
DELETE FROM simulation_batches;

-- Step 9: Delete CRM integrations and webhooks
DELETE FROM crm_integrations;
DELETE FROM webhooks;