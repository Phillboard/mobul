-- Migration: Add indexes for unindexed foreign keys
-- This improves JOIN performance and CASCADE operations on foreign key relationships
-- Generated from Supabase linter: unindexed_foreign_keys warnings

-- ============================================================================
-- ACE Forms & Submissions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ace_form_submissions_recipient_id 
  ON public.ace_form_submissions(recipient_id);

CREATE INDEX IF NOT EXISTS idx_ace_forms_created_by 
  ON public.ace_forms(created_by);

-- ============================================================================
-- Activities
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_activities_created_by 
  ON public.activities(created_by);

-- ============================================================================
-- Admin Alerts & Notifications
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_admin_alerts_acknowledged_by 
  ON public.admin_alerts(acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_agent_id 
  ON public.admin_alerts(agent_id);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_campaign_id 
  ON public.admin_alerts(campaign_id);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_recipient_id 
  ON public.admin_alerts(recipient_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_acknowledged_by 
  ON public.admin_notifications(acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_campaign_id 
  ON public.admin_notifications(campaign_id);

-- ============================================================================
-- Agencies
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_agencies_twilio_configured_by 
  ON public.agencies(twilio_configured_by);

-- ============================================================================
-- Agency Client Assignments
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_agency_client_assignments_client_id 
  ON public.agency_client_assignments(client_id);

CREATE INDEX IF NOT EXISTS idx_agency_client_assignments_created_by_user_id 
  ON public.agency_client_assignments(created_by_user_id);

-- ============================================================================
-- API Keys
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_client_id 
  ON public.api_keys(client_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_created_by 
  ON public.api_keys(created_by);

-- ============================================================================
-- Audiences
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audiences_simulation_batch_id 
  ON public.audiences(simulation_batch_id);

-- ============================================================================
-- Bulk Code Uploads
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bulk_code_uploads_audience_id 
  ON public.bulk_code_uploads(audience_id);

CREATE INDEX IF NOT EXISTS idx_bulk_code_uploads_uploaded_by_user_id 
  ON public.bulk_code_uploads(uploaded_by_user_id);

-- ============================================================================
-- Call Center
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_call_center_scripts_created_by 
  ON public.call_center_scripts(created_by);

CREATE INDEX IF NOT EXISTS idx_call_conditions_met_recipient_id 
  ON public.call_conditions_met(recipient_id);

CREATE INDEX IF NOT EXISTS idx_call_dispositions_call_session_id 
  ON public.call_dispositions(call_session_id);

CREATE INDEX IF NOT EXISTS idx_call_dispositions_recipient_id 
  ON public.call_dispositions(recipient_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_tracked_number_id 
  ON public.call_sessions(tracked_number_id);

-- ============================================================================
-- Campaign Related
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaign_message_settings_email_template_id 
  ON public.campaign_message_settings(email_template_id);

CREATE INDEX IF NOT EXISTS idx_campaign_message_settings_sms_template_id 
  ON public.campaign_message_settings(sms_template_id);

CREATE INDEX IF NOT EXISTS idx_campaign_versions_created_by 
  ON public.campaign_versions(created_by);

CREATE INDEX IF NOT EXISTS idx_campaigns_audience_id 
  ON public.campaigns(audience_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_contact_list_id 
  ON public.campaigns(contact_list_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_by_user_id 
  ON public.campaigns(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_form_id 
  ON public.campaigns(form_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_template_id 
  ON public.campaigns(template_id);

-- ============================================================================
-- Clients
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_org_id 
  ON public.clients(org_id);

CREATE INDEX IF NOT EXISTS idx_clients_twilio_configured_by 
  ON public.clients(twilio_configured_by);

-- ============================================================================
-- Contacts Related
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contact_code_audit_changed_by 
  ON public.contact_code_audit(changed_by);

CREATE INDEX IF NOT EXISTS idx_contact_list_members_simulation_batch_id 
  ON public.contact_list_members(simulation_batch_id);

CREATE INDEX IF NOT EXISTS idx_contact_lists_simulation_batch_id 
  ON public.contact_lists(simulation_batch_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_simulation_batch_id 
  ON public.contact_tags(simulation_batch_id);

-- ============================================================================
-- Credit Transactions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_credit_transactions_credit_account_id 
  ON public.credit_transactions(credit_account_id);

-- ============================================================================
-- CRM Events
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_crm_events_call_session_id 
  ON public.crm_events(call_session_id);

CREATE INDEX IF NOT EXISTS idx_crm_events_campaign_id 
  ON public.crm_events(campaign_id);

-- ============================================================================
-- Documentation
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_documentation_feedback_user_id 
  ON public.documentation_feedback(user_id);

-- ============================================================================
-- Dr Phillip Chats
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dr_phillip_chats_client_id 
  ON public.dr_phillip_chats(client_id);

-- ============================================================================
-- Email Delivery
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_form_id 
  ON public.email_delivery_logs(form_id);

-- ============================================================================
-- Error Logs
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_by 
  ON public.error_logs(resolved_by);

-- ============================================================================
-- Gift Card Related
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_gift_card_billing_ledger_recipient_id 
  ON public.gift_card_billing_ledger(recipient_id);

CREATE INDEX IF NOT EXISTS idx_gift_card_provisioning_trace_brand_id 
  ON public.gift_card_provisioning_trace(brand_id);

-- ============================================================================
-- Landing Pages
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_landing_page_exports_exported_by_user_id 
  ON public.landing_page_exports(exported_by_user_id);

CREATE INDEX IF NOT EXISTS idx_landing_pages_simulation_batch_id 
  ON public.landing_pages(simulation_batch_id);

-- ============================================================================
-- Lead Purchases
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lead_purchases_audience_id 
  ON public.lead_purchases(audience_id);

CREATE INDEX IF NOT EXISTS idx_lead_purchases_client_id 
  ON public.lead_purchases(client_id);

CREATE INDEX IF NOT EXISTS idx_lead_purchases_lead_source_id 
  ON public.lead_purchases(lead_source_id);

-- ============================================================================
-- Mail Provider Settings
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mail_provider_settings_created_by_user_id 
  ON public.mail_provider_settings(created_by_user_id);

-- ============================================================================
-- Marketing Related
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_marketing_automation_enrollments_recipient_id 
  ON public.marketing_automation_enrollments(recipient_id);

CREATE INDEX IF NOT EXISTS idx_marketing_automation_steps_template_id 
  ON public.marketing_automation_steps(template_id);

CREATE INDEX IF NOT EXISTS idx_marketing_automations_created_by 
  ON public.marketing_automations(created_by);

CREATE INDEX IF NOT EXISTS idx_marketing_campaign_messages_template_id 
  ON public.marketing_campaign_messages(template_id);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by 
  ON public.marketing_campaigns(created_by);

CREATE INDEX IF NOT EXISTS idx_marketing_sends_message_id 
  ON public.marketing_sends(message_id);

-- ============================================================================
-- Organization Members
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_org_members_user_id 
  ON public.org_members(user_id);

-- ============================================================================
-- Performance Metrics
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id 
  ON public.performance_metrics(user_id);

-- ============================================================================
-- Recipient Related
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recipient_audit_log_call_session_id 
  ON public.recipient_audit_log(call_session_id);

CREATE INDEX IF NOT EXISTS idx_recipient_audit_log_performed_by_user_id 
  ON public.recipient_audit_log(performed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_recipient_gift_cards_revoked_by 
  ON public.recipient_gift_cards(revoked_by);

CREATE INDEX IF NOT EXISTS idx_recipients_approved_by_user_id 
  ON public.recipients(approved_by_user_id);

CREATE INDEX IF NOT EXISTS idx_recipients_approved_call_session_id 
  ON public.recipients(approved_call_session_id);

CREATE INDEX IF NOT EXISTS idx_recipients_enriched_by_user_id 
  ON public.recipients(enriched_by_user_id);

-- ============================================================================
-- Redemption Workflow
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_redemption_workflow_log_call_session_id 
  ON public.redemption_workflow_log(call_session_id);

-- ============================================================================
-- Role Permissions
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id 
  ON public.role_permissions(permission_id);

-- ============================================================================
-- Simulation Batches
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_simulation_batches_created_by 
  ON public.simulation_batches(created_by);

-- ============================================================================
-- SMS Related
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_campaign_id 
  ON public.sms_delivery_log(campaign_id);

CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_simulation_batch_id 
  ON public.sms_delivery_log(simulation_batch_id);

CREATE INDEX IF NOT EXISTS idx_sms_opt_in_log_campaign_id 
  ON public.sms_opt_in_log(campaign_id);

CREATE INDEX IF NOT EXISTS idx_sms_provider_settings_updated_by_user_id 
  ON public.sms_provider_settings(updated_by_user_id);

-- ============================================================================
-- Tasks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id 
  ON public.tasks(contact_id);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by 
  ON public.tasks(created_by);

-- ============================================================================
-- Templates
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_templates_simulation_batch_id 
  ON public.templates(simulation_batch_id);

-- ============================================================================
-- Usage Analytics
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id 
  ON public.usage_analytics(user_id);

-- ============================================================================
-- User Related
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_agencies_agency_id 
  ON public.user_agencies(agency_id);

CREATE INDEX IF NOT EXISTS idx_user_invitations_client_id 
  ON public.user_invitations(client_id);

CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by 
  ON public.user_invitations(invited_by);

CREATE INDEX IF NOT EXISTS idx_user_invitations_org_id 
  ON public.user_invitations(org_id);

CREATE INDEX IF NOT EXISTS idx_user_management_audit_actor_id 
  ON public.user_management_audit(actor_id);

CREATE INDEX IF NOT EXISTS idx_user_management_audit_target_user_id 
  ON public.user_management_audit(target_user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id 
  ON public.user_permissions(permission_id);

-- ============================================================================
-- Webhooks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id 
  ON public.webhook_logs(webhook_id);

CREATE INDEX IF NOT EXISTS idx_webhooks_client_id 
  ON public.webhooks(client_id);

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
  
  RAISE NOTICE 'Total indexes in public schema: %', index_count;
END $$;
