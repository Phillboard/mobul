-- ============================================
-- Drop Duplicate Indexes
-- Remove redundant indexes flagged by Supabase linter
-- ============================================

-- campaigns: Drop one of {idx_campaigns_client_status, idx_campaigns_status_client}
DROP INDEX IF EXISTS public.idx_campaigns_status_client;

-- contacts: Drop one of {idx_contacts_is_simulated, idx_contacts_simulated}
DROP INDEX IF EXISTS public.idx_contacts_simulated;

-- gift_card_brands: Drop one of {idx_gift_card_brands_website, idx_gift_card_brands_website_url}
DROP INDEX IF EXISTS public.idx_gift_card_brands_website_url;

-- rate_limit_log: Drop one of {idx_rate_limit_cleanup, idx_rate_limit_log_created_at}
DROP INDEX IF EXISTS public.idx_rate_limit_log_created_at;

-- recipients: Drop one of {idx_recipients_audience, idx_recipients_audience_id}
DROP INDEX IF EXISTS public.idx_recipients_audience_id;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Duplicate indexes dropped successfully';
END $$;
