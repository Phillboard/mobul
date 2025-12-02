-- SIMPLIFIED DIAGNOSTIC for AB6-1061
-- Run each step separately to isolate the issue

-- ==========================================
-- STEP 1: Check if recipient exists
-- ==========================================
SELECT 
  'STEP 1: Recipient Check' as step,
  id,
  redemption_code,
  first_name,
  last_name,
  audience_id,
  approval_status
FROM recipients
WHERE UPPER(redemption_code) = 'AB6-1061';

-- ==========================================
-- STEP 2: Check if audience exists
-- ==========================================
SELECT 
  'STEP 2: Audience Check' as step,
  a.id as audience_id,
  a.name as audience_name,
  a.client_id
FROM audiences a
WHERE a.id IN (
  SELECT audience_id FROM recipients 
  WHERE UPPER(redemption_code) = 'AB6-1061'
);

-- ==========================================
-- STEP 3: Check if campaign exists for this audience
-- ==========================================
SELECT 
  'STEP 3: Campaign Check' as step,
  c.id as campaign_id,
  c.name as campaign_name,
  c.audience_id,
  c.status
FROM campaigns c
WHERE c.audience_id IN (
  SELECT audience_id FROM recipients 
  WHERE UPPER(redemption_code) = 'AB6-1061'
);

-- ==========================================
-- STEP 4: Check campaign conditions
-- ==========================================
SELECT 
  'STEP 4: Campaign Conditions Check' as step,
  cc.id,
  cc.campaign_id,
  cc.condition_number,
  cc.condition_name,
  cc.trigger_type,
  cc.is_active
FROM campaign_conditions cc
WHERE cc.campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
);

-- ==========================================
-- STEP 5: Check what gift card related tables exist
-- ==========================================
SELECT 
  'STEP 5: Check Table Names' as step,
  tablename as table_name
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%gift%'
ORDER BY tablename;

-- ==========================================
-- STEP 6: Check campaign_reward_configs (without joining pools yet)
-- ==========================================
SELECT 
  'STEP 6: Reward Config Check' as step,
  crc.campaign_id,
  crc.condition_number,
  crc.gift_card_pool_id
FROM campaign_reward_configs crc
WHERE crc.campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE c.audience_id IN (
    SELECT audience_id FROM recipients 
    WHERE UPPER(redemption_code) = 'AB6-1061'
  )
);

-- ==========================================
-- STEP 7: The exact query the call center uses
-- ==========================================
SELECT 
  'STEP 7: Full Call Center Query' as step,
  r.id,
  r.redemption_code,
  r.first_name,
  r.last_name,
  a.id as audience_id,
  a.name as audience_name
FROM recipients r
INNER JOIN audiences a ON r.audience_id = a.id
INNER JOIN campaigns c ON c.audience_id = a.id
WHERE UPPER(r.redemption_code) = 'AB6-1061';

