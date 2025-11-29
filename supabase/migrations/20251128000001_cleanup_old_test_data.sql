-- ============================================================================
-- CLEANUP OLD TEST DATA
-- ============================================================================
-- This script removes all existing test/demo data before fresh simulation
-- Safe to run - only affects clearly marked demo/test data
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '🧹 Starting cleanup of old test data...';

  -- Delete events for demo campaigns
  DELETE FROM events 
  WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % events', deleted_count;

  -- Delete gift card deliveries for demo cards
  DELETE FROM gift_card_deliveries
  WHERE gift_card_id IN (
    SELECT gc.id FROM gift_cards gc
    WHERE gc.card_code LIKE 'DEMO-%' OR gc.card_code LIKE 'TEST-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % gift card deliveries', deleted_count;

  -- Delete demo gift cards
  DELETE FROM gift_cards
  WHERE card_code LIKE 'DEMO-%' OR card_code LIKE 'TEST-%';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % gift cards', deleted_count;

  -- Delete call conditions met for demo campaigns
  DELETE FROM call_conditions_met
  WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % call conditions met', deleted_count;

  -- Delete call sessions for demo campaigns
  DELETE FROM call_sessions
  WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % call sessions', deleted_count;

  -- Delete tracked phone numbers for demo campaigns
  DELETE FROM tracked_phone_numbers
  WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % tracked phone numbers', deleted_count;

  -- Delete ace form submissions for demo recipients
  DELETE FROM ace_form_submissions
  WHERE recipient_id IN (
    SELECT r.id FROM recipients r
    JOIN audiences a ON r.audience_id = a.id
    WHERE a.client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % form submissions', deleted_count;

  -- Delete recipients from demo audiences
  DELETE FROM recipients
  WHERE audience_id IN (
    SELECT id FROM audiences WHERE client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % recipients', deleted_count;

  -- Delete audiences from demo clients
  DELETE FROM audiences
  WHERE client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % audiences', deleted_count;

  -- Delete contact list members for demo contacts
  DELETE FROM contact_list_members
  WHERE contact_id IN (
    SELECT id FROM contacts WHERE email LIKE '%@testmail.com' OR email LIKE '%@demo.com'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % contact list members', deleted_count;

  -- Delete contact lists from demo clients
  DELETE FROM contact_lists
  WHERE client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % contact lists', deleted_count;

  -- Delete demo contacts
  DELETE FROM contacts
  WHERE email LIKE '%@testmail.com' OR email LIKE '%@demo.com' OR client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % contacts', deleted_count;

  -- Delete campaign conditions for demo campaigns
  DELETE FROM campaign_conditions
  WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % campaign conditions', deleted_count;

  -- Delete campaign reward configs for demo campaigns
  DELETE FROM campaign_reward_configs
  WHERE campaign_id IN (
    SELECT id FROM campaigns WHERE client_id IN (
      SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
    )
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % campaign reward configs', deleted_count;

  -- Delete demo campaigns
  DELETE FROM campaigns
  WHERE client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % campaigns', deleted_count;

  -- Delete landing pages from demo clients
  DELETE FROM landing_pages
  WHERE client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % landing pages', deleted_count;

  -- Delete templates from demo clients
  DELETE FROM templates
  WHERE client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % templates', deleted_count;

  -- Delete gift card pools from demo clients
  DELETE FROM gift_card_pools
  WHERE client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % gift card pools', deleted_count;

  -- Delete client users for demo clients
  DELETE FROM client_users
  WHERE client_id IN (
    SELECT id FROM clients WHERE id LIKE 'dc%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % client users', deleted_count;

  -- Delete demo clients
  DELETE FROM clients
  WHERE id LIKE 'dc%' OR id LIKE 'demo-%';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % clients', deleted_count;

  -- Delete org members for demo orgs
  DELETE FROM org_members
  WHERE org_id IN (
    SELECT id FROM organizations WHERE id LIKE 'd%' OR id LIKE 'demo-%'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % org members', deleted_count;

  -- Delete demo organizations
  DELETE FROM organizations
  WHERE id LIKE 'd%' OR id LIKE 'demo-%';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Deleted % organizations', deleted_count;

  RAISE NOTICE '🎉 Cleanup complete! System ready for fresh demo data generation.';
END $$;

