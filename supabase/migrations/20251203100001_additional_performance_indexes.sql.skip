-- Additional Performance Optimization Indexes
-- Created: 2025-12-03
-- Purpose: Optimize queries for condition evaluation, monitoring, and credit system

-- =====================================================
-- CONDITION EVALUATION SYSTEM
-- These tables are queried heavily during condition processing
-- =====================================================

-- Recipient condition status - fast lookup by recipient
CREATE INDEX IF NOT EXISTS idx_recipient_condition_status_recipient
ON recipient_condition_status(recipient_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_recipient_condition_status_campaign
ON recipient_condition_status(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_recipient_condition_status_completed
ON recipient_condition_status(campaign_id)
WHERE status = 'completed';

-- Condition triggers - fast lookup for processing status
CREATE INDEX IF NOT EXISTS idx_condition_triggers_recipient
ON condition_triggers(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_condition_triggers_campaign_status
ON condition_triggers(campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_condition_triggers_processing
ON condition_triggers(campaign_id)
WHERE status = 'processing';

-- Campaign conditions - ordered by sequence for evaluation
CREATE INDEX IF NOT EXISTS idx_campaign_conditions_campaign_seq
ON campaign_conditions(campaign_id, sequence_order);

-- =====================================================
-- SMS OPT-IN TRACKING
-- Critical for call center verification
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sms_opt_ins_phone
ON sms_opt_ins(phone_number);

CREATE INDEX IF NOT EXISTS idx_sms_opt_ins_recipient_campaign
ON sms_opt_ins(recipient_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_sms_opt_ins_status
ON sms_opt_ins(campaign_id, opt_in_status);

-- SMS delivery log - for retry processing
CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_status
ON sms_delivery_log(delivery_status, retry_count)
WHERE delivery_status = 'failed' AND retry_count < 3;

CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_recipient
ON sms_delivery_log(recipient_id, created_at DESC);

-- =====================================================
-- MONITORING & ERROR TRACKING
-- Fast access to recent errors and metrics
-- =====================================================

-- Error logs - recent errors first
CREATE INDEX IF NOT EXISTS idx_error_logs_recent
ON error_logs(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_type_time
ON error_logs(error_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved
ON error_logs(occurred_at DESC)
WHERE resolved = false;

-- Performance metrics - by type and time
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_time
ON performance_metrics(metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint
ON performance_metrics(endpoint, recorded_at DESC)
WHERE endpoint IS NOT NULL;

-- Usage analytics - for dashboard queries
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_time
ON usage_analytics(user_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_analytics_action_time
ON usage_analytics(action_type, recorded_at DESC);

-- Security audit log - compliance queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user
ON security_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_action
ON security_audit_log(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_resource
ON security_audit_log(resource_type, resource_id, created_at DESC);

-- =====================================================
-- CREDIT SYSTEM
-- Fast balance lookups and transaction history
-- =====================================================

-- Credit accounts - by owner type
CREATE INDEX IF NOT EXISTS idx_credit_accounts_owner
ON credit_accounts(owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_active
ON credit_accounts(owner_type, owner_id)
WHERE is_active = true;

-- Credit transactions - for balance calculations
CREATE INDEX IF NOT EXISTS idx_credit_transactions_account
ON credit_transactions(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
ON credit_transactions(account_id, transaction_type);

-- =====================================================
-- CONTACTS SYSTEM
-- =====================================================

-- Contacts - for search and filtering
CREATE INDEX IF NOT EXISTS idx_contacts_client_email
ON contacts(client_id, email);

CREATE INDEX IF NOT EXISTS idx_contacts_client_phone
ON contacts(client_id, phone);

CREATE INDEX IF NOT EXISTS idx_contacts_created
ON contacts(client_id, created_at DESC);

-- =====================================================
-- RATE LIMITING
-- Fast rate check queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_lookup
ON rate_limit_tracking(endpoint, identifier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_cleanup
ON rate_limit_tracking(created_at)
WHERE created_at < NOW() - INTERVAL '24 hours';

-- =====================================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- =====================================================

-- Active campaigns only (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_campaigns_active_client
ON campaigns(client_id, updated_at DESC)
WHERE status = 'active';

-- Draft campaigns for editing
CREATE INDEX IF NOT EXISTS idx_campaigns_draft_client
ON campaigns(client_id, updated_at DESC)
WHERE status = 'draft';

-- Pending recipients requiring action
CREATE INDEX IF NOT EXISTS idx_recipients_pending_approval
ON recipients(audience_id, created_at DESC)
WHERE approval_status = 'pending';

-- =====================================================
-- ANALYZE TABLES
-- Update query planner statistics
-- =====================================================

ANALYZE recipient_condition_status;
ANALYZE condition_triggers;
ANALYZE campaign_conditions;
ANALYZE sms_opt_ins;
ANALYZE sms_delivery_log;
ANALYZE error_logs;
ANALYZE performance_metrics;
ANALYZE usage_analytics;
ANALYZE security_audit_log;
ANALYZE contacts;
ANALYZE rate_limit_tracking;

