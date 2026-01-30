-- ============================================================================
-- Backfill Activity Log V2 - With Proper Data Relationships
-- ============================================================================
-- This migration fixes the initial backfill by:
-- 1. Adding unique index for idempotency
-- 2. Deleting old backfilled records
-- 3. Re-inserting with proper JOINs for recipient_name, campaign_name, client_id
-- ============================================================================

-- Temporarily disable RLS for the backfill
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 1: Delete old backfilled records (identified by source_table metadata)
-- ============================================================================
DELETE FROM public.activity_log 
WHERE metadata->>'source_table' IS NOT NULL;

-- ============================================================================
-- Step 2: Re-backfill with proper JOINs
-- ============================================================================

-- 2.1 Backfill from error_logs (system category)
INSERT INTO public.activity_log (
  category, event_type, status, severity, user_id, client_id, 
  campaign_id, recipient_id, organization_id, description, metadata, created_at
)
SELECT 
  'system'::text,
  'error'::text,
  'failed'::text,
  CASE e.severity
    WHEN 'critical' THEN 'critical'
    WHEN 'high' THEN 'error'
    WHEN 'error' THEN 'error'
    WHEN 'warning' THEN 'warning'
    WHEN 'medium' THEN 'warning'
    WHEN 'low' THEN 'info'
    WHEN 'info' THEN 'info'
    ELSE 'error'
  END::text,
  e.user_id,
  COALESCE(e.client_id, c.client_id),
  e.campaign_id,
  e.recipient_id,
  COALESCE(e.organization_id, cl.org_id),
  COALESCE(LEFT(e.error_message, 500), 'System error'),
  jsonb_build_object(
    'source_table', 'error_logs',
    'source_id', e.id::text,
    'error_type', e.error_type,
    'function_name', e.function_name,
    'component_name', e.component_name,
    'error_code', e.error_code,
    'recipient_name', CASE WHEN r.id IS NOT NULL THEN COALESCE(r.first_name || ' ' || r.last_name, 'Unknown') ELSE NULL END,
    'campaign_name', c.name
  ),
  COALESCE(e.occurred_at, e.timestamp, NOW())
FROM public.error_logs e
LEFT JOIN public.campaigns c ON c.id = e.campaign_id
LEFT JOIN public.clients cl ON cl.id = COALESCE(e.client_id, c.client_id)
LEFT JOIN public.recipients r ON r.id = e.recipient_id
;

-- 2.2 Backfill from sms_delivery_log (communication category) - with client_id from campaigns
INSERT INTO public.activity_log (
  category, event_type, status, client_id, organization_id, campaign_id, 
  recipient_id, description, metadata, created_at
)
SELECT 
  'communication'::text,
  CASE s.delivery_status 
    WHEN 'delivered' THEN 'sms_delivered'
    WHEN 'failed' THEN 'sms_failed'
    WHEN 'sent' THEN 'sms_sent'
    ELSE 'sms_sent'
  END::text,
  CASE s.delivery_status 
    WHEN 'delivered' THEN 'success'
    WHEN 'failed' THEN 'failed'
    WHEN 'sent' THEN 'success'
    ELSE 'pending'
  END::text,
  c.client_id,
  cl.org_id,
  s.campaign_id,
  s.recipient_id,
  'SMS ' || COALESCE(s.delivery_status, 'sent') || ' to ' || s.phone_number,
  jsonb_build_object(
    'source_table', 'sms_delivery_log',
    'source_id', s.id::text,
    'phone', s.phone_number,
    'provider', s.provider_used,
    'message_sid', s.twilio_message_sid,
    'gift_card_id', s.gift_card_id,
    'error_message', s.error_message,
    'recipient_name', COALESCE(r.first_name || ' ' || r.last_name, 'Unknown'),
    'recipient_phone', r.phone,
    'campaign_name', c.name
  ),
  COALESCE(s.delivered_at, s.created_at, NOW())
FROM public.sms_delivery_log s
LEFT JOIN public.campaigns c ON c.id = s.campaign_id
LEFT JOIN public.clients cl ON cl.id = c.client_id
LEFT JOIN public.recipients r ON r.id = s.recipient_id
WHERE s.is_simulated = false OR s.is_simulated IS NULL
;

-- 2.3 Backfill from gift_card_billing_ledger (gift_card category)
INSERT INTO public.activity_log (
  category, event_type, status, client_id, organization_id, campaign_id, 
  recipient_id, description, metadata, created_at
)
SELECT 
  'gift_card'::text,
  CASE g.transaction_type 
    WHEN 'purchase_from_inventory' THEN 'card_provisioned'
    WHEN 'purchase_from_tillo' THEN 'card_provisioned'
    WHEN 'refund' THEN 'card_revoked'
    ELSE 'card_assigned'
  END::text,
  'success'::text,
  CASE WHEN g.billed_entity_type = 'client' THEN g.billed_entity_id ELSE c.client_id END,
  COALESCE(cl.org_id, cl2.org_id),
  g.campaign_id,
  g.recipient_id,
  COALESCE(g.transaction_type, 'provision') || ' $' || g.denomination || ' gift card',
  jsonb_build_object(
    'source_table', 'gift_card_billing_ledger',
    'source_id', g.id::text,
    'amount', g.denomination,
    'amount_billed', g.amount_billed,
    'brand_id', g.brand_id,
    'transaction_type', g.transaction_type,
    'inventory_card_id', g.inventory_card_id,
    'tillo_transaction_id', g.tillo_transaction_id,
    'recipient_name', COALESCE(r.first_name || ' ' || r.last_name, 'Unknown'),
    'recipient_phone', r.phone,
    'campaign_name', c.name
  ),
  COALESCE(g.billed_at, NOW())
FROM public.gift_card_billing_ledger g
LEFT JOIN public.campaigns c ON c.id = g.campaign_id
LEFT JOIN public.clients cl ON cl.id = c.client_id
LEFT JOIN public.clients cl2 ON cl2.id = g.billed_entity_id AND g.billed_entity_type = 'client'
LEFT JOIN public.recipients r ON r.id = g.recipient_id
;

-- 2.4 Backfill from login_history (user category)
INSERT INTO public.activity_log (
  category, event_type, status, user_id, ip_address, 
  user_agent, description, metadata, created_at
)
SELECT 
  'user'::text,
  CASE WHEN l.success THEN 'login_success' ELSE 'login_failed' END::text,
  CASE WHEN l.success THEN 'success' ELSE 'failed' END::text,
  l.user_id,
  l.ip_address,
  l.user_agent,
  CASE WHEN l.success THEN 'User logged in successfully' ELSE 'Login attempt failed' END,
  jsonb_build_object(
    'source_table', 'login_history',
    'source_id', l.id::text
  ),
  COALESCE(l.created_at, NOW())
FROM public.login_history l
;

-- 2.5 Backfill from email_delivery_logs (communication category)
INSERT INTO public.activity_log (
  category, event_type, status, client_id, organization_id, campaign_id, 
  recipient_id, description, metadata, created_at
)
SELECT 
  'communication'::text,
  CASE e.delivery_status 
    WHEN 'sent' THEN 'email_sent'
    WHEN 'delivered' THEN 'email_sent'
    WHEN 'opened' THEN 'email_opened'
    WHEN 'clicked' THEN 'email_clicked'
    WHEN 'bounced' THEN 'email_bounced'
    WHEN 'failed' THEN 'email_failed'
    ELSE 'email_sent'
  END::text,
  CASE e.delivery_status 
    WHEN 'failed' THEN 'failed'
    WHEN 'bounced' THEN 'failed'
    ELSE 'success'
  END::text,
  COALESCE(e.client_id, c.client_id),
  cl.org_id,
  e.campaign_id,
  e.recipient_id,
  'Email ' || COALESCE(e.delivery_status, 'sent') || ' to ' || e.recipient_email,
  jsonb_build_object(
    'source_table', 'email_delivery_logs',
    'source_id', e.id::text,
    'recipient_email', e.recipient_email,
    'subject', e.subject,
    'template_name', e.template_name,
    'provider_message_id', e.provider_message_id,
    'gift_card_id', e.gift_card_id,
    'recipient_name', COALESCE(r.first_name || ' ' || r.last_name, e.recipient_name, 'Unknown'),
    'campaign_name', c.name
  ),
  COALESCE(e.sent_at, e.created_at, NOW())
FROM public.email_delivery_logs e
LEFT JOIN public.campaigns c ON c.id = e.campaign_id
LEFT JOIN public.clients cl ON cl.id = COALESCE(e.client_id, c.client_id)
LEFT JOIN public.recipients r ON r.id = e.recipient_id
;

-- 2.6 Backfill from call_sessions (communication category)
INSERT INTO public.activity_log (
  category, event_type, status, user_id, client_id, organization_id, campaign_id, 
  recipient_id, description, metadata, created_at
)
SELECT 
  'communication'::text,
  CASE cs.call_status 
    WHEN 'completed' THEN 'call_completed'
    WHEN 'no-answer' THEN 'call_no_answer'
    WHEN 'busy' THEN 'call_busy'
    WHEN 'failed' THEN 'call_failed'
    WHEN 'in-progress' THEN 'call_inbound'
    ELSE 'call_inbound'
  END::text,
  CASE cs.call_status 
    WHEN 'completed' THEN 'success'
    WHEN 'failed' THEN 'failed'
    ELSE 'success'
  END::text,
  cs.agent_user_id,
  c.client_id,
  cl.org_id,
  cs.campaign_id,
  cs.recipient_id,
  'Call ' || COALESCE(cs.call_status, 'received') || ' from ' || cs.caller_phone,
  jsonb_build_object(
    'source_table', 'call_sessions',
    'source_id', cs.id::text,
    'caller_phone', cs.caller_phone,
    'call_status', cs.call_status,
    'match_status', cs.match_status,
    'duration_seconds', cs.call_duration_seconds,
    'twilio_call_sid', cs.twilio_call_sid,
    'recipient_name', COALESCE(r.first_name || ' ' || r.last_name, 'Unknown'),
    'recipient_phone', r.phone,
    'campaign_name', c.name
  ),
  COALESCE(cs.call_started_at, cs.created_at, NOW())
FROM public.call_sessions cs
LEFT JOIN public.campaigns c ON c.id = cs.campaign_id
LEFT JOIN public.clients cl ON cl.id = c.client_id
LEFT JOIN public.recipients r ON r.id = cs.recipient_id
WHERE cs.is_simulated = false OR cs.is_simulated IS NULL
;

-- 2.7 Backfill from events table (campaign category)
INSERT INTO public.activity_log (
  category, event_type, status, client_id, organization_id, campaign_id, recipient_id, 
  description, metadata, created_at
)
SELECT 
  'campaign'::text,
  ev.event_type::text,
  'success'::text,
  c.client_id,
  cl.org_id,
  ev.campaign_id,
  ev.recipient_id,
  ev.event_type || ' event from ' || ev.source,
  jsonb_build_object(
    'source_table', 'events',
    'source_id', ev.id::text,
    'source', ev.source,
    'event_data', ev.event_data_json,
    'recipient_name', COALESCE(r.first_name || ' ' || r.last_name, 'Unknown'),
    'campaign_name', c.name
  ),
  COALESCE(ev.occurred_at, ev.created_at, NOW())
FROM public.events ev
LEFT JOIN public.campaigns c ON c.id = ev.campaign_id
LEFT JOIN public.clients cl ON cl.id = c.client_id
LEFT JOIN public.recipients r ON r.id = ev.recipient_id
;

-- 2.8 Backfill from sms_opt_in_log (communication category)
INSERT INTO public.activity_log (
  category, event_type, status, client_id, organization_id, campaign_id, recipient_id, 
  description, metadata, created_at
)
SELECT 
  'communication'::text,
  CASE 
    WHEN o.direction = 'inbound' AND o.status = 'received' AND UPPER(COALESCE(o.message_text, '')) IN ('YES', 'Y', 'YEAH', 'YEP', 'OK') THEN 'opt_in'
    WHEN o.direction = 'inbound' AND o.status = 'received' AND UPPER(COALESCE(o.message_text, '')) IN ('STOP', 'NO', 'CANCEL', 'UNSUBSCRIBE') THEN 'opt_out'
    WHEN o.direction = 'outbound' THEN 'sms_outbound'
    ELSE 'sms_inbound'
  END::text,
  CASE o.status 
    WHEN 'delivered' THEN 'success'
    WHEN 'sent' THEN 'success'
    WHEN 'received' THEN 'success'
    WHEN 'failed' THEN 'failed'
    ELSE 'pending'
  END::text,
  c.client_id,
  cl.org_id,
  o.campaign_id,
  o.recipient_id,
  'SMS opt-in ' || o.direction || ' - ' || o.status || ' to ' || o.phone,
  jsonb_build_object(
    'source_table', 'sms_opt_in_log',
    'source_id', o.id::text,
    'phone', o.phone,
    'direction', o.direction,
    'message_text', LEFT(o.message_text, 100),
    'status', o.status,
    'provider', o.provider_used,
    'call_session_id', o.call_session_id,
    'recipient_name', COALESCE(r.first_name || ' ' || r.last_name, 'Unknown'),
    'recipient_phone', r.phone,
    'campaign_name', c.name
  ),
  COALESCE(o.created_at, NOW())
FROM public.sms_opt_in_log o
LEFT JOIN public.campaigns c ON c.id = o.campaign_id
LEFT JOIN public.clients cl ON cl.id = c.client_id
LEFT JOIN public.recipients r ON r.id = o.recipient_id
;

-- ============================================================================
-- Step 4: Add unique index for future idempotent operations
-- ============================================================================
DROP INDEX IF EXISTS idx_activity_log_source_unique;
CREATE UNIQUE INDEX idx_activity_log_source_unique 
ON public.activity_log ((metadata->>'source_table'), (metadata->>'source_id'))
WHERE metadata->>'source_table' IS NOT NULL;

-- ============================================================================
-- Re-enable RLS
-- ============================================================================
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Log completion with counts
-- ============================================================================
DO $$
DECLARE
  v_total INTEGER;
  v_gift_card INTEGER;
  v_communication INTEGER;
  v_campaign INTEGER;
  v_user INTEGER;
  v_system INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.activity_log;
  SELECT COUNT(*) INTO v_gift_card FROM public.activity_log WHERE category = 'gift_card';
  SELECT COUNT(*) INTO v_communication FROM public.activity_log WHERE category = 'communication';
  SELECT COUNT(*) INTO v_campaign FROM public.activity_log WHERE category = 'campaign';
  SELECT COUNT(*) INTO v_user FROM public.activity_log WHERE category = 'user';
  SELECT COUNT(*) INTO v_system FROM public.activity_log WHERE category = 'system';
  
  RAISE NOTICE 'Activity log backfill V2 complete:';
  RAISE NOTICE '  Total: %', v_total;
  RAISE NOTICE '  Gift Card: %', v_gift_card;
  RAISE NOTICE '  Communication: %', v_communication;
  RAISE NOTICE '  Campaign: %', v_campaign;
  RAISE NOTICE '  User: %', v_user;
  RAISE NOTICE '  System: %', v_system;
END $$;
