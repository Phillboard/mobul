-- =====================================================
-- DATA TRANSFER FROM OLD SUPABASE TO NEW SUPABASE
-- =====================================================
-- Run this script in the NEW Supabase SQL Editor
-- after setting up a foreign data wrapper connection
-- to the OLD database
-- =====================================================

-- IMPORTANT: You'll need the OLD database credentials
-- OLD Project: arzthloosvnasokxygfo
-- NEW Project: uibvxhwhkatjcwghnzpu

-- =====================================================
-- OPTION 1: MANUAL CSV EXPORT/IMPORT (Recommended)
-- =====================================================
-- For each table:
-- 1. Go to OLD Supabase Dashboard → Table Editor → Select Table → Export CSV
-- 2. Go to NEW Supabase Dashboard → Table Editor → Select Table → Import CSV

-- Tables to transfer (in order due to foreign keys):
-- 1. organizations
-- 2. clients  
-- 3. users (from auth.users - handle via Supabase Dashboard)
-- 4. user_roles
-- 5. client_users
-- 6. org_members
-- 7. gift_card_brands
-- 8. gift_card_pools
-- 9. gift_cards
-- 10. templates
-- 11. landing_pages
-- 12. ace_forms
-- 13. contact_lists
-- 14. contacts
-- 15. contact_list_members
-- 16. audiences
-- 17. campaigns
-- 18. campaign_conditions
-- 19. campaign_reward_configs
-- 20. recipients
-- 21. events
-- 22. call_sessions
-- 23. gift_card_deliveries

-- =====================================================
-- OPTION 2: DIRECT DATABASE LINK (Advanced)
-- =====================================================
-- This requires postgres_fdw extension and network access

-- Step 1: Enable postgres_fdw extension (run in NEW database)
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Step 2: Create foreign server pointing to OLD database
-- Replace with actual OLD database credentials
/*
CREATE SERVER old_supabase_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    host 'db.arzthloosvnasokxygfo.supabase.co',
    port '5432',
    dbname 'postgres'
  );

-- Step 3: Create user mapping
CREATE USER MAPPING FOR postgres
  SERVER old_supabase_server
  OPTIONS (
    user 'postgres',
    password 'YOUR_OLD_DB_PASSWORD'
  );

-- Step 4: Import foreign schema
IMPORT FOREIGN SCHEMA public
  FROM SERVER old_supabase_server
  INTO old_data;
*/

-- =====================================================
-- OPTION 3: pg_dump/pg_restore (Best for large datasets)
-- =====================================================
-- Run from command line:

-- Export from OLD:
-- pg_dump "postgresql://postgres:PASSWORD@db.arzthloosvnasokxygfo.supabase.co:5432/postgres" \
--   --data-only \
--   --no-owner \
--   --no-privileges \
--   --exclude-table-data='auth.*' \
--   --exclude-table-data='storage.*' \
--   --exclude-table-data='supabase_migrations.*' \
--   > old_data_export.sql

-- Import to NEW:
-- psql "postgresql://postgres:PASSWORD@db.uibvxhwhkatjcwghnzpu.supabase.co:5432/postgres" \
--   < old_data_export.sql


