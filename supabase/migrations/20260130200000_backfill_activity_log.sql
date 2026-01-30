-- ============================================================================
-- Backfill Activity Log from Legacy Tables
-- ============================================================================
-- This migration populates the activity_log table with historical data from
-- existing legacy tables to provide immediate visibility into past events.
-- 
-- Source tables:
--   - error_logs         -> system category
--   - sms_delivery_log   -> communication category
--   - gift_card_billing_ledger -> gift_card category
--   - login_history      -> user category
--   - email_delivery_logs -> communication category
--   - call_sessions      -> communication category
--   - events             -> campaign category
--   - sms_opt_in_log     -> communication category
-- ============================================================================

-- Temporarily disable RLS for the backfill (we're using service role)
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. Backfill from error_logs (system category)
-- ============================================================================
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
  e.client_id,
  e.campaign_id,
  e.recipient_id,
  e.organization_id,
  COALESCE(LEFT(e.error_message, 500), 'System error'),
  jsonb_build_object(
    'source_table', 'error_logs',
    'source_id', e.id,
    'error_type', e.error_type,
    'function_name', e.function_name,
    'component_name', e.component_name,
    'error_code', e.error_code
  ),
  COALESCE(e.occurred_at, e.timestamp, NOW())
FROM public.error_logs e
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. Backfill from sms_delivery_log (communication category)
-- ============================================================================
INSERT INTO public.activity_log (
  category, event_type, status, campaign_id, recipient_id, 
  description, metadata, created_at
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
  s.campaign_id,
  s.recipient_id,
  'SMS ' || COALESCE(s.delivery_status, 'sent') || ' to ' || s.phone_number,
  jsonb_build_object(
    'source_table', 'sms_delivery_log',
    'source_id', s.id,
    'phone', s.phone_number,
    'provider', s.provider_used,
    'message_sid', s.twilio_message_sid,
    'gift_card_id', s.gift_card_id,
    'error_message', s.error_message
  ),
  COALESCE(s.delivered_at, s.created_at, NOW())
FROM public.sms_delivery_log s
WHERE s.is_simulated = false OR s.is_simulated IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. Backfill from gift_card_billing_ledger (gift_card category)
-- ============================================================================
-- First, get client_id from campaigns for proper linking
INSERT INTO public.activity_log (
  category, event_type, status, client_id, campaign_id, 
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
  -- Use billed_entity_id as client_id when entity type is 'client'
  CASE WHEN g.billed_entity_type = 'client' THEN g.billed_entity_id ELSE NULL END,
  g.campaign_id,
  g.recipient_id,
  COALESCE(g.transaction_type, 'provision') || ' $' || g.denomination || ' gift card',
  jsonb_build_object(
    'source_table', 'gift_card_billing_ledger',
    'source_id', g.id,
    'amount', g.denomination,
    'amount_billed', g.amount_billed,
    'brand_id', g.brand_id,
    'transaction_type', g.transaction_type,
    'inventory_card_id', g.inventory_card_id,
    'tillo_transaction_id', g.tillo_transaction_id
  ),
  COALESCE(g.billed_at, NOW())
FROM public.gift_card_billing_ledger g
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. Backfill from login_history (user category)
-- ============================================================================
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
    'source_id', l.id
  ),
  COALESCE(l.created_at, NOW())
FROM public.login_history l
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Backfill from email_delivery_logs (communication category)
-- ============================================================================
INSERT INTO public.activity_log (
  category, event_type, status, client_id, campaign_id, 
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
  e.client_id,
  e.campaign_id,
  e.recipient_id,
  'Email ' || COALESCE(e.delivery_status, 'sent') || ' to ' || e.recipient_email,
  jsonb_build_object(
    'source_table', 'email_delivery_logs',
    'source_id', e.id,
    'recipient_email', e.recipient_email,
    'subject', e.subject,
    'template_name', e.template_name,
    'provider_message_id', e.provider_message_id,
    'gift_card_id', e.gift_card_id
  ),
  COALESCE(e.sent_at, e.created_at, NOW())
FROM public.email_delivery_logs e
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Backfill from call_sessions (communication category)
-- ============================================================================
INSERT INTO public.activity_log (
  category, event_type, status, user_id, campaign_id, 
  recipient_id, description, metadata, created_at
)
SELECT 
  'communication'::text,
  CASE c.call_status 
    WHEN 'completed' THEN 'call_completed'
    WHEN 'no-answer' THEN 'call_no_answer'
    WHEN 'busy' THEN 'call_busy'
    WHEN 'failed' THEN 'call_failed'
    WHEN 'in-progress' THEN 'call_inbound'
    ELSE 'call_inbound'
  END::text,
  CASE c.call_status 
    WHEN 'completed' THEN 'success'
    WHEN 'failed' THEN 'failed'
    ELSE 'success'
  END::text,
  c.agent_user_id,
  c.campaign_id,
  c.recipient_id,
  'Call ' || COALESCE(c.call_status, 'received') || ' from ' || c.caller_phone,
  jsonb_build_object(
    'source_table', 'call_sessions',
    'source_id', c.id,
    'caller_phone', c.caller_phone,
    'call_status', c.call_status,
    'match_status', c.match_status,
    'duration_seconds', c.call_duration_seconds,
    'twilio_call_sid', c.twilio_call_sid
  ),
  COALESCE(c.call_started_at, c.created_at, NOW())
FROM public.call_sessions c
WHERE c.is_simulated = false OR c.is_simulated IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. Backfill from events table (campaign category)
-- ============================================================================
INSERT INTO public.activity_log (
  category, event_type, status, campaign_id, recipient_id, 
  description, metadata, created_at
)
SELECT 
  'campaign'::text,
  e.event_type::text,
  'success'::text,
  e.campaign_id,
  e.recipient_id,
  e.event_type || ' event from ' || e.source,
  jsonb_build_object(
    'source_table', 'events',
    'source_id', e.id,
    'source', e.source,
    'event_data', e.event_data_json
  ),
  COALESCE(e.occurred_at, e.created_at, NOW())
FROM public.events e
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. Backfill from sms_opt_in_log (communication category)
-- ============================================================================
INSERT INTO public.activity_log (
  category, event_type, status, campaign_id, recipient_id, 
  description, metadata, created_at
)
SELECT 
  'communication'::text,
  CASE 
    WHEN o.direction = 'inbound' AND o.status = 'received' AND UPPER(o.message_text) IN ('YES', 'Y', 'YEAH', 'YEP', 'OK') THEN 'opt_in'
    WHEN o.direction = 'inbound' AND o.status = 'received' AND UPPER(o.message_text) IN ('STOP', 'NO', 'CANCEL', 'UNSUBSCRIBE') THEN 'opt_out'
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
  o.campaign_id,
  o.recipient_id,
  'SMS opt-in ' || o.direction || ' - ' || o.status || ' to ' || o.phone,
  jsonb_build_object(
    'source_table', 'sms_opt_in_log',
    'source_id', o.id,
    'phone', o.phone,
    'direction', o.direction,
    'message_text', LEFT(o.message_text, 100),
    'status', o.status,
    'provider', o.provider_used,
    'call_session_id', o.call_session_id
  ),
  COALESCE(o.created_at, NOW())
FROM public.sms_opt_in_log o
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Re-enable RLS
-- ============================================================================
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Log completion
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.activity_log;
  RAISE NOTICE 'Activity log backfill complete. Total records: %', v_count;
END $$;
