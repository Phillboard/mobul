


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'tech_support',
    'agency_owner',
    'company_owner',
    'developer',
    'call_center'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."audience_source" AS ENUM (
    'import',
    'purchase',
    'manual'
);


ALTER TYPE "public"."audience_source" OWNER TO "postgres";


CREATE TYPE "public"."audience_status" AS ENUM (
    'processing',
    'ready',
    'failed'
);


ALTER TYPE "public"."audience_status" OWNER TO "postgres";


CREATE TYPE "public"."batch_status" AS ENUM (
    'pending',
    'printing',
    'mailed',
    'delivered'
);


ALTER TYPE "public"."batch_status" OWNER TO "postgres";


CREATE TYPE "public"."campaign_status" AS ENUM (
    'draft',
    'proofed',
    'in_production',
    'mailed',
    'completed',
    'approved',
    'active',
    'paused',
    'scheduled',
    'cancelled'
);


ALTER TYPE "public"."campaign_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."campaign_status" IS 'Campaign lifecycle statuses:
- draft: Initial state, campaign is being configured
- proofed: Campaign design has been proofed/reviewed
- scheduled: Campaign is scheduled to go live at a future date
- active: Campaign is live and accepting redemptions
- in_production: Mail pieces are being printed
- mailed: Mail pieces have been sent
- paused: Campaign temporarily suspended
- completed: Campaign has finished
- approved: Campaign has been approved for production
- cancelled: Campaign was cancelled';



CREATE TYPE "public"."industry_type" AS ENUM (
    'roofing',
    'rei',
    'auto_service',
    'auto_warranty',
    'auto_buyback',
    'retail_promo',
    'restaurant_promo',
    'healthcare_checkup',
    'legal_services',
    'financial_advisor',
    'fitness_gym',
    'roofing_services',
    'rei_postcard',
    'landscaping',
    'moving_company',
    'realtor_listing',
    'dental',
    'veterinary',
    'insurance',
    'home_services',
    'event_invite'
);


ALTER TYPE "public"."industry_type" OWNER TO "postgres";


CREATE TYPE "public"."lp_mode" AS ENUM (
    'bridge',
    'redirect'
);


ALTER TYPE "public"."lp_mode" OWNER TO "postgres";


CREATE TYPE "public"."org_type" AS ENUM (
    'internal',
    'agency'
);


ALTER TYPE "public"."org_type" OWNER TO "postgres";


CREATE TYPE "public"."postage_class" AS ENUM (
    'first_class',
    'standard'
);


ALTER TYPE "public"."postage_class" OWNER TO "postgres";


CREATE TYPE "public"."template_size" AS ENUM (
    '4x6',
    '6x9',
    '6x11',
    'letter',
    'trifold'
);


ALTER TYPE "public"."template_size" OWNER TO "postgres";


CREATE TYPE "public"."validation_status" AS ENUM (
    'valid',
    'invalid',
    'suppressed'
);


ALTER TYPE "public"."validation_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_client"("p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.clients
  SET archived_at = NOW()
  WHERE id = p_client_id AND archived_at IS NULL;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."archive_client"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_organization"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  -- Archive the organization
  UPDATE public.organizations
  SET archived_at = NOW()
  WHERE id = p_org_id AND archived_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Archive all clients under this organization
  UPDATE public.clients
  SET archived_at = NOW()
  WHERE org_id = p_org_id AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."archive_organization"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_repair_condition_gift_card_config"("p_condition_id" "uuid", "p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_brand_id UUID;
  v_denomination NUMERIC;
BEGIN
  -- First try client-specific gift cards
  SELECT cagc.brand_id, cagc.denomination 
  INTO v_brand_id, v_denomination
  FROM client_available_gift_cards cagc
  INNER JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
  WHERE cagc.client_id = p_client_id
    AND cagc.is_enabled = true
    AND gcb.is_enabled_by_admin = true
  ORDER BY gcb.brand_name, cagc.denomination
  LIMIT 1;
  
  -- Fallback to any enabled brand if no client-specific
  IF v_brand_id IS NULL THEN
    SELECT gcb.id, gcd.denomination
    INTO v_brand_id, v_denomination
    FROM gift_card_brands gcb
    INNER JOIN gift_card_denominations gcd ON gcd.brand_id = gcb.id
    WHERE gcb.is_enabled_by_admin = true
      AND gcd.is_enabled_by_admin = true
    ORDER BY gcb.brand_name, gcd.denomination
    LIMIT 1;
  END IF;
  
  -- If still no brand found, return false
  IF v_brand_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update the condition
  UPDATE campaign_conditions
  SET 
    brand_id = COALESCE(brand_id, v_brand_id),
    card_value = COALESCE(NULLIF(card_value, 0), v_denomination)
  WHERE id = p_condition_id
    AND (brand_id IS NULL OR card_value IS NULL OR card_value = 0);
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."auto_repair_condition_gift_card_config"("p_condition_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_repair_condition_gift_card_config"("p_condition_id" "uuid", "p_client_id" "uuid") IS 'Automatically repairs a condition by assigning the first available gift card brand and denomination for the client.';



CREATE OR REPLACE FUNCTION "public"."calculate_billing_amount"("p_brand_id" "uuid", "p_denomination" numeric, "p_billed_entity_type" "text", "p_billed_entity_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_is_agency BOOLEAN;
  v_price NUMERIC;
BEGIN
  -- Check if billing an agency
  v_is_agency := (p_billed_entity_type = 'agency');
  
  -- Get the appropriate price
  v_price := get_denomination_price(p_brand_id, p_denomination, v_is_agency);
  
  RETURN v_price;
END;
$$;


ALTER FUNCTION "public"."calculate_billing_amount"("p_brand_id" "uuid", "p_denomination" numeric, "p_billed_entity_type" "text", "p_billed_entity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_billing_amount"("p_brand_id" "uuid", "p_denomination" numeric, "p_billed_entity_type" "text", "p_billed_entity_id" "uuid") IS 'Calculates the amount to bill based on custom pricing configuration';



CREATE OR REPLACE FUNCTION "public"."calculate_engagement_score"("p_last_activity_date" timestamp with time zone, "p_total_interactions" integer, "p_redemptions_count" integer, "p_email_opens_count" integer) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_recency INTEGER := 0;
  v_frequency INTEGER := 0;
  v_campaign_engagement INTEGER := 0;
  v_days_since_activity INTEGER;
BEGIN
  -- Calculate recency score (0-40 points)
  IF p_last_activity_date IS NOT NULL THEN
    v_days_since_activity := EXTRACT(DAY FROM now() - p_last_activity_date)::INTEGER;
    v_recency := CASE
      WHEN v_days_since_activity < 7 THEN 40
      WHEN v_days_since_activity < 30 THEN 30
      WHEN v_days_since_activity < 90 THEN 15
      WHEN v_days_since_activity < 180 THEN 5
      ELSE 0
    END;
  END IF;

  -- Calculate frequency score (0-30 points)
  v_frequency := LEAST(FLOOR(LOG(COALESCE(p_total_interactions, 0) + 1) * 10), 30)::INTEGER;

  -- Calculate campaign engagement score (0-30 points)
  v_campaign_engagement := LEAST(
    (COALESCE(p_redemptions_count, 0) * 10) + (COALESCE(p_email_opens_count, 0) * 2),
    30
  )::INTEGER;

  RETURN v_recency + v_frequency + v_campaign_engagement;
END;
$$;


ALTER FUNCTION "public"."calculate_engagement_score"("p_last_activity_date" timestamp with time zone, "p_total_interactions" integer, "p_redemptions_count" integer, "p_email_opens_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_auto_reload"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_account RECORD;
BEGIN
  -- Only check on credit deductions that might trigger low balance
  IF NEW.total_remaining < OLD.total_remaining THEN
    SELECT * INTO v_account FROM credit_accounts WHERE id = NEW.id;
    
    -- Check if auto-reload is enabled and threshold is reached
    IF v_account.auto_reload_enabled = TRUE 
       AND NEW.total_remaining <= v_account.auto_reload_threshold
       AND v_account.stripe_customer_id IS NOT NULL
       AND v_account.auto_reload_failure_count < 3  -- Stop after 3 failures
    THEN
      -- Insert a record into a queue table for the Edge Function to process
      INSERT INTO auto_reload_queue (
        credit_account_id,
        stripe_customer_id,
        amount,
        current_balance,
        threshold,
        created_at
      ) VALUES (
        NEW.id,
        v_account.stripe_customer_id,
        v_account.auto_reload_amount,
        NEW.total_remaining,
        v_account.auto_reload_threshold,
        NOW()
      )
      ON CONFLICT (credit_account_id) 
      WHERE status = 'pending'
      DO NOTHING;  -- Don't create duplicate pending reloads
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_auto_reload"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_campaign_activation_credit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_client_id UUID;
  v_credit_balance NUMERIC(12,2);
  v_minimum_credit NUMERIC(12,2) := 100;  -- $100 minimum
BEGIN
  -- Only check when status is being changed to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Get the client_id from the campaign
    v_client_id := NEW.client_id;
    
    IF v_client_id IS NULL THEN
      -- If no client_id, allow (might be a platform-level campaign)
      RETURN NEW;
    END IF;
    
    -- Get the client's credit balance
    SELECT COALESCE(total_remaining, 0) 
    INTO v_credit_balance
    FROM credit_accounts
    WHERE entity_type = 'client' 
      AND entity_id = v_client_id;
    
    -- If no credit account found, check if client has legacy credits field
    IF v_credit_balance IS NULL THEN
      SELECT COALESCE(credits, 0)
      INTO v_credit_balance
      FROM clients
      WHERE id = v_client_id;
    END IF;
    
    -- If still null, default to 0
    v_credit_balance := COALESCE(v_credit_balance, 0);
    
    -- Check if balance meets minimum requirement
    IF v_credit_balance < v_minimum_credit THEN
      RAISE EXCEPTION 'Insufficient credits to activate campaign. Minimum required: $%. Current balance: $%. Please add credits to your account.',
        v_minimum_credit,
        v_credit_balance
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."check_campaign_activation_credit"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_campaign_activation_credit"() IS 'Enforces minimum $100 credit balance requirement for campaign activation. 
Prevents campaigns from being set to active status if client has insufficient credits.';



CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_endpoint" "text", "p_limit" integer DEFAULT 100, "p_window_seconds" integer DEFAULT 60) RETURNS TABLE("allowed" boolean, "current_count" bigint, "limit_value" integer, "retry_after" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count BIGINT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Count requests in current window
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at >= v_window_start;
  
  -- Return result
  RETURN QUERY
  SELECT 
    (v_count < p_limit) as allowed,
    v_count as current_count,
    p_limit as limit_value,
    p_window_seconds as retry_after;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_endpoint" "text", "p_limit" integer, "p_window_seconds" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_endpoint" "text", "p_limit" integer, "p_window_seconds" integer) IS 'Check if identifier has exceeded rate limit for endpoint';



CREATE OR REPLACE FUNCTION "public"."claim_card_atomic"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_condition_id" "uuid", "p_agent_id" "uuid" DEFAULT NULL::"uuid", "p_source" "text" DEFAULT 'call_center'::"text") RETURNS TABLE("card_id" "uuid", "card_code" "text", "card_number" "text", "card_value_amount" numeric, "pool_id" "uuid", "pool_name" "text", "brand_name" "text", "provider" "text", "already_assigned" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_pool_id UUID;
  v_card_id UUID;
  v_existing_assignment RECORD;
BEGIN
  -- Check if card already assigned for this recipient+condition
  SELECT * INTO v_existing_assignment
  FROM recipient_gift_cards rgc
  INNER JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id;
  
  IF FOUND THEN
    -- Already assigned, return existing card without charging again
    RETURN QUERY
    SELECT 
      gc.id AS card_id,
      gc.card_code,
      gc.card_number,
      gc.card_value AS card_value_amount,
      gc.pool_id,
      gcp.pool_name,
      gcb.brand_name,
      gcp.provider,
      TRUE AS already_assigned
    FROM gift_cards gc
    INNER JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
    INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
    WHERE gc.id = v_existing_assignment.gift_card_id;
    RETURN;
  END IF;
  
  -- Find best pool for this brand+value+client
  v_pool_id := select_best_pool_for_card(p_brand_id, p_card_value, p_client_id);
  
  IF v_pool_id IS NULL THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: No available cards for brand % with value %', p_brand_id, p_card_value;
  END IF;
  
  -- Lock and select an available card
  SELECT id INTO v_card_id
  FROM gift_cards
  WHERE pool_id = v_pool_id
    AND status = 'available'
    AND assigned_to_recipient_id IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'NO_CARDS_AVAILABLE: Pool exhausted during claim attempt';
  END IF;
  
  -- Update the card as claimed
  UPDATE gift_cards
  SET 
    status = 'claimed',
    assigned_to_recipient_id = p_recipient_id,
    assignment_locked_at = NOW(),
    assignment_source = p_source,
    assignment_campaign_id = p_campaign_id,
    assignment_condition_id = p_condition_id,
    claimed_at = NOW(),
    claimed_by_agent_id = p_agent_id,
    updated_at = NOW()
  WHERE id = v_card_id;
  
  -- Create recipient_gift_cards entry
  INSERT INTO recipient_gift_cards (
    recipient_id,
    campaign_id,
    condition_id,
    gift_card_id,
    assigned_at,
    delivery_status
  ) VALUES (
    p_recipient_id,
    p_campaign_id,
    p_condition_id,
    v_card_id,
    NOW(),
    'pending'
  );
  
  -- Update pool statistics
  UPDATE gift_card_pools
  SET 
    available_cards = available_cards - 1,
    claimed_cards = claimed_cards + 1,
    updated_at = NOW()
  WHERE id = v_pool_id;
  
  -- CHARGE CLIENT CREDITS for the gift card
  UPDATE clients
  SET credits = credits - p_card_value
  WHERE id = p_client_id;
  
  -- Return the claimed card details
  RETURN QUERY
  SELECT 
    gc.id AS card_id,
    gc.card_code,
    gc.card_number,
    gc.card_value AS card_value_amount,
    gc.pool_id,
    gcp.pool_name,
    gcb.brand_name,
    gcp.provider,
    FALSE AS already_assigned
  FROM gift_cards gc
  INNER JOIN gift_card_pools gcp ON gcp.id = gc.pool_id
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gc.id = v_card_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Claim failed: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."claim_card_atomic"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_condition_id" "uuid", "p_agent_id" "uuid", "p_source" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_card_atomic"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_condition_id" "uuid", "p_agent_id" "uuid", "p_source" "text") IS 'Atomically claims a gift card for a recipient, updates pool stats, and charges client credits';



CREATE OR REPLACE FUNCTION "public"."claim_gift_card_from_inventory"("p_brand_id" "uuid", "p_denomination" numeric, "p_recipient_id" "uuid", "p_campaign_id" "uuid") RETURNS TABLE("card_id" "uuid", "card_code" "text", "card_number" "text", "expiration_date" "date", "brand_name" "text", "brand_logo_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Lock and claim the first available card atomically
  UPDATE gift_card_inventory
  SET 
    status = 'assigned',
    assigned_to_recipient_id = p_recipient_id,
    assigned_to_campaign_id = p_campaign_id,
    assigned_at = NOW()
  WHERE id = (
    SELECT id FROM gift_card_inventory
    WHERE brand_id = p_brand_id
      AND denomination = p_denomination
      AND status = 'available'
      AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE)
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_card_id;
  
  -- If no card was claimed, return empty
  IF v_card_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return the claimed card details with brand info
  RETURN QUERY
  SELECT 
    gc.id as card_id,
    gc.card_code,
    gc.card_number,
    gc.expiration_date,
    gcb.brand_name,
    gcb.logo_url as brand_logo_url
  FROM gift_card_inventory gc
  JOIN gift_card_brands gcb ON gcb.id = gc.brand_id
  WHERE gc.id = v_card_id;
END;
$$;


ALTER FUNCTION "public"."claim_gift_card_from_inventory"("p_brand_id" "uuid", "p_denomination" numeric, "p_recipient_id" "uuid", "p_campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_gift_card_from_inventory"("p_brand_id" "uuid", "p_denomination" numeric, "p_recipient_id" "uuid", "p_campaign_id" "uuid") IS 'Atomically claims an available gift card from inventory and assigns it to a recipient';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_provisioning_traces"("p_days" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM gift_card_provisioning_trace
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_provisioning_traces"("p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_provisioning_traces"("p_days" integer) IS 'Clean up provisioning traces older than specified days';



CREATE OR REPLACE FUNCTION "public"."cleanup_rate_limit_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limit_log 
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."cleanup_rate_limit_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_rate_limit_logs"() IS 'Remove rate limit logs older than 24 hours';



CREATE OR REPLACE FUNCTION "public"."cleanup_rate_limit_tracking"("retention_hours" integer DEFAULT 24) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limit_tracking
  WHERE created_at < now() - (retention_hours || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_rate_limit_tracking"("retention_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_rate_limit_tracking"("retention_hours" integer) IS 'Cleans up old rate limit tracking entries older than specified hours';



CREATE OR REPLACE FUNCTION "public"."cleanup_stuck_gift_cards"() RETURNS TABLE("cleaned_count" integer, "card_ids" "uuid"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cleaned_count INTEGER;
  v_card_ids UUID[];
BEGIN
  -- Find cards stuck in 'claimed' for >10 minutes without successful delivery
  WITH stuck_cards AS (
    SELECT gc.id
    FROM gift_cards gc
    LEFT JOIN sms_delivery_log sdl 
      ON gc.id = sdl.gift_card_id 
      AND sdl.delivery_status IN ('sent', 'delivered')
    WHERE gc.status = 'claimed'
      AND gc.claimed_at < NOW() - INTERVAL '10 minutes'
      AND sdl.id IS NULL
  ),
  updated AS (
    UPDATE gift_cards
    SET 
      status = 'available',
      claimed_at = NULL,
      claimed_by_recipient_id = NULL
    WHERE id IN (SELECT id FROM stuck_cards)
    RETURNING id
  )
  SELECT ARRAY_AGG(id) INTO v_card_ids FROM updated;
  
  v_cleaned_count := COALESCE(array_length(v_card_ids, 1), 0);
  
  -- Log the cleanup if any cards were cleaned
  IF v_cleaned_count > 0 THEN
    INSERT INTO error_logs (
      error_type,
      error_message,
      component_name,
      request_data
    ) VALUES (
      'gift_card_cleanup',
      v_cleaned_count || ' stuck gift cards were automatically released back to pool',
      'cleanup_stuck_gift_cards',
      jsonb_build_object(
        'cleaned_count', v_cleaned_count,
        'card_ids', v_card_ids
      )
    );
  END IF;
  
  RETURN QUERY SELECT v_cleaned_count, v_card_ids;
END;
$$;


ALTER FUNCTION "public"."cleanup_stuck_gift_cards"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_can_use_gift_card"("p_client_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- Check if client has this gift card enabled
  SELECT is_enabled
  INTO v_enabled
  FROM client_available_gift_cards
  WHERE client_id = p_client_id
    AND brand_id = p_brand_id
    AND denomination = p_denomination;
  
  RETURN COALESCE(v_enabled, false);
END;
$$;


ALTER FUNCTION "public"."client_can_use_gift_card"("p_client_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."client_can_use_gift_card"("p_client_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric) IS 'Checks if client has enabled a specific brand-denomination combination.';



CREATE OR REPLACE FUNCTION "public"."create_system_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO public.system_alerts (
    alert_type,
    severity,
    title,
    message,
    metadata
  ) VALUES (
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    p_metadata
  )
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;


ALTER FUNCTION "public"."create_system_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_system_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") IS 'Creates a new system alert with specified parameters';



CREATE OR REPLACE FUNCTION "public"."delete_inventory_card"("p_card_id" "uuid", "p_force" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_status TEXT;
  v_card_code TEXT;
BEGIN
  -- Get card info
  SELECT status, card_code INTO v_status, v_card_code
  FROM gift_card_inventory
  WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found');
  END IF;
  
  -- Safety check: don't delete assigned or delivered cards unless forced
  IF NOT p_force AND v_status IN ('assigned', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot delete cards that are assigned or delivered. Use force=true to override.'
    );
  END IF;
  
  -- Delete the card (cascades to balance history)
  DELETE FROM gift_card_inventory WHERE id = p_card_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_card_code', LEFT(v_card_code, 4) || '****',
    'previous_status', v_status
  );
END;
$$;


ALTER FUNCTION "public"."delete_inventory_card"("p_card_id" "uuid", "p_force" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_invitations"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;


ALTER FUNCTION "public"."expire_old_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_brand_code_from_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.brand_code IS NULL OR NEW.brand_code = '' THEN
    NEW.brand_code := lower(regexp_replace(NEW.brand_name, '[^a-zA-Z0-9]+', '_', 'g'));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_brand_code_from_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_customer_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate format: ABC-1234 (3 letters + 4 digits)
    new_code := upper(substring(md5(random()::text) from 1 for 3)) || '-' || 
                lpad(floor(random() * 10000)::text, 4, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM contacts WHERE customer_code = new_code) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;


ALTER FUNCTION "public"."generate_customer_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_recipient_token"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  token TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    token := encode(extensions.gen_random_bytes(9), 'base64');
    token := REPLACE(token, '/', '');
    token := REPLACE(token, '+', '');
    token := REPLACE(token, '=', '');
    token := SUBSTRING(token, 1, 12);
    
    IF NOT EXISTS (SELECT 1 FROM public.recipients WHERE recipients.token = token) THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN token;
END;
$$;


ALTER FUNCTION "public"."generate_recipient_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_redemption_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  code TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    -- Generate 8 character alphanumeric code
    code := upper(substring(encode(extensions.gen_random_bytes(6), 'base64') from 1 for 8));
    code := REPLACE(code, '/', '');
    code := REPLACE(code, '+', '');
    code := REPLACE(code, '=', '');
    
    -- Ensure uniqueness
    IF NOT EXISTS (SELECT 1 FROM recipients WHERE redemption_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;


ALTER FUNCTION "public"."generate_redemption_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accessible_documentation"() RETURNS TABLE("id" "uuid", "category" "text", "title" "text", "slug" "text", "file_path" "text", "order_index" integer, "doc_audience" "text", "visible_to_roles" "public"."app_role"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT dp.id, dp.category, dp.title, dp.slug, dp.file_path, 
      dp.order_index, dp.doc_audience, dp.visible_to_roles
    FROM documentation_pages dp ORDER BY dp.category, dp.order_index, dp.title;
  ELSE
    RETURN QUERY SELECT dp.id, dp.category, dp.title, dp.slug, dp.file_path, 
      dp.order_index, dp.doc_audience, dp.visible_to_roles
    FROM documentation_pages dp
    WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY(dp.visible_to_roles))
    ORDER BY dp.category, dp.order_index, dp.title;
  END IF;
END; $$;


ALTER FUNCTION "public"."get_accessible_documentation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_audience_geo_distribution"("audience_id_param" "uuid") RETURNS TABLE("state" "text", "count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    r.state,
    COUNT(*)::BIGINT as count
  FROM public.recipients r
  WHERE r.audience_id = audience_id_param
  GROUP BY r.state
  ORDER BY count DESC;
$$;


ALTER FUNCTION "public"."get_audience_geo_distribution"("audience_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_brand_denominations"("p_client_id" "uuid") RETURNS TABLE("brand_id" "uuid", "brand_name" "text", "brand_logo" "text", "brand_category" "text", "card_value" numeric, "total_available" integer, "pool_ids" "uuid"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcb.id AS brand_id,
    gcb.brand_name,
    gcb.logo_url AS brand_logo,
    gcb.category AS brand_category,
    gcp.card_value,
    SUM(gcp.available_cards)::INTEGER AS total_available,
    ARRAY_AGG(gcp.id) AS pool_ids
  FROM gift_card_pools gcp
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gcp.client_id = p_client_id
    AND gcp.is_active = true
    AND gcp.available_cards > 0
  GROUP BY gcb.id, gcb.brand_name, gcb.logo_url, gcb.category, gcp.card_value
  HAVING SUM(gcp.available_cards) > 0
  ORDER BY gcb.brand_name, gcp.card_value;
END;
$$;


ALTER FUNCTION "public"."get_available_brand_denominations"("p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_brand_denominations"("p_client_id" "uuid") IS 'Aggregates gift card pools by brand and denomination, hiding pool structure from clients. Returns only combinations with available cards.';



CREATE OR REPLACE FUNCTION "public"."get_billing_entity_for_campaign"("p_campaign_id" "uuid") RETURNS TABLE("entity_type" "text", "entity_id" "uuid", "entity_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_agency_id UUID;
  v_agency_name TEXT;
  v_agency_billing_enabled BOOLEAN;
BEGIN
  -- Get campaign's client and check agency billing settings
  SELECT 
    c.client_id,
    cl.name,
    cl.agency_id,
    COALESCE(cl.agency_billing_enabled, false)
  INTO 
    v_client_id,
    v_client_name,
    v_agency_id,
    v_agency_billing_enabled
  FROM campaigns c
  JOIN clients cl ON cl.id = c.client_id
  WHERE c.id = p_campaign_id;
  
  -- If campaign not found, raise error
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found: %', p_campaign_id;
  END IF;
  
  -- If agency billing is enabled and agency exists, bill the agency
  IF v_agency_billing_enabled AND v_agency_id IS NOT NULL THEN
    SELECT name INTO v_agency_name
    FROM agencies
    WHERE id = v_agency_id;
    
    RETURN QUERY
    SELECT 
      'agency'::TEXT as entity_type,
      v_agency_id as entity_id,
      COALESCE(v_agency_name, 'Unknown Agency') as entity_name;
  ELSE
    -- Otherwise, bill the client
    RETURN QUERY
    SELECT 
      'client'::TEXT as entity_type,
      v_client_id as entity_id,
      COALESCE(v_client_name, 'Unknown Client') as entity_name;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_billing_entity_for_campaign"("p_campaign_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_billing_entity_for_campaign"("p_campaign_id" "uuid") IS 'Determines which entity (client or agency) should be billed for a campaign';



CREATE OR REPLACE FUNCTION "public"."get_brand_denomination_info"("p_client_id" "uuid", "p_brand_id" "uuid", "p_card_value" numeric) RETURNS TABLE("brand_name" "text", "brand_logo" "text", "total_available" integer, "pool_ids" "uuid"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcb.brand_name,
    gcb.logo_url AS brand_logo,
    SUM(gcp.available_cards)::INTEGER AS total_available,
    ARRAY_AGG(gcp.id) AS pool_ids
  FROM gift_card_pools gcp
  INNER JOIN gift_card_brands gcb ON gcb.id = gcp.brand_id
  WHERE gcp.client_id = p_client_id
    AND gcp.brand_id = p_brand_id
    AND gcp.card_value = p_card_value
    AND gcp.is_active = true
    AND gcp.available_cards > 0
  GROUP BY gcb.brand_name, gcb.logo_url;
END;
$$;


ALTER FUNCTION "public"."get_brand_denomination_info"("p_client_id" "uuid", "p_brand_id" "uuid", "p_card_value" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_brand_denomination_info"("p_client_id" "uuid", "p_brand_id" "uuid", "p_card_value" numeric) IS 'Gets details for a specific brand+value combination including total availability and pool IDs';



CREATE OR REPLACE FUNCTION "public"."get_brand_denominations_with_inventory"("p_brand_id" "uuid") RETURNS TABLE("denomination_id" "uuid", "denomination" numeric, "is_enabled_by_admin" boolean, "use_custom_pricing" boolean, "client_price" numeric, "agency_price" numeric, "cost_basis" numeric, "inventory_available" bigint, "inventory_assigned" bigint, "inventory_delivered" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcd.id as denomination_id,
    gcd.denomination,
    gcd.is_enabled_by_admin,
    COALESCE(gcd.use_custom_pricing, false) as use_custom_pricing,
    gcd.client_price,
    gcd.agency_price,
    gcd.cost_basis,
    COALESCE(COUNT(gci.id) FILTER (WHERE gci.status = 'available'), 0) as inventory_available,
    COALESCE(COUNT(gci.id) FILTER (WHERE gci.status = 'assigned'), 0) as inventory_assigned,
    COALESCE(COUNT(gci.id) FILTER (WHERE gci.status = 'delivered'), 0) as inventory_delivered
  FROM gift_card_denominations gcd
  LEFT JOIN gift_card_inventory gci ON gci.brand_id = gcd.brand_id AND gci.denomination = gcd.denomination
  WHERE gcd.brand_id = p_brand_id
  GROUP BY gcd.id, gcd.denomination, gcd.is_enabled_by_admin, gcd.use_custom_pricing, 
           gcd.client_price, gcd.agency_price, gcd.cost_basis
  ORDER BY gcd.denomination;
END;
$$;


ALTER FUNCTION "public"."get_brand_denominations_with_inventory"("p_brand_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_brand_denominations_with_inventory"("p_brand_id" "uuid") IS 'Returns denominations with inventory counts for a brand';



CREATE OR REPLACE FUNCTION "public"."get_client_gift_cards_with_details"("p_client_id" "uuid") RETURNS TABLE("client_gift_card_id" "uuid", "brand_id" "uuid", "brand_name" "text", "brand_code" "text", "brand_logo_url" "text", "brand_category" "text", "denomination" numeric, "is_enabled" boolean, "use_custom_pricing" boolean, "client_price" numeric, "inventory_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cagc.id as client_gift_card_id,
    gcb.id as brand_id,
    gcb.brand_name,
    gcb.brand_code,
    gcb.logo_url as brand_logo_url,
    gcb.category as brand_category,
    cagc.denomination,
    cagc.is_enabled,
    COALESCE(gcd.use_custom_pricing, false) as use_custom_pricing,
    gcd.client_price,
    COALESCE(COUNT(gci.id) FILTER (WHERE gci.status = 'available'), 0) as inventory_count
  FROM client_available_gift_cards cagc
  JOIN gift_card_brands gcb ON gcb.id = cagc.brand_id
  LEFT JOIN gift_card_denominations gcd ON gcd.brand_id = cagc.brand_id AND gcd.denomination = cagc.denomination
  LEFT JOIN gift_card_inventory gci ON gci.brand_id = cagc.brand_id AND gci.denomination = cagc.denomination
  WHERE cagc.client_id = p_client_id
    AND cagc.is_enabled = true
    AND gcb.is_enabled_by_admin = true
  GROUP BY cagc.id, gcb.id, gcb.brand_name, gcb.brand_code, gcb.logo_url, gcb.category, 
           cagc.denomination, cagc.is_enabled, gcd.use_custom_pricing, gcd.client_price
  ORDER BY gcb.brand_name, cagc.denomination;
END;
$$;


ALTER FUNCTION "public"."get_client_gift_cards_with_details"("p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_gift_cards_with_details"("p_client_id" "uuid") IS 'Returns all available gift cards for a client with inventory and pricing details';



CREATE OR REPLACE FUNCTION "public"."get_client_spending_summary"("p_client_id" "uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("total_spent" numeric, "total_cards" integer, "total_profit" numeric, "by_brand" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH spending AS (
    SELECT 
      SUM(amount_billed) as spent,
      COUNT(*) as cards,
      SUM(profit) as profit_sum,
      jsonb_object_agg(
        brand_name,
        jsonb_build_object(
          'count', brand_count,
          'total', brand_total
        )
      ) as brands
    FROM (
      SELECT 
        gcb.brand_name,
        COUNT(*) as brand_count,
        SUM(gbl.amount_billed) as brand_total
      FROM gift_card_billing_ledger gbl
      JOIN gift_card_brands gcb ON gcb.id = gbl.brand_id
      WHERE gbl.billed_entity_type = 'client'
        AND gbl.billed_entity_id = p_client_id
        AND (p_start_date IS NULL OR gbl.billed_at >= p_start_date)
        AND (p_end_date IS NULL OR gbl.billed_at <= p_end_date)
      GROUP BY gcb.brand_name
    ) brand_summary
  )
  SELECT 
    COALESCE(spent, 0),
    COALESCE(cards::INTEGER, 0),
    COALESCE(profit_sum, 0),
    COALESCE(brands, '{}'::jsonb)
  FROM spending;
END;
$$;


ALTER FUNCTION "public"."get_client_spending_summary"("p_client_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_spending_summary"("p_client_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) IS 'Returns spending summary for a client with breakdown by brand.';



CREATE OR REPLACE FUNCTION "public"."get_condition_gift_card_config"("p_condition_id" "uuid") RETURNS TABLE("condition_id" "uuid", "condition_number" integer, "condition_name" "text", "brand_id" "uuid", "card_value" numeric, "sms_template" "text", "brand_name" "text", "brand_code" "text", "tillo_brand_code" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id as condition_id,
    cc.condition_number,
    cc.condition_name,
    cc.brand_id,
    cc.card_value,
    cc.sms_template,
    gcb.brand_name,
    gcb.brand_code,
    gcb.tillo_brand_code
  FROM campaign_conditions cc
  LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
  WHERE cc.id = p_condition_id;
END;
$$;


ALTER FUNCTION "public"."get_condition_gift_card_config"("p_condition_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_condition_gift_card_config"("p_condition_id" "uuid") IS 'Returns gift card configuration for a campaign condition by ID';



CREATE OR REPLACE FUNCTION "public"."get_condition_with_readiness"("p_condition_id" "uuid") RETURNS TABLE("id" "uuid", "campaign_id" "uuid", "condition_number" integer, "condition_name" "text", "trigger_type" "text", "brand_id" "uuid", "card_value" numeric, "brand_name" "text", "is_active" boolean, "is_ready_for_provisioning" boolean, "missing_config" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.campaign_id,
    cc.condition_number,
    cc.condition_name,
    cc.trigger_type,
    cc.brand_id,
    cc.card_value,
    gcb.brand_name,
    cc.is_active,
    (cc.is_active AND cc.brand_id IS NOT NULL AND cc.card_value IS NOT NULL AND cc.card_value > 0) AS is_ready_for_provisioning,
    CASE 
      WHEN NOT cc.is_active THEN 'Condition is inactive'
      WHEN cc.brand_id IS NULL AND (cc.card_value IS NULL OR cc.card_value = 0) THEN 'Missing gift card brand and value - edit campaign to configure'
      WHEN cc.brand_id IS NULL THEN 'Missing gift card brand - edit campaign to configure'
      WHEN cc.card_value IS NULL OR cc.card_value = 0 THEN 'Missing gift card value - edit campaign to configure'
      ELSE NULL
    END AS missing_config
  FROM campaign_conditions cc
  LEFT JOIN gift_card_brands gcb ON gcb.id = cc.brand_id
  WHERE cc.id = p_condition_id;
END;
$$;


ALTER FUNCTION "public"."get_condition_with_readiness"("p_condition_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_condition_with_readiness"("p_condition_id" "uuid") IS 'Returns condition details along with gift card configuration readiness status.';



CREATE OR REPLACE FUNCTION "public"."get_conditions_missing_gift_card_config"() RETURNS TABLE("condition_id" "uuid", "campaign_id" "uuid", "campaign_name" "text", "client_id" "uuid", "client_name" "text", "condition_number" integer, "condition_name" "text", "brand_id" "uuid", "card_value" numeric, "is_active" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id AS condition_id,
    cc.campaign_id,
    c.name AS campaign_name,
    c.client_id,
    cl.name AS client_name,
    cc.condition_number,
    cc.condition_name,
    cc.brand_id,
    cc.card_value,
    cc.is_active,
    cc.created_at
  FROM campaign_conditions cc
  INNER JOIN campaigns c ON c.id = cc.campaign_id
  LEFT JOIN clients cl ON cl.id = c.client_id
  WHERE (cc.brand_id IS NULL OR cc.card_value IS NULL OR cc.card_value = 0)
    AND cc.is_active = true
  ORDER BY cc.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_conditions_missing_gift_card_config"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_conditions_missing_gift_card_config"() IS 'Returns all active campaign conditions that are missing gift card configuration (brand_id or card_value). These conditions will fail during gift card provisioning.';



CREATE OR REPLACE FUNCTION "public"."get_critical_errors_needing_attention"() RETURNS TABLE("id" "uuid", "message" "text", "category" "text", "occurred_at" timestamp with time zone, "context" "jsonb", "user_id" "uuid", "client_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.id,
    el.message,
    el.category,
    el.occurred_at,
    el.context,
    el.user_id,
    el.client_id
  FROM error_logs el
  WHERE el.severity = 'critical'
    AND el.resolved = FALSE
    AND el.occurred_at >= NOW() - INTERVAL '7 days'
  ORDER BY el.occurred_at DESC
  LIMIT 50;
END;
$$;


ALTER FUNCTION "public"."get_critical_errors_needing_attention"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_critical_errors_needing_attention"() IS 'Get unresolved critical errors for admin dashboard';



CREATE OR REPLACE FUNCTION "public"."get_denomination_price"("p_brand_id" "uuid", "p_denomination" numeric, "p_for_agency" boolean DEFAULT false) RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_denom RECORD;
  v_price NUMERIC;
BEGIN
  SELECT * INTO v_denom
  FROM gift_card_denominations
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Return face value if no denomination config exists
    RETURN p_denomination;
  END IF;
  
  -- Use custom pricing if enabled
  IF v_denom.use_custom_pricing THEN
    IF p_for_agency AND v_denom.agency_price IS NOT NULL THEN
      RETURN v_denom.agency_price;
    ELSIF v_denom.client_price IS NOT NULL THEN
      RETURN v_denom.client_price;
    END IF;
  END IF;
  
  -- Default to face value
  RETURN p_denomination;
END;
$$;


ALTER FUNCTION "public"."get_denomination_price"("p_brand_id" "uuid", "p_denomination" numeric, "p_for_agency" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_denomination_price"("p_brand_id" "uuid", "p_denomination" numeric, "p_for_agency" boolean) IS 'Returns the effective price for a denomination, considering custom pricing';



CREATE OR REPLACE FUNCTION "public"."get_error_rate"("p_time_window_minutes" integer DEFAULT 60, "p_severity" "text" DEFAULT NULL::"text") RETURNS TABLE("error_count" bigint, "errors_per_minute" numeric, "top_categories" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH error_stats AS (
    SELECT 
      COUNT(*) as total_errors,
      COUNT(*)::NUMERIC / p_time_window_minutes as rate,
      jsonb_object_agg(category, cat_count) as categories
    FROM (
      SELECT 
        category,
        COUNT(*) as cat_count
      FROM error_logs
      WHERE occurred_at >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
        AND (p_severity IS NULL OR severity = p_severity)
      GROUP BY category
    ) cat_counts
  )
  SELECT 
    total_errors,
    rate,
    categories
  FROM error_stats;
END;
$$;


ALTER FUNCTION "public"."get_error_rate"("p_time_window_minutes" integer, "p_severity" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_error_rate"("p_time_window_minutes" integer, "p_severity" "text") IS 'Calculate error rate over time window for monitoring dashboards';



CREATE OR REPLACE FUNCTION "public"."get_error_stats"("p_hours" integer DEFAULT 24) RETURNS TABLE("total_errors" bigint, "critical_count" bigint, "error_count" bigint, "warning_count" bigint, "info_count" bigint, "unresolved_count" bigint, "top_sources" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE severity IN ('critical')) as critical,
      COUNT(*) FILTER (WHERE severity IN ('high', 'error')) as errors,
      COUNT(*) FILTER (WHERE severity IN ('medium', 'warning')) as warnings,
      COUNT(*) FILTER (WHERE severity IN ('low', 'info')) as info,
      COUNT(*) FILTER (WHERE resolved = false) as unresolved
    FROM error_logs
    WHERE COALESCE(timestamp, created_at) > now() - (p_hours || ' hours')::interval
  ),
  top_src AS (
    SELECT jsonb_agg(
      jsonb_build_object('source', src, 'count', cnt)
      ORDER BY cnt DESC
    ) as sources
    FROM (
      SELECT COALESCE(source, 'unknown') as src, COUNT(*) as cnt
      FROM error_logs
      WHERE COALESCE(timestamp, created_at) > now() - (p_hours || ' hours')::interval
      GROUP BY COALESCE(source, 'unknown')
      ORDER BY cnt DESC
      LIMIT 10
    ) s
  )
  SELECT
    stats.total,
    stats.critical,
    stats.errors,
    stats.warnings,
    stats.info,
    stats.unresolved,
    COALESCE(top_src.sources, '[]'::jsonb)
  FROM stats, top_src;
END;
$$;


ALTER FUNCTION "public"."get_error_stats"("p_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inventory_count"("p_brand_id" "uuid", "p_denomination" numeric) RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM gift_card_inventory
  WHERE brand_id = p_brand_id
    AND denomination = p_denomination
    AND status = 'available'
    AND (expiration_date IS NULL OR expiration_date > CURRENT_DATE);
  
  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_inventory_count"("p_brand_id" "uuid", "p_denomination" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_inventory_count"("p_brand_id" "uuid", "p_denomination" numeric) IS 'Returns count of available gift cards for a specific brand and denomination';



CREATE OR REPLACE FUNCTION "public"."get_manageable_users_paginated"("_requesting_user_id" "uuid", "_search" "text" DEFAULT NULL::"text", "_role_filter" "public"."app_role" DEFAULT NULL::"public"."app_role", "_org_filter" "uuid" DEFAULT NULL::"uuid", "_client_filter" "uuid" DEFAULT NULL::"uuid", "_show_inactive" boolean DEFAULT false, "_limit" integer DEFAULT 20, "_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "email" "text", "full_name" "text", "created_at" timestamp with time zone, "is_active" boolean, "roles" "public"."app_role"[], "org_ids" "uuid"[], "org_names" "text"[], "client_ids" "uuid"[], "client_names" "text"[], "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _requesting_user_role app_role;
  _requesting_user_org_id uuid;
  _requesting_user_client_id uuid;
BEGIN
  -- Get requesting user's highest privilege role
  SELECT role INTO _requesting_user_role
  FROM user_roles
  WHERE user_id = _requesting_user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'tech_support' THEN 2
    WHEN 'agency_owner' THEN 3
    WHEN 'company_owner' THEN 4
    WHEN 'developer' THEN 5
    WHEN 'call_center' THEN 6
  END
  LIMIT 1;

  -- Get requesting user's org and client
  SELECT om.org_id INTO _requesting_user_org_id
  FROM org_members om
  WHERE om.user_id = _requesting_user_id
  LIMIT 1;

  SELECT cu.client_id INTO _requesting_user_client_id
  FROM client_users cu
  WHERE cu.user_id = _requesting_user_id
  LIMIT 1;

  -- Return users based on requesting user's scope
  RETURN QUERY
  WITH user_data AS (
    SELECT DISTINCT
      p.id,
      p.email,
      p.full_name,
      p.created_at,
      p.is_active,
      ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles,
      ARRAY_AGG(DISTINCT om.org_id) FILTER (WHERE om.org_id IS NOT NULL) as org_ids,
      ARRAY_AGG(DISTINCT o.name) FILTER (WHERE o.name IS NOT NULL) as org_names,
      ARRAY_AGG(DISTINCT cu.client_id) FILTER (WHERE cu.client_id IS NOT NULL) as client_ids,
      ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as client_names
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN org_members om ON om.user_id = p.id
    LEFT JOIN organizations o ON o.id = om.org_id
    LEFT JOIN client_users cu ON cu.user_id = p.id
    LEFT JOIN clients c ON c.id = cu.client_id
    WHERE 
      -- Scope filtering based on requesting user's role
      (_requesting_user_role IN ('admin', 'tech_support')
        OR (_requesting_user_role = 'agency_owner' AND (om.org_id = _requesting_user_org_id OR cu.client_id IN (
          SELECT cl.id FROM clients cl WHERE cl.org_id = _requesting_user_org_id
        )))
        OR (_requesting_user_role = 'company_owner' AND cu.client_id = _requesting_user_client_id)
      )
      -- Search filter
      AND (_search IS NULL OR 
        p.email ILIKE '%' || _search || '%' OR 
        p.full_name ILIKE '%' || _search || '%')
      -- Role filter
      AND (_role_filter IS NULL OR ur.role = _role_filter)
      -- Org filter
      AND (_org_filter IS NULL OR om.org_id = _org_filter)
      -- Client filter
      AND (_client_filter IS NULL OR cu.client_id = _client_filter)
      -- Active status filter
      AND (_show_inactive = true OR p.is_active = true)
    GROUP BY p.id, p.email, p.full_name, p.created_at, p.is_active
  ),
  total AS (
    SELECT COUNT(*) as cnt FROM user_data
  )
  SELECT 
    ud.*,
    t.cnt as total_count
  FROM user_data ud
  CROSS JOIN total t
  ORDER BY ud.created_at DESC
  LIMIT _limit
  OFFSET _offset;
END;
$$;


ALTER FUNCTION "public"."get_manageable_users_paginated"("_requesting_user_id" "uuid", "_search" "text", "_role_filter" "public"."app_role", "_org_filter" "uuid", "_client_filter" "uuid", "_show_inactive" boolean, "_limit" integer, "_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_minimum_campaign_activation_credit"() RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $_$
BEGIN
  RETURN 100;  -- $100 minimum
END;
$_$;


ALTER FUNCTION "public"."get_minimum_campaign_activation_credit"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_minimum_campaign_activation_credit"() IS 'Returns the minimum credit balance required to activate a campaign ($100)';



CREATE OR REPLACE FUNCTION "public"."get_provisioning_dashboard_summary"() RETURNS TABLE("total_attempts_24h" bigint, "successful_24h" bigint, "failed_24h" bigint, "success_rate_24h" numeric, "avg_duration_ms" numeric, "p95_duration_ms" numeric, "campaigns_with_issues" bigint, "conditions_needing_config" bigint, "top_error_code" "text", "top_error_count" bigint, "error_rate_trend" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_rate NUMERIC;
  v_previous_rate NUMERIC;
BEGIN
  RETURN QUERY
  WITH last_24h AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY request_id
  ),
  previous_24h AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - INTERVAL '48 hours'
      AND created_at < NOW() - INTERVAL '24 hours'
    GROUP BY request_id
  ),
  error_stats AS (
    SELECT 
      error_code,
      COUNT(*) as cnt
    FROM gift_card_provisioning_trace
    WHERE status = 'failed'
      AND error_code IS NOT NULL
      AND created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY error_code
    ORDER BY cnt DESC
    LIMIT 1
  ),
  duration_stats AS (
    SELECT 
      AVG(total_duration) as avg_dur,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration) as p95_dur
    FROM (
      SELECT request_id, SUM(duration_ms) as total_duration
      FROM gift_card_provisioning_trace
      WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND duration_ms IS NOT NULL
      GROUP BY request_id
    ) durations
  )
  SELECT 
    COUNT(*)::BIGINT as total_attempts_24h,
    COUNT(*) FILTER (WHERE is_failed = 0)::BIGINT as successful_24h,
    COUNT(*) FILTER (WHERE is_failed = 1)::BIGINT as failed_24h,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_failed = 0) / NULLIF(COUNT(*), 0), 2) as success_rate_24h,
    ROUND((SELECT avg_dur FROM duration_stats), 2) as avg_duration_ms,
    ROUND((SELECT p95_dur FROM duration_stats), 2) as p95_duration_ms,
    (SELECT COUNT(DISTINCT campaign_id) FROM v_active_provisioning_issues)::BIGINT as campaigns_with_issues,
    (SELECT COUNT(*) FROM v_active_provisioning_issues)::BIGINT as conditions_needing_config,
    (SELECT error_code FROM error_stats) as top_error_code,
    (SELECT cnt FROM error_stats) as top_error_count,
    CASE 
      WHEN (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM last_24h) <
           (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM previous_24h) - 0.05
        THEN 'improving'
      WHEN (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM last_24h) >
           (SELECT SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) FROM previous_24h) + 0.05
        THEN 'degrading'
      ELSE 'stable'
    END as error_rate_trend
  FROM last_24h;
END;
$$;


ALTER FUNCTION "public"."get_provisioning_dashboard_summary"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_provisioning_dashboard_summary"() IS 'Get comprehensive dashboard summary for provisioning health';



CREATE OR REPLACE FUNCTION "public"."get_provisioning_error_rate_realtime"("p_window_minutes" integer DEFAULT 60) RETURNS TABLE("window_start" timestamp with time zone, "window_end" timestamp with time zone, "total_requests" bigint, "failed_requests" bigint, "error_rate" numeric, "errors_per_minute" numeric, "is_elevated" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH request_stats AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - (p_window_minutes || ' minutes')::INTERVAL
    GROUP BY request_id
  )
  SELECT 
    NOW() - (p_window_minutes || ' minutes')::INTERVAL as window_start,
    NOW() as window_end,
    COUNT(*)::BIGINT as total_requests,
    SUM(is_failed)::BIGINT as failed_requests,
    ROUND(100.0 * SUM(is_failed) / NULLIF(COUNT(*), 0), 2) as error_rate,
    ROUND(SUM(is_failed)::NUMERIC / p_window_minutes, 2) as errors_per_minute,
    SUM(is_failed)::NUMERIC / NULLIF(COUNT(*), 0) > 0.1 as is_elevated  -- >10% error rate
  FROM request_stats;
END;
$$;


ALTER FUNCTION "public"."get_provisioning_error_rate_realtime"("p_window_minutes" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_provisioning_error_rate_realtime"("p_window_minutes" integer) IS 'Get real-time error rate for provisioning within a time window';



CREATE OR REPLACE FUNCTION "public"."get_provisioning_error_stats"("p_hours" integer DEFAULT 24) RETURNS TABLE("error_code" "text", "occurrence_count" bigint, "last_occurred" timestamp with time zone, "affected_campaigns" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.error_code,
    COUNT(*) as occurrence_count,
    MAX(t.created_at) as last_occurred,
    COUNT(DISTINCT t.campaign_id) as affected_campaigns
  FROM gift_card_provisioning_trace t
  WHERE t.status = 'failed'
    AND t.error_code IS NOT NULL
    AND t.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY t.error_code
  ORDER BY occurrence_count DESC;
END;
$$;


ALTER FUNCTION "public"."get_provisioning_error_stats"("p_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_provisioning_error_stats"("p_hours" integer) IS 'Get error code statistics for monitoring';



CREATE OR REPLACE FUNCTION "public"."get_provisioning_health"("p_hours" integer DEFAULT 24) RETURNS TABLE("total_attempts" bigint, "successful_attempts" bigint, "failed_attempts" bigint, "success_rate" numeric, "avg_duration_ms" numeric, "top_error_code" "text", "top_error_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH attempt_stats AS (
    SELECT 
      request_id,
      MAX(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as is_failed,
      SUM(duration_ms) as total_duration
    FROM gift_card_provisioning_trace
    WHERE created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY request_id
  ),
  error_stats AS (
    SELECT 
      error_code,
      COUNT(*) as error_count
    FROM gift_card_provisioning_trace
    WHERE status = 'failed'
      AND error_code IS NOT NULL
      AND created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY error_code
    ORDER BY error_count DESC
    LIMIT 1
  )
  SELECT 
    COUNT(*)::BIGINT as total_attempts,
    COUNT(*) FILTER (WHERE is_failed = 0)::BIGINT as successful_attempts,
    COUNT(*) FILTER (WHERE is_failed = 1)::BIGINT as failed_attempts,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE is_failed = 0) / NULLIF(COUNT(*), 0),
      2
    ) as success_rate,
    ROUND(AVG(total_duration), 2) as avg_duration_ms,
    (SELECT error_code FROM error_stats) as top_error_code,
    (SELECT error_count FROM error_stats) as top_error_count
  FROM attempt_stats;
END;
$$;


ALTER FUNCTION "public"."get_provisioning_health"("p_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_provisioning_health"("p_hours" integer) IS 'Get overall provisioning health metrics';



CREATE OR REPLACE FUNCTION "public"."get_provisioning_trace"("p_request_id" "text") RETURNS TABLE("step_number" integer, "step_name" "text", "status" "text", "duration_ms" integer, "details" "jsonb", "error_message" "text", "error_code" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.step_number,
    t.step_name,
    t.status,
    t.duration_ms,
    t.details,
    t.error_message,
    t.error_code,
    t.created_at
  FROM gift_card_provisioning_trace t
  WHERE t.request_id = p_request_id
  ORDER BY t.step_number, t.created_at;
END;
$$;


ALTER FUNCTION "public"."get_provisioning_trace"("p_request_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_provisioning_trace"("p_request_id" "text") IS 'Get full step-by-step trace for a provisioning request';



CREATE OR REPLACE FUNCTION "public"."get_rate_limit_stats"("p_time_window_hours" integer DEFAULT 24) RETURNS TABLE("endpoint" "text", "total_requests" bigint, "unique_identifiers" bigint, "top_identifier" "text", "top_identifier_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rll.endpoint,
    COUNT(*) as total_requests,
    COUNT(DISTINCT rll.identifier) as unique_identifiers,
    (
      SELECT identifier 
      FROM rate_limit_log 
      WHERE endpoint = rll.endpoint 
        AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
      GROUP BY identifier 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as top_identifier,
    (
      SELECT COUNT(*) 
      FROM rate_limit_log 
      WHERE endpoint = rll.endpoint 
        AND identifier = (
          SELECT identifier 
          FROM rate_limit_log 
          WHERE endpoint = rll.endpoint 
            AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
          GROUP BY identifier 
          ORDER BY COUNT(*) DESC 
          LIMIT 1
        )
        AND created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
    ) as top_identifier_count
  FROM rate_limit_log rll
  WHERE rll.created_at >= NOW() - (p_time_window_hours || ' hours')::INTERVAL
  GROUP BY rll.endpoint
  ORDER BY total_requests DESC;
END;
$$;


ALTER FUNCTION "public"."get_rate_limit_stats"("p_time_window_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_rate_limit_stats"("p_time_window_hours" integer) IS 'Get rate limiting statistics for monitoring';



CREATE OR REPLACE FUNCTION "public"."get_recent_provisioning_failures"("p_limit" integer DEFAULT 50, "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_hours" integer DEFAULT 24) RETURNS TABLE("request_id" "text", "campaign_id" "uuid", "recipient_id" "uuid", "brand_id" "uuid", "denomination" numeric, "failure_step" integer, "failure_step_name" "text", "error_message" "text", "error_code" "text", "failed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (t.request_id)
    t.request_id,
    t.campaign_id,
    t.recipient_id,
    t.brand_id,
    t.denomination,
    t.step_number as failure_step,
    t.step_name as failure_step_name,
    t.error_message,
    t.error_code,
    t.created_at as failed_at
  FROM gift_card_provisioning_trace t
  WHERE t.status = 'failed'
    AND t.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    AND (p_campaign_id IS NULL OR t.campaign_id = p_campaign_id)
  ORDER BY t.request_id, t.step_number DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_recent_provisioning_failures"("p_limit" integer, "p_campaign_id" "uuid", "p_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recent_provisioning_failures"("p_limit" integer, "p_campaign_id" "uuid", "p_hours" integer) IS 'Get recent provisioning failures with error details';



CREATE OR REPLACE FUNCTION "public"."get_recipient_gift_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") RETURNS TABLE("gift_card_id" "uuid", "assigned_at" timestamp with time zone, "delivered_at" timestamp with time zone, "delivery_status" "text", "card_code" "text", "card_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rgc.gift_card_id,
    rgc.assigned_at,
    rgc.delivered_at,
    rgc.delivery_status,
    gc.card_code,
    gc.card_value
  FROM recipient_gift_cards rgc
  INNER JOIN gift_cards gc ON gc.id = rgc.gift_card_id
  WHERE rgc.recipient_id = p_recipient_id
    AND rgc.condition_id = p_condition_id;
END;
$$;


ALTER FUNCTION "public"."get_recipient_gift_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_sms_provider_settings"() RETURNS TABLE("primary_provider" "text", "enable_fallback" boolean, "infobip_enabled" boolean, "infobip_base_url" "text", "infobip_sender_id" "text", "twilio_enabled" boolean, "fallback_on_error" boolean, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.primary_provider,
    s.enable_fallback,
    s.infobip_enabled,
    s.infobip_base_url,
    s.infobip_sender_id,
    s.twilio_enabled,
    s.fallback_on_error,
    s.updated_at
  FROM sms_provider_settings s
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_sms_provider_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(available_cards), 0)::INTEGER INTO v_total
  FROM gift_card_pools
  WHERE client_id = p_client_id
    AND brand_id = p_brand_id
    AND card_value = p_card_value
    AND is_active = true;
  
  RETURN v_total;
END;
$$;


ALTER FUNCTION "public"."get_total_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_total_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") IS 'Returns total available cards across all pools for a brand+denomination';



CREATE OR REPLACE FUNCTION "public"."get_user_client_ids"("_user_id" "uuid") RETURNS TABLE("client_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT client_id FROM client_users WHERE user_id = _user_id;
$$;


ALTER FUNCTION "public"."get_user_client_ids"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org_ids"("_user_id" "uuid") RETURNS TABLE("org_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT org_id FROM org_members WHERE user_id = _user_id;
$$;


ALTER FUNCTION "public"."get_user_org_ids"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("_user_id" "uuid") RETURNS TABLE("permission_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT DISTINCT p.name
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role = ur.role
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id
  
  UNION
  
  SELECT DISTINCT p.name
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = _user_id AND up.granted = true;
$$;


ALTER FUNCTION "public"."get_user_permissions"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role_level"("_user_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(MIN(rh.level), 999)
  FROM public.user_roles ur
  JOIN public.role_hierarchy rh ON rh.role = ur.role
  WHERE ur.user_id = _user_id;
$$;


ALTER FUNCTION "public"."get_user_role_level"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Create profile for the new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Extract email domain (case insensitive)
  email_domain := LOWER(SPLIT_PART(NEW.email, '@', 2));
  
  -- Auto-assign admin role for Mobul.com or Fuelreset.com domains
  IF email_domain = 'mobul.com' OR email_domain = 'fuelreset.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE LOG 'Auto-assigned admin role to user % with email %', NEW.id, NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates profile for new users. Auto-assigns admin role for users with @mobul.com or @fuelreset.com email domains.';



CREATE OR REPLACE FUNCTION "public"."has_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM gift_card_pools
    WHERE client_id = p_client_id
      AND brand_id = p_brand_id
      AND card_value = p_card_value
      AND is_active = true
      AND available_cards > 0
  );
END;
$$;


ALTER FUNCTION "public"."has_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") IS 'Quick check if any pools have available cards for a brand+denomination combination';



CREATE OR REPLACE FUNCTION "public"."has_permission"("_user_id" "uuid", "_permission_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- Check user-specific permission override (revoked)
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id 
        AND p.name = _permission_name
        AND up.granted = false
    ) THEN false
    -- Check user-specific permission grant
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = _user_id 
        AND p.name = _permission_name
        AND up.granted = true
    ) THEN true
    -- Check role-based permissions
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id
        AND p.name = _permission_name
    ) THEN true
    ELSE false
  END;
$$;


ALTER FUNCTION "public"."has_permission"("_user_id" "uuid", "_permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_form_stat"("form_id" "uuid", "stat_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF stat_name = 'views' THEN
    UPDATE ace_forms SET total_views = total_views + 1 WHERE id = form_id;
  ELSIF stat_name = 'submissions' THEN
    UPDATE ace_forms SET total_submissions = total_submissions + 1 WHERE id = form_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."increment_form_stat"("form_id" "uuid", "stat_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_landing_page_tokens"("page_id" "uuid", "tokens_used" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE landing_pages
  SET 
    generation_tokens = generation_tokens + tokens_used,
    updated_at = NOW()
  WHERE id = page_id;
END;
$$;


ALTER FUNCTION "public"."increment_landing_page_tokens"("page_id" "uuid", "tokens_used" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_card_available_for_assignment"("card_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gift_cards
    WHERE id = card_id
      AND status = 'available'
      AND assigned_to_recipient_id IS NULL
  );
END;
$$;


ALTER FUNCTION "public"."is_card_available_for_assignment"("card_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_code_unique_for_client"("code" "text", "client_uuid" "uuid", "exclude_contact_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  code_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM contacts 
    WHERE client_id = client_uuid 
      AND customer_code = code
      AND (exclude_contact_id IS NULL OR id != exclude_contact_id)
  ) INTO code_exists;
  
  RETURN NOT code_exists;
END;
$$;


ALTER FUNCTION "public"."is_code_unique_for_client"("code" "text", "client_uuid" "uuid", "exclude_contact_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_condition_ready_for_provisioning"("p_condition_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_brand_id UUID;
  v_card_value NUMERIC;
  v_is_active BOOLEAN;
BEGIN
  SELECT brand_id, card_value, is_active
  INTO v_brand_id, v_card_value, v_is_active
  FROM campaign_conditions
  WHERE id = p_condition_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Condition must be active and have both brand_id and card_value
  RETURN v_is_active 
    AND v_brand_id IS NOT NULL 
    AND v_card_value IS NOT NULL 
    AND v_card_value > 0;
END;
$$;


ALTER FUNCTION "public"."is_condition_ready_for_provisioning"("p_condition_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_condition_ready_for_provisioning"("p_condition_id" "uuid") IS 'Checks if a campaign condition has all required gift card configuration for provisioning.';



CREATE OR REPLACE FUNCTION "public"."log_customer_code_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF OLD.customer_code IS DISTINCT FROM NEW.customer_code THEN
    INSERT INTO public.contact_code_audit (
      contact_id,
      old_code,
      new_code,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.customer_code,
      NEW.customer_code,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_customer_code_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_error"("p_error_type" "text", "p_severity" "text", "p_source" "text", "p_error_message" "text", "p_error_stack" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_recipient_id" "uuid" DEFAULT NULL::"uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_organization_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_request_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO error_logs (
    error_type,
    severity,
    source,
    error_message,
    error_stack,
    user_id,
    recipient_id,
    campaign_id,
    organization_id,
    metadata,
    request_id,
    timestamp
  ) VALUES (
    p_error_type,
    CASE p_severity 
      WHEN 'info' THEN 'low'
      WHEN 'warning' THEN 'medium'
      WHEN 'error' THEN 'high'
      WHEN 'critical' THEN 'critical'
      ELSE p_severity
    END,
    p_source,
    p_error_message,
    p_error_stack,
    p_user_id,
    p_recipient_id,
    p_campaign_id,
    p_organization_id,
    p_metadata,
    p_request_id,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_error"("p_error_type" "text", "p_severity" "text", "p_source" "text", "p_error_message" "text", "p_error_stack" "text", "p_user_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_organization_id" "uuid", "p_metadata" "jsonb", "p_request_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_rate_limit_request"("p_identifier" "text", "p_endpoint" "text", "p_user_agent" "text" DEFAULT NULL::"text", "p_request_method" "text" DEFAULT NULL::"text", "p_request_path" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO rate_limit_log (
    identifier,
    endpoint,
    user_agent,
    request_method,
    request_path,
    metadata
  ) VALUES (
    p_identifier,
    p_endpoint,
    p_user_agent,
    p_request_method,
    p_request_path,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_rate_limit_request"("p_identifier" "text", "p_endpoint" "text", "p_user_agent" "text", "p_request_method" "text", "p_request_path" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_rate_limit_request"("p_identifier" "text", "p_endpoint" "text", "p_user_agent" "text", "p_request_method" "text", "p_request_path" "text", "p_metadata" "jsonb") IS 'Log an API request for rate limiting purposes';



CREATE OR REPLACE FUNCTION "public"."lookup_gift_card_by_redemption_code"("p_code" "text") RETURNS TABLE("card_id" "uuid", "card_code" "text", "card_number" "text", "denomination" numeric, "expiration_date" "date", "recipient_first_name" "text", "recipient_last_name" "text", "brand_name" "text", "brand_logo_url" "text", "brand_color" "text", "balance_check_url" "text", "redemption_instructions" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gci.id AS card_id,
    gci.card_code,
    gci.card_number,
    gci.denomination,
    gci.expiration_date,
    r.first_name AS recipient_first_name,
    r.last_name AS recipient_last_name,
    gcb.brand_name,
    gcb.logo_url AS brand_logo_url,
    gcb.brand_color,
    gcb.balance_check_url,
    gcb.redemption_instructions
  FROM gift_card_inventory gci
  JOIN recipients r ON gci.assigned_to_recipient_id = r.id
  LEFT JOIN gift_card_brands gcb ON gci.brand_id = gcb.id
  WHERE UPPER(r.redemption_code) = UPPER(p_code)
    AND gci.status = 'assigned'
  ORDER BY gci.assigned_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."lookup_gift_card_by_redemption_code"("p_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."lookup_gift_card_by_redemption_code"("p_code" "text") IS 'Looks up an assigned gift card by recipient redemption code. 
Uses SECURITY DEFINER to bypass RLS and ensure consistent results 
regardless of the calling context (frontend vs edge function).';



CREATE OR REPLACE FUNCTION "public"."mark_card_delivered"("p_card_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE gift_card_inventory
  SET 
    status = 'delivered',
    delivered_at = NOW()
  WHERE id = p_card_id
    AND status = 'assigned';
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."mark_card_delivered"("p_card_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_card_delivered"("p_card_id" "uuid") IS 'Marks an assigned card as delivered.';



CREATE OR REPLACE FUNCTION "public"."migrate_condition_to_brand_value"("p_condition_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_pool_id UUID;
  v_brand_id UUID;
  v_card_value NUMERIC;
  v_updated BOOLEAN := FALSE;
BEGIN
  -- Get pool_id from condition
  SELECT gift_card_pool_id INTO v_pool_id
  FROM campaign_conditions
  WHERE id = p_condition_id
    AND brand_id IS NULL  -- Only migrate if not already done
    AND gift_card_pool_id IS NOT NULL;
  
  IF v_pool_id IS NOT NULL THEN
    -- Get brand_id and card_value from pool
    SELECT brand_id, card_value INTO v_brand_id, v_card_value
    FROM gift_card_pools
    WHERE id = v_pool_id;
    
    IF v_brand_id IS NOT NULL THEN
      -- Update condition with brand+value
      UPDATE campaign_conditions
      SET 
        brand_id = v_brand_id,
        card_value = v_card_value,
        updated_at = NOW()
      WHERE id = p_condition_id;
      
      v_updated := TRUE;
    END IF;
  END IF;
  
  RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."migrate_condition_to_brand_value"("p_condition_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_condition_to_brand_value"("p_condition_id" "uuid") IS 'Migrates a legacy condition from pool_id format to brand_id+card_value format';



CREATE OR REPLACE FUNCTION "public"."migrate_contact_code"("contact_uuid" "uuid", "new_code" "text", "migration_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  contact_client_id uuid;
  code_is_unique boolean;
BEGIN
  -- Get the contact's client_id
  SELECT client_id INTO contact_client_id
  FROM public.contacts
  WHERE id = contact_uuid;
  
  IF contact_client_id IS NULL THEN
    RAISE EXCEPTION 'Contact not found: %', contact_uuid;
  END IF;
  
  -- Check if new code is unique for this client
  SELECT is_code_unique_for_client(new_code, contact_client_id, contact_uuid) 
  INTO code_is_unique;
  
  IF NOT code_is_unique THEN
    RAISE EXCEPTION 'Code % is already in use for this client', new_code;
  END IF;
  
  -- Validate format
  IF NOT validate_unique_code_format(new_code) THEN
    RAISE EXCEPTION 'Invalid code format: %', new_code;
  END IF;
  
  -- Update the contact
  UPDATE public.contacts
  SET customer_code = new_code
  WHERE id = contact_uuid;
  
  -- Log the reason if provided
  IF migration_reason IS NOT NULL THEN
    UPDATE public.contact_code_audit
    SET reason = migration_reason
    WHERE contact_id = contact_uuid
      AND new_code = new_code
      AND changed_at = (
        SELECT MAX(changed_at)
        FROM public.contact_code_audit
        WHERE contact_id = contact_uuid
      );
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."migrate_contact_code"("contact_uuid" "uuid", "new_code" "text", "migration_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_contact_code"("contact_uuid" "uuid", "new_code" "text", "migration_reason" "text") IS 'Safely migrate a contact''s unique code with validation and audit logging';



CREATE OR REPLACE FUNCTION "public"."notify_pool_empty"("p_pool_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_pool RECORD;
  v_campaign RECORD;
  v_notification_id UUID;
BEGIN
  SELECT pool_name, client_id INTO v_pool
  FROM gift_card_pools
  WHERE id = p_pool_id;

  SELECT name INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id;

  INSERT INTO admin_notifications (
    notification_type,
    title,
    message,
    metadata,
    priority,
    client_id,
    campaign_id,
    pool_id
  ) VALUES (
    'pool_empty',
    'Gift Card Pool Empty',
    format('Pool "%s" has no available cards. Campaign "%s" attempted to provision a card but failed.', 
           v_pool.pool_name, v_campaign.name),
    jsonb_build_object(
      'pool_id', p_pool_id,
      'pool_name', v_pool.pool_name,
      'campaign_id', p_campaign_id,
      'campaign_name', v_campaign.name,
      'recipient_id', p_recipient_id,
      'timestamp', NOW()
    ),
    'high',
    v_pool.client_id,
    p_campaign_id,
    p_pool_id
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."notify_pool_empty"("p_pool_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."platform_admin_exists"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE role = 'admin'
  );
$$;


ALTER FUNCTION "public"."platform_admin_exists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recipient_has_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM recipient_gift_cards
    WHERE recipient_id = p_recipient_id
      AND condition_id = p_condition_id
  );
END;
$$;


ALTER FUNCTION "public"."recipient_has_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric DEFAULT NULL::numeric, "p_inventory_card_id" "uuid" DEFAULT NULL::"uuid", "p_tillo_transaction_id" "text" DEFAULT NULL::"text", "p_tillo_order_reference" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Validate inputs
  IF p_amount_billed < 0 THEN
    RAISE EXCEPTION 'Amount billed cannot be negative';
  END IF;
  
  IF p_cost_basis IS NOT NULL AND p_cost_basis < 0 THEN
    RAISE EXCEPTION 'Cost basis cannot be negative';
  END IF;
  
  -- Insert billing record
  INSERT INTO gift_card_billing_ledger (
    transaction_type,
    billed_entity_type,
    billed_entity_id,
    campaign_id,
    recipient_id,
    brand_id,
    denomination,
    amount_billed,
    cost_basis,
    inventory_card_id,
    tillo_transaction_id,
    tillo_order_reference,
    metadata
  ) VALUES (
    p_transaction_type,
    p_billed_entity_type,
    p_billed_entity_id,
    p_campaign_id,
    p_recipient_id,
    p_brand_id,
    p_denomination,
    p_amount_billed,
    p_cost_basis,
    p_inventory_card_id,
    p_tillo_transaction_id,
    p_tillo_order_reference,
    p_metadata
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;


ALTER FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb") IS 'Creates immutable billing ledger entry for gift card transactions.';



CREATE OR REPLACE FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric DEFAULT NULL::numeric, "p_inventory_card_id" "uuid" DEFAULT NULL::"uuid", "p_tillo_transaction_id" "text" DEFAULT NULL::"text", "p_tillo_order_reference" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Insert billing transaction
  INSERT INTO gift_card_billing_ledger (
    transaction_type,
    billed_entity_type,
    billed_entity_id,
    campaign_id,
    recipient_id,
    brand_id,
    denomination,
    amount_billed,
    cost_basis,
    inventory_card_id,
    tillo_transaction_id,
    tillo_order_reference,
    metadata,
    notes,
    billed_at
  ) VALUES (
    p_transaction_type,
    p_billed_entity_type,
    p_billed_entity_id,
    p_campaign_id,
    p_recipient_id,
    p_brand_id,
    p_denomination,
    p_amount_billed,
    p_cost_basis,
    p_inventory_card_id,
    p_tillo_transaction_id,
    p_tillo_order_reference,
    p_metadata,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;


ALTER FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_client"("p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.clients
  SET archived_at = NULL
  WHERE id = p_client_id AND archived_at IS NOT NULL;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."restore_client"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_organization"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Restore the organization
  UPDATE public.organizations
  SET archived_at = NULL
  WHERE id = p_org_id AND archived_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Also restore all clients under this organization
  UPDATE public.clients
  SET archived_at = NULL
  WHERE org_id = p_org_id AND archived_at IS NOT NULL;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."restore_organization"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."select_best_pool_for_card"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_pool_id UUID;
BEGIN
  -- Select pool with most available cards
  -- This ensures we distribute load across pools and maximize longevity
  SELECT id INTO v_pool_id
  FROM gift_card_pools
  WHERE client_id = p_client_id
    AND brand_id = p_brand_id
    AND card_value = p_card_value
    AND is_active = true
    AND available_cards > 0
  ORDER BY available_cards DESC, created_at ASC
  LIMIT 1;
  
  RETURN v_pool_id;
END;
$$;


ALTER FUNCTION "public"."select_best_pool_for_card"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."select_best_pool_for_card"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") IS 'Selects the optimal pool for a brand+denomination combination. Prioritizes pools with more inventory.';



CREATE OR REPLACE FUNCTION "public"."set_customer_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only generate if null or empty
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_customer_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_as_admin"("user_email" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Update the user's metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{app_role}',
    '"admin"'
  )
  WHERE email = user_email;
  
  GET DIAGNOSTICS user_count = ROW_COUNT;
  
  IF user_count = 0 THEN
    RETURN 'User not found with email: ' || user_email;
  ELSE
    RETURN 'Successfully set ' || user_email || ' as admin';
  END IF;
END;
$$;


ALTER FUNCTION "public"."set_user_as_admin"("user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_user_as_admin"("user_email" "text") IS 'Sets a user as admin by email. Call with: SELECT set_user_as_admin(''your-email@example.com'');';



CREATE OR REPLACE FUNCTION "public"."sync_recipient_to_participation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Only process if recipient has a contact_id
  IF NEW.contact_id IS NOT NULL THEN
    -- Get campaign_id from audience
    SELECT c.id INTO v_campaign_id
    FROM public.audiences a
    INNER JOIN public.campaigns c ON c.audience_id = a.id
    WHERE a.id = NEW.audience_id
    LIMIT 1;
    
    IF v_campaign_id IS NOT NULL THEN
      INSERT INTO public.contact_campaign_participation (
        contact_id,
        campaign_id,
        recipient_id,
        participation_status,
        redemption_code,
        participated_at,
        delivered_at,
        redeemed_at,
        gift_card_id
      )
      VALUES (
        NEW.contact_id,
        v_campaign_id,
        NEW.id,
        CASE 
          WHEN NEW.redemption_completed_at IS NOT NULL THEN 'redeemed'
          WHEN NEW.approval_status = 'approved' THEN 'delivered'
          ELSE 'sent'
        END,
        NEW.redemption_code,
        NEW.created_at,
        NEW.approved_at,
        NEW.redemption_completed_at,
        NEW.gift_card_assigned_id
      )
      ON CONFLICT (contact_id, campaign_id) 
      DO UPDATE SET
        participation_status = CASE 
          WHEN NEW.redemption_completed_at IS NOT NULL THEN 'redeemed'
          WHEN NEW.approval_status = 'approved' THEN 'delivered'
          ELSE 'sent'
        END,
        delivered_at = NEW.approved_at,
        redeemed_at = NEW.redemption_completed_at,
        gift_card_id = NEW.gift_card_assigned_id,
        updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_recipient_to_participation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_engagement_score"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.engagement_score := calculate_engagement_score(
    NEW.last_activity_date,
    NEW.total_interactions,
    NEW.redemptions_count,
    NEW.email_opens_count
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contact_engagement_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contacts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contacts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_email_delivery_logs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_email_delivery_logs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_gift_card_delivery_status"("p_recipient_id" "uuid", "p_condition_id" "uuid", "p_delivery_status" "text", "p_delivered_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_delivery_method" "text" DEFAULT NULL::"text", "p_delivery_address" "text" DEFAULT NULL::"text", "p_delivery_error" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE recipient_gift_cards
  SET 
    delivery_status = p_delivery_status,
    delivered_at = COALESCE(p_delivered_at, delivered_at),
    delivery_method = COALESCE(p_delivery_method, delivery_method),
    delivery_address = COALESCE(p_delivery_address, delivery_address),
    delivery_error = p_delivery_error,
    updated_at = NOW()
  WHERE recipient_id = p_recipient_id
    AND condition_id = p_condition_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  IF v_updated THEN
    UPDATE gift_cards gc
    SET 
      status = CASE 
        WHEN p_delivery_status = 'delivered' THEN 'delivered'
        WHEN p_delivery_status = 'failed' THEN 'failed'
        ELSE gc.status
      END,
      updated_at = NOW()
    WHERE gc.id = (
      SELECT gift_card_id 
      FROM recipient_gift_cards 
      WHERE recipient_id = p_recipient_id 
        AND condition_id = p_condition_id
    );
  END IF;
  
  RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."update_gift_card_delivery_status"("p_recipient_id" "uuid", "p_condition_id" "uuid", "p_delivery_status" "text", "p_delivered_at" timestamp with time zone, "p_delivery_method" "text", "p_delivery_address" "text", "p_delivery_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_inventory_card_balance"("p_card_id" "uuid", "p_new_balance" numeric, "p_status" "text" DEFAULT 'success'::"text", "p_error_message" "text" DEFAULT NULL::"text", "p_checked_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_previous_balance NUMERIC;
  v_result JSONB;
BEGIN
  -- Get current balance
  SELECT current_balance INTO v_previous_balance
  FROM gift_card_inventory
  WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Card not found');
  END IF;
  
  -- Update the card
  UPDATE gift_card_inventory
  SET 
    current_balance = p_new_balance,
    last_balance_check = NOW(),
    balance_check_status = p_status,
    balance_check_error = p_error_message
  WHERE id = p_card_id;
  
  -- Record in history
  INSERT INTO gift_card_inventory_balance_history (
    inventory_card_id,
    previous_balance,
    new_balance,
    check_method,
    check_status,
    error_message,
    checked_by_user_id
  ) VALUES (
    p_card_id,
    v_previous_balance,
    p_new_balance,
    'api',
    p_status,
    p_error_message,
    p_checked_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_previous_balance,
    'new_balance', p_new_balance,
    'change_amount', COALESCE(p_new_balance, 0) - COALESCE(v_previous_balance, 0)
  );
END;
$$;


ALTER FUNCTION "public"."update_inventory_card_balance"("p_card_id" "uuid", "p_new_balance" numeric, "p_status" "text", "p_error_message" "text", "p_checked_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_landing_page_scores"("page_id" "uuid", "seo_score_value" integer DEFAULT NULL::integer, "accessibility_score_value" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE landing_pages
  SET 
    seo_score = COALESCE(seo_score_value, seo_score),
    accessibility_score = COALESCE(accessibility_score_value, accessibility_score),
    updated_at = NOW()
  WHERE id = page_id;
END;
$$;


ALTER FUNCTION "public"."update_landing_page_scores"("page_id" "uuid", "seo_score_value" integer, "accessibility_score_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_recipient_gift_cards_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_recipient_gift_cards_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sms_provider_settings"("p_primary_provider" "text" DEFAULT NULL::"text", "p_enable_fallback" boolean DEFAULT NULL::boolean, "p_infobip_enabled" boolean DEFAULT NULL::boolean, "p_infobip_base_url" "text" DEFAULT NULL::"text", "p_infobip_sender_id" "text" DEFAULT NULL::"text", "p_twilio_enabled" boolean DEFAULT NULL::boolean, "p_fallback_on_error" boolean DEFAULT NULL::boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  -- Get existing settings ID
  SELECT id INTO v_settings_id FROM sms_provider_settings LIMIT 1;
  
  IF v_settings_id IS NULL THEN
    RAISE EXCEPTION 'SMS provider settings not initialized';
  END IF;
  
  -- Update only provided fields
  UPDATE sms_provider_settings
  SET
    primary_provider = COALESCE(p_primary_provider, primary_provider),
    enable_fallback = COALESCE(p_enable_fallback, enable_fallback),
    infobip_enabled = COALESCE(p_infobip_enabled, infobip_enabled),
    infobip_base_url = COALESCE(p_infobip_base_url, infobip_base_url),
    infobip_sender_id = COALESCE(p_infobip_sender_id, infobip_sender_id),
    twilio_enabled = COALESCE(p_twilio_enabled, twilio_enabled),
    fallback_on_error = COALESCE(p_fallback_on_error, fallback_on_error),
    updated_by_user_id = auth.uid()
  WHERE id = v_settings_id;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."update_sms_provider_settings"("p_primary_provider" "text", "p_enable_fallback" boolean, "p_infobip_enabled" boolean, "p_infobip_base_url" "text", "p_infobip_sender_id" "text", "p_twilio_enabled" boolean, "p_fallback_on_error" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_client"("_user_id" "uuid", "_client_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- Admins can access all clients
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
  OR
  -- Agency owners can access clients in their org
  EXISTS (
    SELECT 1 
    FROM clients c
    JOIN org_members om ON om.org_id = c.org_id
    JOIN user_roles ur ON ur.user_id = om.user_id
    WHERE c.id = _client_id 
      AND om.user_id = _user_id
      AND ur.role = 'agency_owner'
  )
  OR
  -- Users directly assigned to the client
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_id = _client_id AND user_id = _user_id
  );
$$;


ALTER FUNCTION "public"."user_can_access_client"("_user_id" "uuid", "_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_manage_role"("_user_id" "uuid", "_target_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_hierarchy rh ON rh.role = ur.role
    WHERE ur.user_id = _user_id AND _target_role = ANY(rh.can_manage_roles)
  );
$$;


ALTER FUNCTION "public"."user_can_manage_role"("_user_id" "uuid", "_target_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_client_access"("_user_id" "uuid", "_client_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_users
    WHERE client_id = _client_id
      AND user_id = _user_id
  )
$$;


ALTER FUNCTION "public"."user_has_client_access"("_user_id" "uuid", "_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_org_access"("_user_id" "uuid", "_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  -- Admins can access all orgs
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
  OR
  -- Org members can access their org
  EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = _org_id AND user_id = _user_id
  );
$$;


ALTER FUNCTION "public"."user_has_org_access"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_org_member"("_user_id" "uuid", "_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE user_id = _user_id AND org_id = _org_id
  );
$$;


ALTER FUNCTION "public"."user_is_org_member"("_user_id" "uuid", "_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_password_strength"("password" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Minimum 8 characters
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one lowercase letter
  IF NOT password ~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one uppercase letter  
  IF NOT password ~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Must contain at least one number
  IF NOT password ~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."validate_password_strength"("password" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_password_strength"("password" "text") IS 'Validates password meets minimum requirements: 8+ chars, lowercase, uppercase, and number';



CREATE OR REPLACE FUNCTION "public"."validate_unique_code_format"("code" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  -- Allow alphanumeric with dashes and underscores, min 3 chars, max 50
  RETURN code IS NOT NULL 
    AND length(code) >= 3 
    AND length(code) <= 50
    AND code ~ '^[A-Za-z0-9][A-Za-z0-9\-_]+$';
END;
$_$;


ALTER FUNCTION "public"."validate_unique_code_format"("code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ace_form_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "gift_card_id" "uuid",
    "recipient_id" "uuid",
    "submission_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "redemption_token" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "contact_id" "uuid",
    "enrichment_status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."ace_form_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ace_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "form_config" "jsonb" DEFAULT '{"fields": [], "settings": {}}'::"jsonb" NOT NULL,
    "template_id" "text",
    "is_active" boolean DEFAULT true,
    "total_submissions" integer DEFAULT 0,
    "total_views" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_draft" boolean DEFAULT false,
    "last_auto_save" timestamp with time zone,
    "campaign_id" "uuid"
);


ALTER TABLE "public"."ace_forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "description" "text",
    "outcome" "text",
    "duration_minutes" integer,
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "contact_id" "uuid",
    "campaign_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activities_type_check" CHECK (("type" = ANY (ARRAY['call'::"text", 'email'::"text", 'meeting'::"text", 'note'::"text", 'task'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


COMMENT ON TABLE "public"."activities" IS 'Activity logging table for tracking interactions with contacts and campaigns';



CREATE TABLE IF NOT EXISTS "public"."admin_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "alert_type" "text" NOT NULL,
    "recipient_id" "uuid",
    "campaign_id" "uuid",
    "agent_id" "uuid",
    "disposition" "text",
    "customer_name" "text",
    "customer_code" "text",
    "additional_info" "jsonb",
    "sent_to" "text",
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid"
);


ALTER TABLE "public"."admin_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_impersonations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "impersonated_user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "reason" "text",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_impersonations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "priority" "text" DEFAULT 'normal'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "client_id" "uuid",
    "campaign_id" "uuid",
    "pool_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    CONSTRAINT "admin_notifications_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "admin_notifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'acknowledged'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "credit_account_id" "uuid",
    "enabled_brands" "jsonb" DEFAULT '[]'::"jsonb",
    "pricing_tier" "text" DEFAULT 'wholesale'::"text",
    "default_markup_percentage" numeric(5,2) DEFAULT 7.5,
    "contact_email" "text",
    "contact_phone" "text",
    "address" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "gift_card_markup_percentage" numeric(5,2) DEFAULT 0,
    CONSTRAINT "agencies_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."agencies" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agencies"."gift_card_markup_percentage" IS 'Markup percentage agency charges on top of base gift card cost';



CREATE TABLE IF NOT EXISTS "public"."agency_available_gift_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "denomination" numeric(10,2) NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agency_available_gift_cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."agency_available_gift_cards" IS 'Defines which gift card options each agency offers to their clients.';



CREATE TABLE IF NOT EXISTS "public"."agency_client_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_org_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid"
);


ALTER TABLE "public"."agency_client_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_performance_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "redemptions_count" integer DEFAULT 0 NOT NULL,
    "calls_handled" integer DEFAULT 0 NOT NULL,
    "avg_call_duration_seconds" integer,
    "successful_redemptions" integer DEFAULT 0 NOT NULL,
    "failed_redemptions" integer DEFAULT 0 NOT NULL,
    "quality_score" numeric(3,2),
    "customer_satisfaction_avg" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_performance_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_design_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "design_type" "text" NOT NULL,
    "design_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "total_duration_seconds" integer,
    "total_ai_messages" integer DEFAULT 0,
    "total_ai_tokens" integer DEFAULT 0,
    "total_ai_cost_usd" numeric(10,4) DEFAULT 0,
    "iterations_count" integer DEFAULT 0,
    "switched_to_manual" boolean DEFAULT false,
    "switched_to_manual_at" timestamp with time zone,
    "session_outcome" "text",
    "user_satisfaction_score" integer,
    CONSTRAINT "ai_design_sessions_design_type_check" CHECK (("design_type" = ANY (ARRAY['landing_page'::"text", 'mailer'::"text"]))),
    CONSTRAINT "ai_design_sessions_session_outcome_check" CHECK (("session_outcome" = ANY (ARRAY['saved'::"text", 'published'::"text", 'abandoned'::"text"]))),
    CONSTRAINT "ai_design_sessions_user_satisfaction_score_check" CHECK ((("user_satisfaction_score" >= 1) AND ("user_satisfaction_score" <= 5)))
);


ALTER TABLE "public"."ai_design_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "key_prefix" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "revoked" boolean DEFAULT false,
    "revoked_at" timestamp with time zone,
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audiences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "source" "public"."audience_source" DEFAULT 'manual'::"public"."audience_source" NOT NULL,
    "total_count" integer DEFAULT 0,
    "valid_count" integer DEFAULT 0,
    "invalid_count" integer DEFAULT 0,
    "hygiene_json" "jsonb" DEFAULT '{}'::"jsonb",
    "suppressed_json" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "public"."audience_status" DEFAULT 'processing'::"public"."audience_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid"
);


ALTER TABLE "public"."audiences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auto_reload_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credit_account_id" "uuid" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "current_balance" numeric(12,2) NOT NULL,
    "threshold" numeric(12,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "stripe_payment_intent_id" "text",
    "error_message" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "auto_reload_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."auto_reload_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."beta_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "feedback_type" "text" NOT NULL,
    "rating" integer,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "beta_feedback_feedback_type_check" CHECK (("feedback_type" = ANY (ARRAY['bug'::"text", 'feature_request'::"text", 'feedback'::"text"]))),
    CONSTRAINT "beta_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "beta_feedback_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'in_progress'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."beta_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_kits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "colors" "jsonb" DEFAULT '{"text": "#1F2937", "accent": "#FF6B00", "primary": "#000000", "palettes": [{"name": "Main", "colors": ["#000000", "#666666", "#FF6B00"]}, {"name": "Light", "colors": ["#FFFFFF", "#F3F4F6", "#E5E7EB"]}], "secondary": "#666666", "background": "#FFFFFF"}'::"jsonb" NOT NULL,
    "fonts" "jsonb" DEFAULT '{"body": {"family": "Inter", "weights": [400, 500]}, "custom": [], "heading": {"family": "Inter", "weights": [600, 700, 800]}}'::"jsonb" NOT NULL,
    "logo_urls" "jsonb" DEFAULT '{"black": null, "white": null, "primary": null}'::"jsonb",
    "icon_url" "text",
    "design_style" "text",
    "tagline" "text",
    "value_propositions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "brand_kits_design_style_check" CHECK (("design_style" = ANY (ARRAY['modern'::"text", 'bold'::"text", 'luxury'::"text", 'minimal'::"text", 'playful'::"text"])))
);


ALTER TABLE "public"."brand_kits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bulk_code_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "audience_id" "uuid",
    "uploaded_by_user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "total_codes" integer DEFAULT 0 NOT NULL,
    "successful_codes" integer DEFAULT 0 NOT NULL,
    "duplicate_codes" integer DEFAULT 0 NOT NULL,
    "error_codes" integer DEFAULT 0 NOT NULL,
    "upload_status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "error_log" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bulk_code_uploads_upload_status_check" CHECK (("upload_status" = ANY (ARRAY['processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."bulk_code_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_center_scripts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "script_name" "text" NOT NULL,
    "script_type" "text" NOT NULL,
    "script_content" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "call_center_scripts_script_type_check" CHECK (("script_type" = ANY (ARRAY['greeting'::"text", 'verification'::"text", 'explanation'::"text", 'objection_handling'::"text", 'closing'::"text", 'escalation'::"text"])))
);


ALTER TABLE "public"."call_center_scripts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_conditions_met" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "call_session_id" "uuid" NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "condition_number" integer NOT NULL,
    "met_by_agent_id" "uuid",
    "met_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gift_card_id" "uuid",
    "delivery_status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    CONSTRAINT "call_conditions_met_condition_number_check" CHECK (("condition_number" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."call_conditions_met" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_dispositions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "call_session_id" "uuid",
    "recipient_id" "uuid",
    "agent_user_id" "uuid" NOT NULL,
    "disposition_type" "text" NOT NULL,
    "notes" "text",
    "follow_up_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "call_dispositions_disposition_type_check" CHECK (("disposition_type" = ANY (ARRAY['completed'::"text", 'callback_requested'::"text", 'wrong_number'::"text", 'no_answer'::"text", 'voicemail'::"text", 'escalated'::"text", 'customer_declined'::"text"])))
);


ALTER TABLE "public"."call_dispositions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "recipient_id" "uuid",
    "tracked_number_id" "uuid" NOT NULL,
    "caller_phone" "text" NOT NULL,
    "twilio_call_sid" "text",
    "call_status" "text" DEFAULT 'ringing'::"text" NOT NULL,
    "match_status" "text" DEFAULT 'unmatched'::"text" NOT NULL,
    "agent_user_id" "uuid",
    "call_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "call_answered_at" timestamp with time zone,
    "call_ended_at" timestamp with time zone,
    "call_duration_seconds" integer,
    "recording_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recording_sid" "text",
    "recording_duration" integer,
    "forward_to_number" "text",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    CONSTRAINT "call_sessions_call_status_check" CHECK (("call_status" = ANY (ARRAY['ringing'::"text", 'in-progress'::"text", 'completed'::"text", 'no-answer'::"text", 'busy'::"text", 'failed'::"text"]))),
    CONSTRAINT "call_sessions_match_status_check" CHECK (("match_status" = ANY (ARRAY['matched'::"text", 'unmatched'::"text", 'manual_override'::"text"])))
);


ALTER TABLE "public"."call_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "campaign_approvals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."campaign_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."campaign_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_conditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "condition_number" integer NOT NULL,
    "condition_name" "text" NOT NULL,
    "trigger_type" "text" DEFAULT 'manual_agent'::"text" NOT NULL,
    "crm_event_name" "text",
    "time_delay_hours" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    "brand_id" "uuid",
    "card_value" numeric(10,2),
    "sms_template" "text",
    CONSTRAINT "campaign_conditions_condition_number_check" CHECK (("condition_number" = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT "campaign_conditions_trigger_type_check" CHECK (("trigger_type" = ANY (ARRAY['manual_agent'::"text", 'crm_webhook'::"text", 'time_delay'::"text"])))
);


ALTER TABLE "public"."campaign_conditions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campaign_conditions"."brand_id" IS 'Gift card brand for this condition reward - used with card_value for simplified selection';



COMMENT ON COLUMN "public"."campaign_conditions"."card_value" IS 'Gift card denomination for this condition reward - used with brand_id';



COMMENT ON COLUMN "public"."campaign_conditions"."sms_template" IS 'SMS message template for gift card delivery. Variables: {first_name}, {last_name}, {value}, {provider}, {link}';



CREATE TABLE IF NOT EXISTS "public"."campaign_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "draft_name" "text" NOT NULL,
    "form_data_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "current_step" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."campaign_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_gift_card_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "denomination" numeric(10,2) NOT NULL,
    "condition_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "campaign_gift_card_config_condition_number_check" CHECK ((("condition_number" > 0) AND ("condition_number" <= 3)))
);


ALTER TABLE "public"."campaign_gift_card_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."campaign_gift_card_config" IS 'Links campaigns to specific gift cards for each condition trigger.';



CREATE TABLE IF NOT EXISTS "public"."campaign_message_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "sms_template_id" "uuid",
    "email_template_id" "uuid",
    "custom_merge_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_message_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."campaign_message_settings" IS 'Links campaigns to their message templates';



CREATE TABLE IF NOT EXISTS "public"."campaign_prototypes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "prototype_config_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."campaign_prototypes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_reward_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "condition_number" integer NOT NULL,
    "gift_card_pool_id" "uuid",
    "reward_description" "text",
    "sms_template" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    CONSTRAINT "campaign_reward_configs_condition_number_check" CHECK (("condition_number" = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE "public"."campaign_reward_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "snapshot_json" "jsonb" NOT NULL,
    "created_by_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "change_description" "text",
    "changes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "previous_state" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."campaign_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "audience_id" "uuid",
    "template_id" "uuid",
    "name" "text" NOT NULL,
    "size" "public"."template_size" NOT NULL,
    "postage" "public"."postage_class" DEFAULT 'standard'::"public"."postage_class",
    "vendor" "text",
    "lp_mode" "public"."lp_mode" DEFAULT 'bridge'::"public"."lp_mode",
    "base_lp_url" "text",
    "utm_source" "text" DEFAULT 'directmail'::"text",
    "utm_medium" "text" DEFAULT 'postcard'::"text",
    "utm_campaign" "text",
    "status" "public"."campaign_status" DEFAULT 'draft'::"public"."campaign_status",
    "mail_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "landing_page_id" "uuid",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    "contact_list_id" "uuid",
    "reward_pool_id" "uuid",
    "reward_condition" "text" DEFAULT 'form_submission'::"text",
    "rewards_enabled" boolean DEFAULT false,
    "version" integer DEFAULT 1,
    "editable_after_publish" boolean DEFAULT true,
    "codes_uploaded" boolean DEFAULT false,
    "requires_codes" boolean DEFAULT true,
    "mailing_method" "text" DEFAULT 'self'::"text",
    "design_image_url" "text",
    "credit_account_id" "uuid",
    "allocated_budget" numeric(12,2),
    "uses_shared_credit" boolean DEFAULT true,
    "form_id" "uuid",
    "sms_opt_in_message" "text",
    CONSTRAINT "campaigns_mailing_method_check" CHECK (("mailing_method" = ANY (ARRAY['self'::"text", 'ace_fulfillment'::"text"]))),
    CONSTRAINT "campaigns_published_needs_landing_page" CHECK ((("status" <> ALL (ARRAY['in_production'::"public"."campaign_status", 'mailed'::"public"."campaign_status"])) OR ("mailing_method" = 'self'::"text") OR ("landing_page_id" IS NOT NULL) OR ("form_id" IS NOT NULL))),
    CONSTRAINT "campaigns_reward_condition_check" CHECK (("reward_condition" = ANY (ARRAY['form_submission'::"text", 'call_completed'::"text", 'immediate'::"text"])))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


COMMENT ON COLUMN "public"."campaigns"."audience_id" IS 'DEPRECATED: Legacy audience system, kept for backward compatibility';



COMMENT ON COLUMN "public"."campaigns"."simulation_batch_id" IS 'Groups campaigns created together in a simulation batch';



COMMENT ON COLUMN "public"."campaigns"."contact_list_id" IS 'Links to contact_lists table (replaces audience_id for new campaigns)';



COMMENT ON COLUMN "public"."campaigns"."rewards_enabled" IS 'Whether gift card rewards are enabled for this campaign. When true, campaign conditions with gift cards will provision rewards.';



COMMENT ON COLUMN "public"."campaigns"."mailing_method" IS 'self = client handles their own mail design/fulfillment, ace_fulfillment = ACE handles everything';



COMMENT ON COLUMN "public"."campaigns"."design_image_url" IS 'URL of uploaded mail design image for self-mailer campaigns';



COMMENT ON COLUMN "public"."campaigns"."sms_opt_in_message" IS 'SMS opt-in consent message template. Variables: {company}, {client_name}. Default: "To send your activation code, we''ll text you a link and a few related messages over the next 30 days from {company}. Msg & data rates may apply. Reply STOP to stop at any time."';



CREATE TABLE IF NOT EXISTS "public"."client_available_gift_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "denomination" numeric(10,2) NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_available_gift_cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_available_gift_cards" IS 'Defines which gift card options each client can use in their campaigns.';



CREATE TABLE IF NOT EXISTS "public"."client_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "industry" "public"."industry_type" NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "logo_url" "text",
    "brand_colors_json" "jsonb" DEFAULT '{}'::"jsonb",
    "api_key_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "credits" integer DEFAULT 100000,
    "tagline" "text",
    "website_url" "text",
    "font_preferences" "jsonb" DEFAULT '{"body": "Inter", "heading": "Inter"}'::"jsonb",
    "redemption_fee_override" numeric(5,2) DEFAULT NULL::numeric,
    "agency_id" "uuid",
    "credit_account_id" "uuid",
    "agency_billing_enabled" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived_at" timestamp with time zone,
    "slug" "text",
    CONSTRAINT "clients_redemption_fee_override_check" CHECK ((("redemption_fee_override" IS NULL) OR (("redemption_fee_override" >= (0)::numeric) AND ("redemption_fee_override" <= (100)::numeric))))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."credits" IS 'Available credits for lead purchases (in cents)';



COMMENT ON COLUMN "public"."clients"."redemption_fee_override" IS 'Optional override for redemption fee percentage at client level. If NULL, uses organization default.';



COMMENT ON COLUMN "public"."clients"."agency_billing_enabled" IS 'When true, the agency is billed for gift cards instead of the client';



COMMENT ON COLUMN "public"."clients"."archived_at" IS 'Timestamp when the client was archived. NULL means active.';



COMMENT ON COLUMN "public"."clients"."slug" IS 'URL-friendly slug for public landing page URLs';



CREATE TABLE IF NOT EXISTS "public"."contact_campaign_participation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "recipient_id" "uuid",
    "participation_status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "redemption_code" "text",
    "participated_at" timestamp with time zone DEFAULT "now"(),
    "delivered_at" timestamp with time zone,
    "redeemed_at" timestamp with time zone,
    "gift_card_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_campaign_participation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_code_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "old_code" "text",
    "new_code" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "reason" "text"
);


ALTER TABLE "public"."contact_code_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_custom_field_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "field_name" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "is_required" boolean DEFAULT false,
    "default_value" "text",
    "validation_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "field_group" "text" DEFAULT 'Custom Fields'::"text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contact_custom_field_definitions_field_type_check" CHECK (("field_type" = ANY (ARRAY['text'::"text", 'number'::"text", 'date'::"text", 'boolean'::"text", 'select'::"text", 'multi-select'::"text", 'url'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."contact_custom_field_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_list_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "list_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"(),
    "added_by_user_id" "uuid",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    "unique_code" "text"
);


ALTER TABLE "public"."contact_list_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."contact_list_members"."unique_code" IS 'Unique redemption code for this contact in this specific list. Allows same contact to have different codes per campaign.';



CREATE TABLE IF NOT EXISTS "public"."contact_lists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "list_type" "text" DEFAULT 'static'::"text" NOT NULL,
    "filter_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "contact_count" integer DEFAULT 0,
    "last_sync_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    CONSTRAINT "contact_lists_list_type_check" CHECK (("list_type" = ANY (ARRAY['static'::"text", 'dynamic'::"text"])))
);


ALTER TABLE "public"."contact_lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "tag" "text" NOT NULL,
    "tag_category" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid"
);


ALTER TABLE "public"."contact_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "mobile_phone" "text",
    "company" "text",
    "job_title" "text",
    "address" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "country" "text" DEFAULT 'US'::"text",
    "lifecycle_stage" "text" DEFAULT 'lead'::"text",
    "lead_source" "text",
    "lead_score" integer DEFAULT 0,
    "do_not_contact" boolean DEFAULT false,
    "email_opt_out" boolean DEFAULT false,
    "sms_opt_out" boolean DEFAULT false,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "last_activity_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "customer_code" "text" NOT NULL,
    "engagement_score" integer DEFAULT 0,
    "total_interactions" integer DEFAULT 0,
    "redemptions_count" integer DEFAULT 0,
    "email_opens_count" integer DEFAULT 0,
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    CONSTRAINT "contacts_lead_score_check" CHECK ((("lead_score" >= 0) AND ("lead_score" <= 100))),
    CONSTRAINT "contacts_lifecycle_stage_check" CHECK (("lifecycle_stage" = ANY (ARRAY['lead'::"text", 'mql'::"text", 'sql'::"text", 'opportunity'::"text", 'customer'::"text", 'evangelist'::"text"]))),
    CONSTRAINT "customer_code_format_check" CHECK ("public"."validate_unique_code_format"("customer_code"))
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."contacts"."customer_code" IS 'Unique identifier for the contact within the client scope. Must be unique per client. Format: UC-{timestamp}-{random} or custom alphanumeric code.';



COMMENT ON COLUMN "public"."contacts"."is_simulated" IS 'Marks contacts created for demo/simulation purposes';



CREATE TABLE IF NOT EXISTS "public"."credit_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "reserved_balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_purchased" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_used" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "total_remaining" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "low_balance_threshold" numeric(10,2) DEFAULT 100.00,
    "auto_reload_enabled" boolean DEFAULT false,
    "auto_reload_threshold" numeric(10,2) DEFAULT 100.00,
    "auto_reload_amount" numeric(10,2) DEFAULT 500.00,
    "stripe_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_payment_method_id" "text",
    "last_auto_reload_at" timestamp with time zone,
    "auto_reload_failure_count" integer DEFAULT 0,
    CONSTRAINT "credit_accounts_balance_check" CHECK (("balance" >= (0)::numeric)),
    CONSTRAINT "credit_accounts_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['platform'::"text", 'agency'::"text", 'client'::"text"]))),
    CONSTRAINT "credit_accounts_reserved_balance_check" CHECK (("reserved_balance" >= (0)::numeric))
);


ALTER TABLE "public"."credit_accounts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."credit_accounts"."auto_reload_enabled" IS 'Whether automatic recharge is enabled when balance falls below threshold';



COMMENT ON COLUMN "public"."credit_accounts"."auto_reload_threshold" IS 'Balance threshold that triggers auto-reload (default $100)';



COMMENT ON COLUMN "public"."credit_accounts"."auto_reload_amount" IS 'Amount to add when auto-reload is triggered (default $500)';



COMMENT ON COLUMN "public"."credit_accounts"."stripe_customer_id" IS 'Stripe Customer ID for auto-reload charges';



COMMENT ON COLUMN "public"."credit_accounts"."stripe_payment_method_id" IS 'Default payment method for auto-reload';



COMMENT ON COLUMN "public"."credit_accounts"."last_auto_reload_at" IS 'Timestamp of last successful auto-reload';



COMMENT ON COLUMN "public"."credit_accounts"."auto_reload_failure_count" IS 'Count of consecutive auto-reload failures';



CREATE TABLE IF NOT EXISTS "public"."credit_system_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."credit_system_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credit_account_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "balance_after" numeric(10,2) NOT NULL,
    "description" "text",
    "reference_type" "text",
    "reference_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "crm_integration_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "recipient_id" "uuid",
    "call_session_id" "uuid",
    "campaign_id" "uuid",
    "matched" boolean DEFAULT false,
    "processed" boolean DEFAULT false,
    "condition_triggered" integer,
    "error_message" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crm_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crm_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "crm_provider" "text" NOT NULL,
    "webhook_url" "text" NOT NULL,
    "webhook_secret" "text" NOT NULL,
    "api_credentials_encrypted" "jsonb",
    "field_mappings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "event_mappings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_event_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "crm_integrations_crm_provider_check" CHECK (("crm_provider" = ANY (ARRAY['salesforce'::"text", 'hubspot'::"text", 'zoho'::"text", 'gohighlevel'::"text", 'pipedrive'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."crm_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "design_type" "text" NOT NULL,
    "design_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "version_name" "text",
    "grapesjs_snapshot" "jsonb" NOT NULL,
    "thumbnail_url" "text",
    "change_type" "text" NOT NULL,
    "change_description" "text",
    "ai_prompt" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "performance_score" "jsonb",
    CONSTRAINT "design_versions_change_type_check" CHECK (("change_type" = ANY (ARRAY['ai_generation'::"text", 'ai_refinement'::"text", 'manual_edit'::"text", 'restore'::"text"]))),
    CONSTRAINT "design_versions_design_type_check" CHECK (("design_type" = ANY (ARRAY['landing_page'::"text", 'mailer'::"text"])))
);


ALTER TABLE "public"."design_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documentation_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_id" "uuid",
    "user_id" "uuid",
    "is_helpful" boolean,
    "feedback_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."documentation_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documentation_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "content" "text",
    "order_index" integer DEFAULT 0,
    "is_admin_only" boolean DEFAULT true,
    "search_keywords" "text"[],
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "visible_to_roles" "public"."app_role"[] DEFAULT ARRAY['admin'::"public"."app_role"],
    "doc_audience" "text" DEFAULT 'admin'::"text",
    CONSTRAINT "documentation_pages_category_check" CHECK (("category" = ANY (ARRAY['getting-started'::"text", 'architecture'::"text", 'features'::"text", 'developer-guide'::"text", 'api-reference'::"text", 'user-guides'::"text", 'operations'::"text", 'configuration'::"text", 'reference'::"text", 'implementation'::"text", 'troubleshooting'::"text"]))),
    CONSTRAINT "documentation_pages_doc_audience_check" CHECK (("doc_audience" = ANY (ARRAY['public'::"text", 'user'::"text", 'technical'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."documentation_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documentation_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_id" "uuid",
    "user_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    "time_spent_seconds" integer,
    "referrer" "text"
);


ALTER TABLE "public"."documentation_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dr_phillip_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "title" "text" NOT NULL,
    "messages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dr_phillip_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_delivery_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "subject" "text" NOT NULL,
    "template_name" "text",
    "delivery_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "bounced_at" timestamp with time zone,
    "recipient_id" "uuid",
    "gift_card_id" "uuid",
    "campaign_id" "uuid",
    "form_id" "uuid",
    "client_id" "uuid",
    "email_body_html" "text",
    "email_body_text" "text",
    "metadata_json" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_delivery_logs_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'bounced'::"text", 'opened'::"text", 'clicked'::"text"])))
);


ALTER TABLE "public"."email_delivery_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_delivery_logs" IS 'Tracks all email deliveries for audit and monitoring';



COMMENT ON COLUMN "public"."email_delivery_logs"."template_name" IS 'Name of email template used';



COMMENT ON COLUMN "public"."email_delivery_logs"."delivery_status" IS 'Status: pending, sent, failed, bounced, opened, clicked';



COMMENT ON COLUMN "public"."email_delivery_logs"."provider_message_id" IS 'Message ID from email provider (e.g., Resend)';



CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid",
    "error_type" "text" NOT NULL,
    "error_message" "text" NOT NULL,
    "error_code" "text",
    "stack_trace" "text",
    "component_name" "text",
    "function_name" "text",
    "url" "text",
    "user_agent" "text",
    "request_data" "jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "severity" "text",
    "category" "text",
    "source" "text",
    "error_stack" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "recipient_id" "uuid",
    "campaign_id" "uuid",
    "organization_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "request_id" "text",
    "notes" "text"
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."error_logs" IS 'Centralized error logging for system-wide error tracking and monitoring';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data_json" "jsonb" DEFAULT '{}'::"jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "events_source_check" CHECK (("source" = ANY (ARRAY['usps'::"text", 'qr'::"text", 'purl'::"text", 'form'::"text", 'external'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_card_billing_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_type" "text" NOT NULL,
    "billed_entity_type" "text" NOT NULL,
    "billed_entity_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "recipient_id" "uuid",
    "brand_id" "uuid" NOT NULL,
    "denomination" numeric(10,2) NOT NULL,
    "amount_billed" numeric(10,2) NOT NULL,
    "cost_basis" numeric(10,2),
    "profit" numeric(10,2) GENERATED ALWAYS AS (("amount_billed" - COALESCE("cost_basis", (0)::numeric))) STORED,
    "inventory_card_id" "uuid",
    "tillo_transaction_id" "text",
    "tillo_order_reference" "text",
    "billed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    CONSTRAINT "gift_card_billing_ledger_amount_billed_check" CHECK (("amount_billed" >= (0)::numeric)),
    CONSTRAINT "gift_card_billing_ledger_billed_entity_type_check" CHECK (("billed_entity_type" = ANY (ARRAY['client'::"text", 'agency'::"text"]))),
    CONSTRAINT "gift_card_billing_ledger_cost_basis_check" CHECK (("cost_basis" >= (0)::numeric)),
    CONSTRAINT "gift_card_billing_ledger_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['purchase_from_inventory'::"text", 'purchase_from_tillo'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."gift_card_billing_ledger" OWNER TO "postgres";


COMMENT ON TABLE "public"."gift_card_billing_ledger" IS 'Immutable ledger of all gift card transactions. Tracks billing, costs, and profit.';



COMMENT ON COLUMN "public"."gift_card_billing_ledger"."billed_entity_type" IS 'Who gets billed: client (default) or agency (if agency billing enabled)';



COMMENT ON COLUMN "public"."gift_card_billing_ledger"."profit" IS 'Automatically calculated: amount_billed - cost_basis';



CREATE TABLE IF NOT EXISTS "public"."gift_card_brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_name" "text" NOT NULL,
    "brand_code" "text" NOT NULL,
    "provider" "text" DEFAULT 'tillo'::"text" NOT NULL,
    "logo_url" "text",
    "category" "text",
    "typical_denominations" "jsonb" DEFAULT '[]'::"jsonb",
    "balance_check_enabled" boolean DEFAULT true,
    "balance_check_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "usage_restrictions" "jsonb" DEFAULT '[]'::"jsonb",
    "redemption_instructions" "text",
    "store_url" "text",
    "brand_color" "text" DEFAULT '#6366f1'::"text",
    "is_demo_brand" boolean DEFAULT false,
    "is_enabled_by_admin" boolean DEFAULT false,
    "tillo_brand_code" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "website_url" "text",
    "description" "text",
    "terms_url" "text",
    "brand_colors" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata_source" "text" DEFAULT 'manual'::"text",
    "balance_check_method" "text" DEFAULT 'manual'::"text",
    "balance_check_api_endpoint" "text",
    "balance_check_config" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "gift_card_brands_balance_check_method_check" CHECK (("balance_check_method" = ANY (ARRAY['tillo_api'::"text", 'manual'::"text", 'other_api'::"text", 'none'::"text"]))),
    CONSTRAINT "gift_card_brands_metadata_source_check" CHECK (("metadata_source" = ANY (ARRAY['auto_lookup'::"text", 'manual'::"text", 'tillo'::"text"])))
);


ALTER TABLE "public"."gift_card_brands" OWNER TO "postgres";


COMMENT ON TABLE "public"."gift_card_brands" IS 'Master catalog of gift card brands. Admin enables brands for the platform.';



COMMENT ON COLUMN "public"."gift_card_brands"."is_demo_brand" IS 'Flag to identify demo/test brands. True = fake brand for testing, False = real brand for production';



COMMENT ON COLUMN "public"."gift_card_brands"."is_enabled_by_admin" IS 'When true, this brand is available for agencies/clients to use';



COMMENT ON COLUMN "public"."gift_card_brands"."tillo_brand_code" IS 'Tillo API brand identifier for API provisioning';



COMMENT ON COLUMN "public"."gift_card_brands"."website_url" IS 'Official brand website URL';



COMMENT ON COLUMN "public"."gift_card_brands"."description" IS 'Brand description for display purposes';



COMMENT ON COLUMN "public"."gift_card_brands"."terms_url" IS 'URL to terms and conditions for this brand';



COMMENT ON COLUMN "public"."gift_card_brands"."brand_colors" IS 'JSON object with primary, secondary brand colors for UI theming';



COMMENT ON COLUMN "public"."gift_card_brands"."metadata_source" IS 'Source of brand metadata: auto_lookup (Clearbit), manual (user entered), or tillo (Tillo API)';



COMMENT ON COLUMN "public"."gift_card_brands"."balance_check_method" IS 'Method to check card balance. Auto-detected for Tillo brands if not set. Values: tillo_api, manual, other_api, none';



COMMENT ON COLUMN "public"."gift_card_brands"."balance_check_api_endpoint" IS 'API endpoint URL for balance checking (if applicable)';



COMMENT ON COLUMN "public"."gift_card_brands"."balance_check_config" IS 'JSON config for balance checking (API keys, headers, response mapping)';



CREATE TABLE IF NOT EXISTS "public"."gift_card_denominations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "denomination" numeric(10,2) NOT NULL,
    "is_enabled_by_admin" boolean DEFAULT false,
    "admin_cost_per_card" numeric(10,2),
    "tillo_cost_per_card" numeric(10,2),
    "last_tillo_price_check" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "use_custom_pricing" boolean DEFAULT false,
    "client_price" numeric(10,2),
    "agency_price" numeric(10,2),
    "cost_basis" numeric(10,2),
    "profit_margin_percentage" numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (("client_price" IS NOT NULL) AND ("client_price" > (0)::numeric) AND ("cost_basis" IS NOT NULL) AND ("cost_basis" > (0)::numeric)) THEN ((("client_price" - "cost_basis") / "cost_basis") * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    CONSTRAINT "gift_card_denominations_denomination_check" CHECK (("denomination" > (0)::numeric))
);


ALTER TABLE "public"."gift_card_denominations" OWNER TO "postgres";


COMMENT ON TABLE "public"."gift_card_denominations" IS 'Available denominations for each brand. Admin configures which denominations are available.';



COMMENT ON COLUMN "public"."gift_card_denominations"."use_custom_pricing" IS 'When true, use client_price instead of face value denomination';



COMMENT ON COLUMN "public"."gift_card_denominations"."client_price" IS 'Custom price charged to clients (can be different from face value)';



COMMENT ON COLUMN "public"."gift_card_denominations"."agency_price" IS 'Custom price charged to agencies when agency billing is enabled';



COMMENT ON COLUMN "public"."gift_card_denominations"."cost_basis" IS 'What admin pays for these cards (used for profit calculation)';



COMMENT ON COLUMN "public"."gift_card_denominations"."profit_margin_percentage" IS 'Calculated profit margin: (client_price - cost_basis) / cost_basis * 100';



CREATE TABLE IF NOT EXISTS "public"."gift_card_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "denomination" numeric(10,2) NOT NULL,
    "card_code" "text" NOT NULL,
    "card_number" "text",
    "expiration_date" "date",
    "status" "text" DEFAULT 'available'::"text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by_user_id" "uuid",
    "upload_batch_id" "uuid",
    "assigned_to_recipient_id" "uuid",
    "assigned_to_campaign_id" "uuid",
    "assigned_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "current_balance" numeric(10,2),
    "last_balance_check" timestamp with time zone,
    "balance_check_status" "text" DEFAULT 'unchecked'::"text",
    "balance_check_error" "text",
    CONSTRAINT "gift_card_inventory_balance_check_status_check" CHECK (("balance_check_status" = ANY (ARRAY['unchecked'::"text", 'success'::"text", 'error'::"text", 'manual'::"text"]))),
    CONSTRAINT "gift_card_inventory_denomination_check" CHECK (("denomination" > (0)::numeric)),
    CONSTRAINT "gift_card_inventory_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'assigned'::"text", 'delivered'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."gift_card_inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."gift_card_inventory" IS 'Inventory of uploaded gift card codes. System uses these before purchasing from Tillo.';



COMMENT ON COLUMN "public"."gift_card_inventory"."current_balance" IS 'Current balance of the gift card, updated by balance checks';



COMMENT ON COLUMN "public"."gift_card_inventory"."last_balance_check" IS 'Timestamp of the last balance check';



COMMENT ON COLUMN "public"."gift_card_inventory"."balance_check_status" IS 'Status of last balance check: unchecked, success, error, manual';



COMMENT ON COLUMN "public"."gift_card_inventory"."balance_check_error" IS 'Error message from last failed balance check';



CREATE TABLE IF NOT EXISTS "public"."gift_card_inventory_balance_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_card_id" "uuid" NOT NULL,
    "previous_balance" numeric(10,2),
    "new_balance" numeric(10,2),
    "change_amount" numeric(10,2) GENERATED ALWAYS AS ((COALESCE("new_balance", (0)::numeric) - COALESCE("previous_balance", (0)::numeric))) STORED,
    "check_method" "text" DEFAULT 'api'::"text" NOT NULL,
    "check_status" "text" NOT NULL,
    "error_message" "text",
    "checked_by_user_id" "uuid",
    "checked_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."gift_card_inventory_balance_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."gift_card_inventory_balance_history" IS 'History of balance checks for gift card inventory items';



CREATE OR REPLACE VIEW "public"."gift_card_inventory_summary" AS
 SELECT "gci"."brand_id",
    "gcb"."brand_name",
    "gcb"."logo_url",
    "gcb"."balance_check_method",
    "gci"."denomination",
    "count"(*) FILTER (WHERE ("gci"."status" = 'available'::"text")) AS "available_count",
    "count"(*) FILTER (WHERE ("gci"."status" = 'assigned'::"text")) AS "assigned_count",
    "count"(*) FILTER (WHERE ("gci"."status" = 'delivered'::"text")) AS "delivered_count",
    "count"(*) FILTER (WHERE ("gci"."status" = 'expired'::"text")) AS "expired_count",
    "count"(*) AS "total_count",
    "sum"("gci"."denomination") FILTER (WHERE ("gci"."status" = ANY (ARRAY['available'::"text", 'assigned'::"text"]))) AS "total_value",
    "sum"("gci"."current_balance") FILTER (WHERE ("gci"."current_balance" IS NOT NULL)) AS "total_current_balance",
    "count"(*) FILTER (WHERE ("gci"."balance_check_status" = 'unchecked'::"text")) AS "unchecked_count",
    "count"(*) FILTER (WHERE ("gci"."balance_check_status" = 'error'::"text")) AS "error_count",
    "max"("gci"."last_balance_check") AS "last_balance_check"
   FROM ("public"."gift_card_inventory" "gci"
     JOIN "public"."gift_card_brands" "gcb" ON (("gci"."brand_id" = "gcb"."id")))
  GROUP BY "gci"."brand_id", "gcb"."brand_name", "gcb"."logo_url", "gcb"."balance_check_method", "gci"."denomination";


ALTER VIEW "public"."gift_card_inventory_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."gift_card_inventory_summary" IS 'Aggregated summary of gift card inventory with balance check status';



CREATE TABLE IF NOT EXISTS "public"."gift_card_provisioning_trace" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "text" NOT NULL,
    "campaign_id" "uuid",
    "recipient_id" "uuid",
    "brand_id" "uuid",
    "denomination" numeric,
    "step_number" integer NOT NULL,
    "step_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "duration_ms" integer,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "error_message" "text",
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gift_card_provisioning_trace_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."gift_card_provisioning_trace" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."landing_page_ai_chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "messages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "total_tokens" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "landing_page_ai_chats_provider_check" CHECK (("provider" = ANY (ARRAY['openai'::"text", 'anthropic'::"text"])))
);


ALTER TABLE "public"."landing_page_ai_chats" OWNER TO "postgres";


COMMENT ON TABLE "public"."landing_page_ai_chats" IS 'Stores AI chat history for iterative landing page design';



CREATE TABLE IF NOT EXISTS "public"."landing_page_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "export_format" "text" NOT NULL,
    "export_url" "text",
    "configuration" "jsonb" DEFAULT '{}'::"jsonb",
    "exported_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "landing_page_exports_export_format_check" CHECK (("export_format" = ANY (ARRAY['static'::"text", 'react'::"text", 'wordpress'::"text", 'hosted'::"text"])))
);


ALTER TABLE "public"."landing_page_exports" OWNER TO "postgres";


COMMENT ON TABLE "public"."landing_page_exports" IS 'Tracks all exports of landing pages in different formats';



CREATE TABLE IF NOT EXISTS "public"."landing_page_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "landing_page_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "content_json" "jsonb" NOT NULL,
    "html_content" "text",
    "change_description" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."landing_page_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."landing_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "published" boolean DEFAULT false,
    "content_json" "jsonb" DEFAULT '{"blocks": [], "version": "1.0"}'::"jsonb" NOT NULL,
    "html_content" "text",
    "css_content" "text",
    "meta_title" "text",
    "meta_description" "text",
    "og_image_url" "text",
    "ai_generated" boolean DEFAULT false,
    "ai_prompt" "text",
    "version_number" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    "editor_type" "text" DEFAULT 'ai'::"text",
    "editor_state" "text" DEFAULT 'ai_editing'::"text",
    "ai_chat_history" "jsonb" DEFAULT '[]'::"jsonb",
    "design_iterations" integer DEFAULT 0,
    "manual_edits_count" integer DEFAULT 0,
    "grapesjs_project" "jsonb",
    "design_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "last_ai_edit_at" timestamp with time zone,
    "first_manual_edit_at" timestamp with time zone,
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    "campaign_id" "uuid",
    "source_type" "text" DEFAULT 'manual'::"text",
    "source_data" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_provider" "text" DEFAULT 'manual'::"text",
    "ai_model" "text",
    "generation_tokens" integer DEFAULT 0,
    "visual_editor_state" "jsonb" DEFAULT '{}'::"jsonb",
    "export_formats" "text"[] DEFAULT '{}'::"text"[],
    "custom_domain" "text",
    "seo_score" integer,
    "accessibility_score" integer,
    CONSTRAINT "landing_pages_ai_provider_check" CHECK (("ai_provider" = ANY (ARRAY['openai'::"text", 'anthropic'::"text", 'manual'::"text"]))),
    CONSTRAINT "landing_pages_editor_state_check" CHECK (("editor_state" = ANY (ARRAY['ai_editing'::"text", 'manual_editing'::"text", 'completed'::"text"]))),
    CONSTRAINT "landing_pages_editor_type_check" CHECK (("editor_type" = ANY (ARRAY['ai'::"text", 'grapesjs'::"text", 'simple'::"text", 'ai-html'::"text"]))),
    CONSTRAINT "landing_pages_source_type_check" CHECK (("source_type" = ANY (ARRAY['text_prompt'::"text", 'image_upload'::"text", 'link_analysis'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."landing_pages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."landing_pages"."editor_type" IS 'Indicates which editor was used to create the page: ai (AI-generated) or visual (GrapeJS drag-and-drop)';



COMMENT ON COLUMN "public"."landing_pages"."source_type" IS 'How the page was created: text_prompt, image_upload, link_analysis, or manual';



COMMENT ON COLUMN "public"."landing_pages"."source_data" IS 'Stores original prompt, image URL, or analyzed link data';



COMMENT ON COLUMN "public"."landing_pages"."ai_model" IS 'e.g., gpt-4-vision-preview, claude-3-opus-20240229';



COMMENT ON COLUMN "public"."landing_pages"."generation_tokens" IS 'Track AI usage for billing/analytics';



COMMENT ON COLUMN "public"."landing_pages"."visual_editor_state" IS 'State for custom visual editor (element positions, z-index, etc)';



COMMENT ON COLUMN "public"."landing_pages"."export_formats" IS 'Formats user has exported to: static, react, wordpress, hosted';



COMMENT ON COLUMN "public"."landing_pages"."custom_domain" IS 'Custom domain for hosted pages';



COMMENT ON COLUMN "public"."landing_pages"."seo_score" IS 'Automated SEO analysis score (0-100)';



COMMENT ON COLUMN "public"."landing_pages"."accessibility_score" IS 'WCAG compliance score (0-100)';



CREATE TABLE IF NOT EXISTS "public"."lead_filter_presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vertical" "text" NOT NULL,
    "preset_name" "text" NOT NULL,
    "filters_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lead_filter_presets_vertical_check" CHECK (("vertical" = ANY (ARRAY['roofing'::"text", 'rei'::"text", 'auto'::"text"])))
);


ALTER TABLE "public"."lead_filter_presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "lead_source_id" "uuid",
    "filter_json" "jsonb" DEFAULT '{}'::"jsonb",
    "quantity" integer NOT NULL,
    "price_cents" integer NOT NULL,
    "audience_id" "uuid",
    "license_terms" "text",
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stripe_payment_id" "text",
    "payment_status" "text" DEFAULT 'paid'::"text",
    CONSTRAINT "lead_purchases_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."lead_purchases" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lead_purchases"."stripe_payment_id" IS 'Stripe payment intent ID';



COMMENT ON COLUMN "public"."lead_purchases"."payment_status" IS 'Payment status: pending, paid, or failed';



CREATE TABLE IF NOT EXISTS "public"."lead_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_name" "text" NOT NULL,
    "api_endpoint" "text",
    "adapter_type" "text",
    "pricing_json" "jsonb" DEFAULT '{}'::"jsonb",
    "available_filters_json" "jsonb" DEFAULT '{}'::"jsonb",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "message" "text",
    "appointment_requested" boolean DEFAULT false,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "success" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."login_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mail_provider_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "client_id" "uuid",
    "provider_type" "text" NOT NULL,
    "postgrid_enabled" boolean DEFAULT true,
    "postgrid_test_mode" boolean DEFAULT true,
    "postgrid_api_key_name" "text",
    "custom_enabled" boolean DEFAULT false,
    "custom_webhook_url" "text",
    "custom_webhook_secret_name" "text",
    "custom_provider_name" "text",
    "custom_auth_type" "text",
    "custom_auth_header_name" "text",
    "allow_clients_postgrid" boolean DEFAULT true,
    "allow_clients_custom" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by_user_id" "uuid",
    CONSTRAINT "mail_provider_settings_custom_auth_type_check" CHECK (("custom_auth_type" = ANY (ARRAY['api_key'::"text", 'basic'::"text", 'bearer'::"text", 'custom_header'::"text", 'none'::"text"]))),
    CONSTRAINT "mail_provider_settings_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['postgrid'::"text", 'custom'::"text", 'both'::"text"]))),
    CONSTRAINT "org_or_client" CHECK (((("org_id" IS NOT NULL) AND ("client_id" IS NULL)) OR (("org_id" IS NULL) AND ("client_id" IS NOT NULL))))
);


ALTER TABLE "public"."mail_provider_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mail_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_name" "text",
    "recipient_count" integer NOT NULL,
    "request_payload" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "provider_job_id" "text",
    "response_payload" "jsonb",
    "error_message" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "estimated_cost_cents" integer,
    "actual_cost_cents" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mail_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'submitted'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."mail_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "template_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text",
    "body_template" "text" NOT NULL,
    "available_merge_tags" "jsonb" DEFAULT '["first_name", "last_name", "card_code", "card_value", "brand_name", "expiration_date", "company_name"]'::"jsonb",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "message_templates_template_type_check" CHECK (("template_type" = ANY (ARRAY['sms'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_templates" IS 'Customizable SMS and email templates with merge tag support';



CREATE TABLE IF NOT EXISTS "public"."org_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."org_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."org_type" DEFAULT 'agency'::"public"."org_type" NOT NULL,
    "settings_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_simulated" boolean DEFAULT false,
    "redemption_fee_percentage" numeric(5,2) DEFAULT 20.00,
    "archived_at" timestamp with time zone,
    CONSTRAINT "organizations_redemption_fee_percentage_check" CHECK ((("redemption_fee_percentage" >= (0)::numeric) AND ("redemption_fee_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."is_simulated" IS 'Marks organizations created for demo/simulation purposes';



COMMENT ON COLUMN "public"."organizations"."redemption_fee_percentage" IS 'Default redemption fee percentage charged per successful gift card redemption (0-100). Default is 20%.';



COMMENT ON COLUMN "public"."organizations"."archived_at" IS 'Timestamp when the organization was archived. NULL means active.';



CREATE TABLE IF NOT EXISTS "public"."performance_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid",
    "metric_type" "text" NOT NULL,
    "metric_name" "text" NOT NULL,
    "duration_ms" integer NOT NULL,
    "metadata" "jsonb",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."performance_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permission_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "module" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preview_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "password_hash" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "views_count" integer DEFAULT 0 NOT NULL,
    "max_views" integer,
    "created_by_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."preview_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."print_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "vendor" "text" NOT NULL,
    "batch_number" integer NOT NULL,
    "pdf_url" "text",
    "recipient_count" integer DEFAULT 0,
    "status" "public"."batch_status" DEFAULT 'pending'::"public"."batch_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."print_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "notification_preferences" "jsonb" DEFAULT '{"sms": false, "email": {"campaigns": true, "gift_cards": true, "system_alerts": true}}'::"jsonb",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provisioning_alert_thresholds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "metric_name" "text" NOT NULL,
    "warning_threshold" numeric NOT NULL,
    "critical_threshold" numeric NOT NULL,
    "comparison_operator" "text" DEFAULT '>'::"text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "provisioning_alert_thresholds_comparison_operator_check" CHECK (("comparison_operator" = ANY (ARRAY['>'::"text", '<'::"text", '>='::"text", '<='::"text"])))
);


ALTER TABLE "public"."provisioning_alert_thresholds" OWNER TO "postgres";


COMMENT ON TABLE "public"."provisioning_alert_thresholds" IS 'Configurable alert thresholds for provisioning monitoring';



CREATE TABLE IF NOT EXISTS "public"."qr_code_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "layer_id" "text" NOT NULL,
    "base_url" "text" NOT NULL,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "custom_utm_1" "text",
    "custom_utm_2" "text",
    "custom_utm_3" "text",
    "size" integer DEFAULT 200,
    "foreground_color" "text" DEFAULT '#000000'::"text",
    "background_color" "text" DEFAULT '#FFFFFF'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qr_code_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_tracking_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_agent" "text",
    "ip_address" "text",
    "device_type" "text",
    "location_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."qr_tracking_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "endpoint" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_agent" "text",
    "request_method" "text",
    "request_path" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."rate_limit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_limit_log" IS 'Log of API requests for rate limiting and abuse prevention';



CREATE TABLE IF NOT EXISTS "public"."rate_limit_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limit_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_limit_tracking" IS 'Tracks API requests for rate limiting public endpoints';



CREATE TABLE IF NOT EXISTS "public"."recipient_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid",
    "action" "text" NOT NULL,
    "performed_by_user_id" "uuid",
    "call_session_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipient_audit_log_action_check" CHECK (("action" = ANY (ARRAY['uploaded'::"text", 'approved'::"text", 'rejected'::"text", 'redeemed'::"text", 'viewed'::"text", 'gift_card_assigned'::"text", 'sms_sent'::"text", 'email_sent'::"text"])))
);


ALTER TABLE "public"."recipient_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipient_enrichment_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "agent_user_id" "uuid" NOT NULL,
    "field_updated" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "enrichment_source" "text" DEFAULT 'call_center'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recipient_enrichment_log_enrichment_source_check" CHECK (("enrichment_source" = ANY (ARRAY['call_center'::"text", 'manual_entry'::"text", 'verified'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."recipient_enrichment_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audience_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "company" "text",
    "address1" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "zip4" "text",
    "email" "text",
    "phone" "text",
    "token" "text" NOT NULL,
    "geocode_json" "jsonb" DEFAULT '{}'::"jsonb",
    "validation_status" "public"."validation_status" DEFAULT 'valid'::"public"."validation_status",
    "validation_details_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "delivery_status" "text",
    "approval_status" "text" DEFAULT 'pending'::"text",
    "approved_by_user_id" "uuid",
    "approved_at" timestamp with time zone,
    "approved_call_session_id" "uuid",
    "rejection_reason" "text",
    "gift_card_assigned_id" "uuid",
    "redemption_code" "text",
    "redemption_ip" "text",
    "redemption_user_agent" "text",
    "redemption_completed_at" timestamp with time zone,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "contact_id" "uuid",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    "campaign_id" "uuid",
    "last_enriched_at" timestamp with time zone,
    "enriched_by_user_id" "uuid",
    "sms_opt_in_status" "text" DEFAULT 'not_sent'::"text",
    "sms_opt_in_sent_at" timestamp with time zone,
    "sms_opt_in_response_at" timestamp with time zone,
    "sms_opt_in_response" "text",
    "verification_method" "text",
    "disposition" "text",
    "email_verification_token" "text",
    "email_verification_sent_at" timestamp with time zone,
    "email_verified_at" timestamp with time zone,
    CONSTRAINT "recipients_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'redeemed'::"text"]))),
    CONSTRAINT "recipients_sms_opt_in_status_check" CHECK (("sms_opt_in_status" = ANY (ARRAY['not_sent'::"text", 'pending'::"text", 'opted_in'::"text", 'opted_out'::"text", 'invalid_response'::"text"])))
);


ALTER TABLE "public"."recipients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."recipients"."custom_fields" IS 'Industry-specific custom data - stores any additional fields from CSV imports that dont map to standard columns';



COMMENT ON COLUMN "public"."recipients"."is_simulated" IS 'Marks recipients created for demo/simulation purposes';



COMMENT ON COLUMN "public"."recipients"."verification_method" IS 'How the customer was verified: sms, email, or skipped';



COMMENT ON COLUMN "public"."recipients"."disposition" IS 'Call disposition: verified_verbally, already_opted_in, vip_customer, do_not_call, not_interested, wrong_number, call_back_later, invalid_contact';



COMMENT ON COLUMN "public"."recipients"."email_verification_token" IS 'Token for email verification link';



COMMENT ON COLUMN "public"."recipients"."email_verification_sent_at" IS 'When verification email was sent';



COMMENT ON COLUMN "public"."recipients"."email_verified_at" IS 'When customer verified via email';



CREATE TABLE IF NOT EXISTS "public"."role_hierarchy" (
    "role" "public"."app_role" NOT NULL,
    "level" integer NOT NULL,
    "can_manage_roles" "public"."app_role"[] NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."role_hierarchy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "permission_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."app_role" NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."role_permissions" IS 'Defines which permissions are available to each role. calls.confirm_redemption allows access to call center redemption panel.';



CREATE TABLE IF NOT EXISTS "public"."security_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action_type" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "success" boolean DEFAULT true,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."simulation_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "data_types" "text"[],
    "total_records" integer DEFAULT 0,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'completed'::"text",
    "error_message" "text"
);


ALTER TABLE "public"."simulation_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_delivery_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid",
    "gift_card_id" "uuid",
    "campaign_id" "uuid",
    "phone_number" "text" NOT NULL,
    "message_body" "text" NOT NULL,
    "delivery_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "twilio_message_sid" "text",
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "last_retry_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "delivered_at" timestamp with time zone,
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    "provider_used" "text",
    CONSTRAINT "sms_delivery_log_provider_used_check" CHECK (("provider_used" = ANY (ARRAY['infobip'::"text", 'twilio'::"text"])))
);


ALTER TABLE "public"."sms_delivery_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_opt_in_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "call_session_id" "uuid",
    "phone" "text" NOT NULL,
    "message_sid" "text",
    "direction" "text" NOT NULL,
    "message_text" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_used" "text",
    CONSTRAINT "sms_opt_in_log_direction_check" CHECK (("direction" = ANY (ARRAY['outbound'::"text", 'inbound'::"text"]))),
    CONSTRAINT "sms_opt_in_log_provider_used_check" CHECK (("provider_used" = ANY (ARRAY['infobip'::"text", 'twilio'::"text"]))),
    CONSTRAINT "sms_opt_in_log_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'failed'::"text", 'received'::"text"])))
);


ALTER TABLE "public"."sms_opt_in_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_provider_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "primary_provider" "text" DEFAULT 'infobip'::"text" NOT NULL,
    "enable_fallback" boolean DEFAULT true,
    "infobip_enabled" boolean DEFAULT true,
    "infobip_base_url" "text" DEFAULT 'https://api.infobip.com'::"text",
    "infobip_api_key_name" "text" DEFAULT 'INFOBIP_API_KEY'::"text",
    "infobip_sender_id" "text",
    "twilio_enabled" boolean DEFAULT true,
    "twilio_account_sid_name" "text" DEFAULT 'TWILIO_ACCOUNT_SID'::"text",
    "twilio_auth_token_name" "text" DEFAULT 'TWILIO_AUTH_TOKEN'::"text",
    "twilio_from_number_name" "text" DEFAULT 'TWILIO_FROM_NUMBER'::"text",
    "fallback_on_error" boolean DEFAULT true,
    "log_all_attempts" boolean DEFAULT true,
    "max_messages_per_minute" integer DEFAULT 100,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by_user_id" "uuid",
    CONSTRAINT "single_settings_row" CHECK (("id" IS NOT NULL)),
    CONSTRAINT "sms_provider_settings_primary_provider_check" CHECK (("primary_provider" = ANY (ARRAY['infobip'::"text", 'twilio'::"text"])))
);


ALTER TABLE "public"."sms_provider_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."sms_provider_settings" IS 'Global SMS provider configuration. Supports Infobip as primary with Twilio fallback.';



COMMENT ON COLUMN "public"."sms_provider_settings"."primary_provider" IS 'Primary SMS provider: infobip or twilio';



COMMENT ON COLUMN "public"."sms_provider_settings"."enable_fallback" IS 'Whether to try backup provider if primary fails';



COMMENT ON COLUMN "public"."sms_provider_settings"."infobip_sender_id" IS 'Sender ID or phone number for Infobip messages';



COMMENT ON COLUMN "public"."sms_provider_settings"."fallback_on_error" IS 'Automatically switch to fallback provider on errors';



CREATE TABLE IF NOT EXISTS "public"."suppressed_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "address1" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "zip" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "suppressed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "suppressed_addresses_reason_check" CHECK (("reason" = ANY (ARRAY['returned'::"text", 'invalid'::"text", 'opted_out'::"text"])))
);


ALTER TABLE "public"."suppressed_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text" NOT NULL,
    "due_date" timestamp with time zone,
    "assigned_to" "uuid",
    "created_by" "uuid",
    "client_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "contact_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Task management table for tracking work items across the platform';



CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "size" "public"."template_size" NOT NULL,
    "json_layers" "jsonb" DEFAULT '{}'::"jsonb",
    "thumbnail_url" "text",
    "industry_vertical" "public"."industry_type",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_favorite" boolean DEFAULT false,
    "editor_state" "text" DEFAULT 'ai_editing'::"text",
    "ai_chat_history" "jsonb" DEFAULT '[]'::"jsonb",
    "design_iterations" integer DEFAULT 0,
    "manual_edits_count" integer DEFAULT 0,
    "grapesjs_project" "jsonb",
    "design_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "last_ai_edit_at" timestamp with time zone,
    "first_manual_edit_at" timestamp with time zone,
    "print_specifications" "jsonb" DEFAULT '{"dpi": 300, "trimSize": {"unit": "inches", "width": 6, "height": 4}, "colorMode": "CMYK", "bleedInches": 0.125, "safeZoneInches": 0.25}'::"jsonb",
    "has_back_design" boolean DEFAULT false,
    "back_grapesjs_project" "jsonb",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    CONSTRAINT "templates_editor_state_check" CHECK (("editor_state" = ANY (ARRAY['ai_editing'::"text", 'manual_editing'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracked_phone_numbers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "phone_number" "text" NOT NULL,
    "twilio_sid" "text",
    "campaign_id" "uuid",
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "assigned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recording_enabled" boolean DEFAULT true,
    "forward_to_number" "text",
    "monthly_cost" numeric(10,2) DEFAULT 1.00,
    "purchased_at" timestamp with time zone DEFAULT "now"(),
    "friendly_name" "text",
    "is_simulated" boolean DEFAULT false,
    "simulation_batch_id" "uuid",
    CONSTRAINT "tracked_phone_numbers_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'assigned'::"text", 'decommissioned'::"text"])))
);


ALTER TABLE "public"."tracked_phone_numbers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid",
    "event_type" "text" NOT NULL,
    "feature_name" "text" NOT NULL,
    "metadata" "jsonb",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."usage_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_agencies_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."user_agencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid",
    "org_id" "uuid",
    "client_id" "uuid",
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'base64'::"text") NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."app_role" DEFAULT 'company_owner'::"public"."app_role" NOT NULL,
    CONSTRAINT "user_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_management_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "target_user_id" "uuid",
    "action" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_management_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_id" "uuid",
    "granted" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_table_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "visible_columns" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "column_order" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "column_widths" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_table_preferences" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_active_provisioning_issues" AS
 SELECT "cc"."id" AS "condition_id",
    "cc"."campaign_id",
    "c"."name" AS "campaign_name",
    "cc"."condition_number",
    "cc"."condition_name",
    "cc"."brand_id",
    "gcb"."brand_name",
    "cc"."card_value",
        CASE
            WHEN (("cc"."brand_id" IS NULL) AND ("cc"."card_value" IS NULL)) THEN 'Missing brand and value'::"text"
            WHEN ("cc"."brand_id" IS NULL) THEN 'Missing brand'::"text"
            WHEN (("cc"."card_value" IS NULL) OR ("cc"."card_value" = (0)::numeric)) THEN 'Missing value'::"text"
            ELSE NULL::"text"
        END AS "config_issue",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."gift_card_inventory"
          WHERE (("gift_card_inventory"."brand_id" = "cc"."brand_id") AND ("gift_card_inventory"."denomination" = "cc"."card_value") AND ("gift_card_inventory"."status" = 'available'::"text"))), (0)::bigint) AS "available_inventory",
    "cc"."is_active",
    "cc"."created_at"
   FROM (("public"."campaign_conditions" "cc"
     JOIN "public"."campaigns" "c" ON (("c"."id" = "cc"."campaign_id")))
     LEFT JOIN "public"."gift_card_brands" "gcb" ON (("gcb"."id" = "cc"."brand_id")))
  WHERE (("cc"."is_active" = true) AND ("c"."status" <> 'completed'::"public"."campaign_status") AND (("cc"."brand_id" IS NULL) OR ("cc"."card_value" IS NULL) OR ("cc"."card_value" = (0)::numeric)))
  ORDER BY "cc"."created_at" DESC;


ALTER VIEW "public"."v_active_provisioning_issues" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_active_provisioning_issues" IS 'Active campaign conditions with configuration issues that will fail provisioning';



CREATE OR REPLACE VIEW "public"."v_campaign_provisioning_stats" AS
 SELECT "t"."campaign_id",
    "c"."name" AS "campaign_name",
    "count"(DISTINCT "t"."request_id") AS "total_attempts",
    "count"(DISTINCT "t"."request_id") FILTER (WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."gift_card_provisioning_trace" "t2"
          WHERE (("t2"."request_id" = "t"."request_id") AND ("t2"."status" = 'failed'::"text")))))) AS "successful_provisions",
    "count"(DISTINCT "t"."request_id") FILTER (WHERE (EXISTS ( SELECT 1
           FROM "public"."gift_card_provisioning_trace" "t2"
          WHERE (("t2"."request_id" = "t"."request_id") AND ("t2"."status" = 'failed'::"text"))))) AS "failed_provisions",
    "max"("t"."created_at") AS "last_provision_attempt",
    "mode"() WITHIN GROUP (ORDER BY "t"."error_code") FILTER (WHERE ("t"."error_code" IS NOT NULL)) AS "most_common_error"
   FROM ("public"."gift_card_provisioning_trace" "t"
     LEFT JOIN "public"."campaigns" "c" ON (("c"."id" = "t"."campaign_id")))
  WHERE ("t"."created_at" >= ("now"() - '30 days'::interval))
  GROUP BY "t"."campaign_id", "c"."name"
  ORDER BY ("count"(DISTINCT "t"."request_id")) DESC;


ALTER VIEW "public"."v_campaign_provisioning_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_campaign_provisioning_stats" IS 'Provisioning statistics per campaign for the last 30 days';



CREATE OR REPLACE VIEW "public"."v_conditions_needing_gift_card_config" AS
 SELECT "cc"."id" AS "condition_id",
    "cc"."campaign_id",
    "c"."name" AS "campaign_name",
    "c"."status" AS "campaign_status",
    "cl"."name" AS "client_name",
    "cc"."condition_number",
    "cc"."condition_name",
    "cc"."brand_id",
    "cc"."card_value",
    "cc"."is_active",
        CASE
            WHEN (("cc"."brand_id" IS NULL) AND ("cc"."card_value" IS NULL)) THEN 'Missing brand and value'::"text"
            WHEN ("cc"."brand_id" IS NULL) THEN 'Missing brand'::"text"
            WHEN (("cc"."card_value" IS NULL) OR ("cc"."card_value" = (0)::numeric)) THEN 'Missing value'::"text"
            ELSE 'OK'::"text"
        END AS "issue_type"
   FROM (("public"."campaign_conditions" "cc"
     JOIN "public"."campaigns" "c" ON (("c"."id" = "cc"."campaign_id")))
     LEFT JOIN "public"."clients" "cl" ON (("cl"."id" = "c"."client_id")))
  WHERE ((("cc"."brand_id" IS NULL) OR ("cc"."card_value" IS NULL) OR ("cc"."card_value" = (0)::numeric)) AND ("cc"."is_active" = true));


ALTER VIEW "public"."v_conditions_needing_gift_card_config" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_conditions_needing_gift_card_config" IS 'View showing all active campaign conditions that need gift card configuration before they can be used for provisioning.';



CREATE OR REPLACE VIEW "public"."v_provisioning_attempts" AS
 SELECT "request_id",
    "min"("created_at") AS "started_at",
    "max"("created_at") AS "ended_at",
    "max"("step_number") AS "total_steps",
    "campaign_id",
    "recipient_id",
    "brand_id",
    "denomination",
        CASE
            WHEN ("count"(*) FILTER (WHERE ("status" = 'failed'::"text")) > 0) THEN 'failed'::"text"
            WHEN ("count"(*) FILTER (WHERE ("status" = 'completed'::"text")) = "max"("step_number")) THEN 'success'::"text"
            ELSE 'in_progress'::"text"
        END AS "overall_status",
    "max"("error_message") FILTER (WHERE ("status" = 'failed'::"text")) AS "failure_message",
    "max"("error_code") FILTER (WHERE ("status" = 'failed'::"text")) AS "failure_code",
    "sum"("duration_ms") AS "total_duration_ms"
   FROM "public"."gift_card_provisioning_trace"
  GROUP BY "request_id", "campaign_id", "recipient_id", "brand_id", "denomination";


ALTER VIEW "public"."v_provisioning_attempts" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_provisioning_attempts" IS 'Aggregated view of provisioning attempts with overall status';



CREATE OR REPLACE VIEW "public"."v_provisioning_health_hourly" AS
 SELECT "date_trunc"('hour'::"text", "created_at") AS "hour",
    "count"(DISTINCT "request_id") AS "total_attempts",
    "count"(DISTINCT "request_id") FILTER (WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."gift_card_provisioning_trace" "t2"
          WHERE (("t2"."request_id" = "gift_card_provisioning_trace"."request_id") AND ("t2"."status" = 'failed'::"text")))))) AS "successful_attempts",
    "count"(DISTINCT "request_id") FILTER (WHERE (EXISTS ( SELECT 1
           FROM "public"."gift_card_provisioning_trace" "t2"
          WHERE (("t2"."request_id" = "gift_card_provisioning_trace"."request_id") AND ("t2"."status" = 'failed'::"text"))))) AS "failed_attempts",
    "round"(((100.0 * ("count"(DISTINCT "request_id") FILTER (WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."gift_card_provisioning_trace" "t2"
          WHERE (("t2"."request_id" = "gift_card_provisioning_trace"."request_id") AND ("t2"."status" = 'failed'::"text")))))))::numeric) / (NULLIF("count"(DISTINCT "request_id"), 0))::numeric), 2) AS "success_rate",
    "round"("avg"("duration_ms") FILTER (WHERE ("duration_ms" IS NOT NULL)), 2) AS "avg_duration_ms"
   FROM "public"."gift_card_provisioning_trace"
  WHERE ("created_at" >= ("now"() - '7 days'::interval))
  GROUP BY ("date_trunc"('hour'::"text", "created_at"))
  ORDER BY ("date_trunc"('hour'::"text", "created_at")) DESC;


ALTER VIEW "public"."v_provisioning_health_hourly" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_provisioning_health_hourly" IS 'Hourly aggregation of provisioning health metrics for trending';



CREATE OR REPLACE VIEW "public"."v_provisioning_step_performance" AS
 SELECT "step_name",
    "count"(*) AS "total_executions",
    "count"(*) FILTER (WHERE ("status" = 'completed'::"text")) AS "completed",
    "count"(*) FILTER (WHERE ("status" = 'failed'::"text")) AS "failed",
    "count"(*) FILTER (WHERE ("status" = 'skipped'::"text")) AS "skipped",
    "round"("avg"("duration_ms") FILTER (WHERE ("duration_ms" IS NOT NULL)), 2) AS "avg_duration_ms",
    "percentile_cont"((0.5)::double precision) WITHIN GROUP (ORDER BY (("duration_ms")::double precision)) FILTER (WHERE ("duration_ms" IS NOT NULL)) AS "median_duration_ms",
    "percentile_cont"((0.95)::double precision) WITHIN GROUP (ORDER BY (("duration_ms")::double precision)) FILTER (WHERE ("duration_ms" IS NOT NULL)) AS "p95_duration_ms",
    "max"("duration_ms") AS "max_duration_ms"
   FROM "public"."gift_card_provisioning_trace"
  WHERE ("created_at" >= ("now"() - '24:00:00'::interval))
  GROUP BY "step_name"
  ORDER BY
        CASE "step_name"
            WHEN 'Validate Input Parameters'::"text" THEN 1
            WHEN 'Get Billing Entity'::"text" THEN 2
            WHEN 'Check Entity Credits'::"text" THEN 3
            WHEN 'Get Brand Details'::"text" THEN 4
            WHEN 'Check Inventory Availability'::"text" THEN 5
            WHEN 'Claim from Inventory'::"text" THEN 6
            WHEN 'Check Tillo Configuration'::"text" THEN 7
            WHEN 'Provision from Tillo API'::"text" THEN 8
            WHEN 'Save Tillo Card to Inventory'::"text" THEN 9
            WHEN 'Get Pricing Configuration'::"text" THEN 10
            WHEN 'Record Billing Transaction'::"text" THEN 11
            WHEN 'Finalize and Return Result'::"text" THEN 12
            ELSE 99
        END;


ALTER VIEW "public"."v_provisioning_step_performance" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_provisioning_step_performance" IS 'Performance metrics for each provisioning step';



CREATE OR REPLACE VIEW "public"."v_top_provisioning_failures" AS
 SELECT "error_code",
    "error_message",
    "count"(*) AS "occurrence_count",
    "count"(DISTINCT "campaign_id") AS "affected_campaigns",
    "count"(DISTINCT "recipient_id") AS "affected_recipients",
    "max"("created_at") AS "last_occurred",
    "min"("created_at") AS "first_occurred"
   FROM "public"."gift_card_provisioning_trace"
  WHERE (("status" = 'failed'::"text") AND ("error_code" IS NOT NULL) AND ("created_at" >= ("now"() - '7 days'::interval)))
  GROUP BY "error_code", "error_message"
  ORDER BY ("count"(*)) DESC
 LIMIT 20;


ALTER VIEW "public"."v_top_provisioning_failures" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_top_provisioning_failures" IS 'Top 20 most common provisioning failures in the last 7 days';



CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "api_endpoint" "text",
    "api_key_secret_name" "text",
    "capabilities_json" "jsonb" DEFAULT '{}'::"jsonb",
    "active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "response_status" integer,
    "response_body" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "events" "text"[] NOT NULL,
    "secret" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_triggered_at" timestamp with time zone,
    "failure_count" integer DEFAULT 0,
    "integration_type" "text" DEFAULT 'generic'::"text",
    "zapier_metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zapier_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "connection_name" "text" NOT NULL,
    "zap_webhook_url" "text" NOT NULL,
    "description" "text",
    "trigger_events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_triggered_at" timestamp with time zone,
    "success_count" integer DEFAULT 0,
    "failure_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."zapier_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zapier_trigger_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "zapier_connection_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "response_status" integer,
    "response_body" "text",
    "error" "text",
    "triggered_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."zapier_trigger_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ace_form_submissions"
    ADD CONSTRAINT "ace_form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ace_forms"
    ADD CONSTRAINT "ace_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_impersonations"
    ADD CONSTRAINT "admin_impersonations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencies"
    ADD CONSTRAINT "agencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencies"
    ADD CONSTRAINT "agencies_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."agency_available_gift_cards"
    ADD CONSTRAINT "agency_available_gift_cards_agency_id_brand_id_denomination_key" UNIQUE ("agency_id", "brand_id", "denomination");



ALTER TABLE ONLY "public"."agency_available_gift_cards"
    ADD CONSTRAINT "agency_available_gift_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agency_client_assignments"
    ADD CONSTRAINT "agency_client_assignments_agency_org_id_client_id_key" UNIQUE ("agency_org_id", "client_id");



ALTER TABLE ONLY "public"."agency_client_assignments"
    ADD CONSTRAINT "agency_client_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_performance_metrics"
    ADD CONSTRAINT "agent_performance_metrics_agent_user_id_date_key" UNIQUE ("agent_user_id", "date");



ALTER TABLE ONLY "public"."agent_performance_metrics"
    ADD CONSTRAINT "agent_performance_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_design_sessions"
    ADD CONSTRAINT "ai_design_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audiences"
    ADD CONSTRAINT "audiences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auto_reload_queue"
    ADD CONSTRAINT "auto_reload_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beta_feedback"
    ADD CONSTRAINT "beta_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_kits"
    ADD CONSTRAINT "brand_kits_client_id_name_key" UNIQUE ("client_id", "name");



ALTER TABLE ONLY "public"."brand_kits"
    ADD CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_code_uploads"
    ADD CONSTRAINT "bulk_code_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_center_scripts"
    ADD CONSTRAINT "call_center_scripts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_conditions_met"
    ADD CONSTRAINT "call_conditions_met_call_session_id_condition_number_key" UNIQUE ("call_session_id", "condition_number");



ALTER TABLE ONLY "public"."call_conditions_met"
    ADD CONSTRAINT "call_conditions_met_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_dispositions"
    ADD CONSTRAINT "call_dispositions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_approvals"
    ADD CONSTRAINT "campaign_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_comments"
    ADD CONSTRAINT "campaign_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_conditions"
    ADD CONSTRAINT "campaign_conditions_campaign_id_condition_number_key" UNIQUE ("campaign_id", "condition_number");



ALTER TABLE ONLY "public"."campaign_conditions"
    ADD CONSTRAINT "campaign_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_drafts"
    ADD CONSTRAINT "campaign_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_gift_card_config"
    ADD CONSTRAINT "campaign_gift_card_config_campaign_id_condition_number_key" UNIQUE ("campaign_id", "condition_number");



ALTER TABLE ONLY "public"."campaign_gift_card_config"
    ADD CONSTRAINT "campaign_gift_card_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_message_settings"
    ADD CONSTRAINT "campaign_message_settings_campaign_id_key" UNIQUE ("campaign_id");



ALTER TABLE ONLY "public"."campaign_message_settings"
    ADD CONSTRAINT "campaign_message_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_prototypes"
    ADD CONSTRAINT "campaign_prototypes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_reward_configs"
    ADD CONSTRAINT "campaign_reward_configs_campaign_id_condition_number_key" UNIQUE ("campaign_id", "condition_number");



ALTER TABLE ONLY "public"."campaign_reward_configs"
    ADD CONSTRAINT "campaign_reward_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_versions"
    ADD CONSTRAINT "campaign_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_available_gift_cards"
    ADD CONSTRAINT "client_available_gift_cards_client_id_brand_id_denomination_key" UNIQUE ("client_id", "brand_id", "denomination");



ALTER TABLE ONLY "public"."client_available_gift_cards"
    ADD CONSTRAINT "client_available_gift_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_users"
    ADD CONSTRAINT "client_users_client_id_user_id_key" UNIQUE ("client_id", "user_id");



ALTER TABLE ONLY "public"."client_users"
    ADD CONSTRAINT "client_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_campaign_participation"
    ADD CONSTRAINT "contact_campaign_participation_contact_id_campaign_id_key" UNIQUE ("contact_id", "campaign_id");



ALTER TABLE ONLY "public"."contact_campaign_participation"
    ADD CONSTRAINT "contact_campaign_participation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_code_audit"
    ADD CONSTRAINT "contact_code_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_custom_field_definitions"
    ADD CONSTRAINT "contact_custom_field_definitions_client_id_field_name_key" UNIQUE ("client_id", "field_name");



ALTER TABLE ONLY "public"."contact_custom_field_definitions"
    ADD CONSTRAINT "contact_custom_field_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_contact_id_list_id_key" UNIQUE ("contact_id", "list_id");



ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_lists"
    ADD CONSTRAINT "contact_lists_client_id_name_key" UNIQUE ("client_id", "name");



ALTER TABLE ONLY "public"."contact_lists"
    ADD CONSTRAINT "contact_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_contact_id_tag_key" UNIQUE ("contact_id", "tag");



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_client_id_email_key" UNIQUE ("client_id", "email");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_client_id_phone_key" UNIQUE ("client_id", "phone");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_accounts"
    ADD CONSTRAINT "credit_accounts_entity_type_entity_id_key" UNIQUE ("entity_type", "entity_id");



ALTER TABLE ONLY "public"."credit_accounts"
    ADD CONSTRAINT "credit_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_system_config"
    ADD CONSTRAINT "credit_system_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_events"
    ADD CONSTRAINT "crm_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crm_integrations"
    ADD CONSTRAINT "crm_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_versions"
    ADD CONSTRAINT "design_versions_design_type_design_id_version_number_key" UNIQUE ("design_type", "design_id", "version_number");



ALTER TABLE ONLY "public"."design_versions"
    ADD CONSTRAINT "design_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentation_feedback"
    ADD CONSTRAINT "documentation_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentation_pages"
    ADD CONSTRAINT "documentation_pages_category_slug_key" UNIQUE ("category", "slug");



ALTER TABLE ONLY "public"."documentation_pages"
    ADD CONSTRAINT "documentation_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentation_pages"
    ADD CONSTRAINT "documentation_pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."documentation_views"
    ADD CONSTRAINT "documentation_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dr_phillip_chats"
    ADD CONSTRAINT "dr_phillip_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_card_billing_ledger"
    ADD CONSTRAINT "gift_card_billing_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_card_brands"
    ADD CONSTRAINT "gift_card_brands_brand_code_key" UNIQUE ("brand_code");



ALTER TABLE ONLY "public"."gift_card_brands"
    ADD CONSTRAINT "gift_card_brands_brand_name_key" UNIQUE ("brand_name");



ALTER TABLE ONLY "public"."gift_card_brands"
    ADD CONSTRAINT "gift_card_brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_card_denominations"
    ADD CONSTRAINT "gift_card_denominations_brand_id_denomination_key" UNIQUE ("brand_id", "denomination");



ALTER TABLE ONLY "public"."gift_card_denominations"
    ADD CONSTRAINT "gift_card_denominations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_card_inventory_balance_history"
    ADD CONSTRAINT "gift_card_inventory_balance_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_card_inventory"
    ADD CONSTRAINT "gift_card_inventory_card_code_key" UNIQUE ("card_code");



ALTER TABLE ONLY "public"."gift_card_inventory"
    ADD CONSTRAINT "gift_card_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_card_provisioning_trace"
    ADD CONSTRAINT "gift_card_provisioning_trace_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_page_ai_chats"
    ADD CONSTRAINT "landing_page_ai_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_page_exports"
    ADD CONSTRAINT "landing_page_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_page_versions"
    ADD CONSTRAINT "landing_page_versions_landing_page_id_version_number_key" UNIQUE ("landing_page_id", "version_number");



ALTER TABLE ONLY "public"."landing_page_versions"
    ADD CONSTRAINT "landing_page_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_client_id_slug_key" UNIQUE ("client_id", "slug");



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_filter_presets"
    ADD CONSTRAINT "lead_filter_presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_purchases"
    ADD CONSTRAINT "lead_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_sources"
    ADD CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_history"
    ADD CONSTRAINT "login_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mail_provider_settings"
    ADD CONSTRAINT "mail_provider_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mail_submissions"
    ADD CONSTRAINT "mail_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_client_id_name_template_type_key" UNIQUE ("client_id", "name", "template_type");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_templates"
    ADD CONSTRAINT "permission_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preview_links"
    ADD CONSTRAINT "preview_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preview_links"
    ADD CONSTRAINT "preview_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."print_batches"
    ADD CONSTRAINT "print_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provisioning_alert_thresholds"
    ADD CONSTRAINT "provisioning_alert_thresholds_metric_name_key" UNIQUE ("metric_name");



ALTER TABLE ONLY "public"."provisioning_alert_thresholds"
    ADD CONSTRAINT "provisioning_alert_thresholds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_code_configs"
    ADD CONSTRAINT "qr_code_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_tracking_events"
    ADD CONSTRAINT "qr_tracking_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_log"
    ADD CONSTRAINT "rate_limit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limit_tracking"
    ADD CONSTRAINT "rate_limit_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipient_audit_log"
    ADD CONSTRAINT "recipient_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipient_enrichment_log"
    ADD CONSTRAINT "recipient_enrichment_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_audience_redemption_code_unique" UNIQUE ("audience_id", "redemption_code");



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."role_hierarchy"
    ADD CONSTRAINT "role_hierarchy_pkey" PRIMARY KEY ("role");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_permission_unique" UNIQUE ("role", "permission_id");



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_batches"
    ADD CONSTRAINT "simulation_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_delivery_log"
    ADD CONSTRAINT "sms_delivery_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_opt_in_log"
    ADD CONSTRAINT "sms_opt_in_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_provider_settings"
    ADD CONSTRAINT "sms_provider_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppressed_addresses"
    ADD CONSTRAINT "suppressed_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracked_phone_numbers"
    ADD CONSTRAINT "tracked_phone_numbers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_analytics"
    ADD CONSTRAINT "usage_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_agencies"
    ADD CONSTRAINT "user_agencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_agencies"
    ADD CONSTRAINT "user_agencies_user_id_agency_id_key" UNIQUE ("user_id", "agency_id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."user_management_audit"
    ADD CONSTRAINT "user_management_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_permission_id_key" UNIQUE ("user_id", "permission_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_table_preferences"
    ADD CONSTRAINT "user_table_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_table_preferences"
    ADD CONSTRAINT "user_table_preferences_user_id_table_name_key" UNIQUE ("user_id", "table_name");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zapier_connections"
    ADD CONSTRAINT "zapier_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zapier_trigger_logs"
    ADD CONSTRAINT "zapier_trigger_logs_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "contacts_unique_code_per_client_key" ON "public"."contacts" USING "btree" ("client_id", "customer_code");



CREATE INDEX "idx_ace_form_submissions_contact_id" ON "public"."ace_form_submissions" USING "btree" ("contact_id");



CREATE INDEX "idx_ace_form_submissions_form_date" ON "public"."ace_form_submissions" USING "btree" ("form_id", "submitted_at" DESC);



CREATE INDEX "idx_ace_form_submissions_form_id" ON "public"."ace_form_submissions" USING "btree" ("form_id");



CREATE INDEX "idx_ace_form_submissions_gift_card_id" ON "public"."ace_form_submissions" USING "btree" ("gift_card_id");



CREATE INDEX "idx_ace_form_submissions_submitted_at" ON "public"."ace_form_submissions" USING "btree" ("submitted_at" DESC);



CREATE INDEX "idx_ace_forms_campaign" ON "public"."ace_forms" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_ace_forms_client_active" ON "public"."ace_forms" USING "btree" ("client_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_ace_forms_client_draft" ON "public"."ace_forms" USING "btree" ("client_id", "is_draft");



CREATE INDEX "idx_ace_forms_client_id" ON "public"."ace_forms" USING "btree" ("client_id");



CREATE INDEX "idx_ace_forms_template_id" ON "public"."ace_forms" USING "btree" ("template_id");



CREATE INDEX "idx_activities_campaign_id" ON "public"."activities" USING "btree" ("campaign_id");



CREATE INDEX "idx_activities_client_id" ON "public"."activities" USING "btree" ("client_id");



CREATE INDEX "idx_activities_contact_id" ON "public"."activities" USING "btree" ("contact_id");



CREATE INDEX "idx_activities_created_at" ON "public"."activities" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activities_scheduled_at" ON "public"."activities" USING "btree" ("scheduled_at");



CREATE INDEX "idx_activities_type" ON "public"."activities" USING "btree" ("type");



CREATE INDEX "idx_admin_alerts_alert_type" ON "public"."admin_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_admin_alerts_created_at" ON "public"."admin_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_alerts_unacknowledged" ON "public"."admin_alerts" USING "btree" ("created_at") WHERE ("acknowledged_at" IS NULL);



CREATE INDEX "idx_admin_impersonations_active" ON "public"."admin_impersonations" USING "btree" ("ended_at") WHERE ("ended_at" IS NULL);



CREATE INDEX "idx_admin_impersonations_admin_user" ON "public"."admin_impersonations" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_impersonations_impersonated_user" ON "public"."admin_impersonations" USING "btree" ("impersonated_user_id");



CREATE INDEX "idx_admin_notifications_client" ON "public"."admin_notifications" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "idx_admin_notifications_status" ON "public"."admin_notifications" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_admin_notifications_type" ON "public"."admin_notifications" USING "btree" ("notification_type", "status");



CREATE INDEX "idx_agency_giftcards_agency" ON "public"."agency_available_gift_cards" USING "btree" ("agency_id");



CREATE INDEX "idx_agency_giftcards_brand" ON "public"."agency_available_gift_cards" USING "btree" ("brand_id");



CREATE INDEX "idx_agency_giftcards_enabled" ON "public"."agency_available_gift_cards" USING "btree" ("is_enabled") WHERE ("is_enabled" = true);



CREATE INDEX "idx_agent_performance_metrics_agent_date" ON "public"."agent_performance_metrics" USING "btree" ("agent_user_id", "date");



CREATE INDEX "idx_ai_sessions_design" ON "public"."ai_design_sessions" USING "btree" ("design_type", "design_id");



CREATE INDEX "idx_ai_sessions_user" ON "public"."ai_design_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_audiences_client_id" ON "public"."audiences" USING "btree" ("client_id");



CREATE INDEX "idx_audiences_client_status" ON "public"."audiences" USING "btree" ("client_id", "status");



CREATE INDEX "idx_audiences_simulated" ON "public"."audiences" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_auto_reload_queue_pending" ON "public"."auto_reload_queue" USING "btree" ("status", "created_at") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "idx_auto_reload_queue_pending_account" ON "public"."auto_reload_queue" USING "btree" ("credit_account_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_beta_feedback_status" ON "public"."beta_feedback" USING "btree" ("status");



CREATE INDEX "idx_beta_feedback_type" ON "public"."beta_feedback" USING "btree" ("feedback_type");



CREATE INDEX "idx_beta_feedback_user_id" ON "public"."beta_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_billing_ledger_brand" ON "public"."gift_card_billing_ledger" USING "btree" ("brand_id");



CREATE INDEX "idx_billing_ledger_campaign" ON "public"."gift_card_billing_ledger" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_billing_ledger_date" ON "public"."gift_card_billing_ledger" USING "btree" ("billed_at" DESC);



CREATE INDEX "idx_billing_ledger_entity" ON "public"."gift_card_billing_ledger" USING "btree" ("billed_entity_type", "billed_entity_id");



CREATE INDEX "idx_billing_ledger_inventory" ON "public"."gift_card_billing_ledger" USING "btree" ("inventory_card_id") WHERE ("inventory_card_id" IS NOT NULL);



CREATE INDEX "idx_billing_ledger_type" ON "public"."gift_card_billing_ledger" USING "btree" ("transaction_type");



CREATE INDEX "idx_brand_kits_client" ON "public"."brand_kits" USING "btree" ("client_id");



CREATE INDEX "idx_bulk_code_uploads_campaign" ON "public"."bulk_code_uploads" USING "btree" ("campaign_id");



CREATE INDEX "idx_bulk_code_uploads_client" ON "public"."bulk_code_uploads" USING "btree" ("client_id");



CREATE INDEX "idx_bulk_code_uploads_created" ON "public"."bulk_code_uploads" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_call_center_scripts_campaign_id" ON "public"."call_center_scripts" USING "btree" ("campaign_id");



CREATE INDEX "idx_call_center_scripts_client_id" ON "public"."call_center_scripts" USING "btree" ("client_id");



CREATE INDEX "idx_call_conditions_campaign" ON "public"."call_conditions_met" USING "btree" ("campaign_id");



CREATE INDEX "idx_call_conditions_met_campaign" ON "public"."call_conditions_met" USING "btree" ("campaign_id", "created_at" DESC);



CREATE INDEX "idx_call_dispositions_agent_user" ON "public"."call_dispositions" USING "btree" ("agent_user_id");



CREATE INDEX "idx_call_sessions_batch" ON "public"."call_sessions" USING "btree" ("simulation_batch_id");



CREATE INDEX "idx_call_sessions_caller_phone" ON "public"."call_sessions" USING "btree" ("caller_phone");



CREATE INDEX "idx_call_sessions_campaign" ON "public"."call_sessions" USING "btree" ("campaign_id");



CREATE INDEX "idx_call_sessions_campaign_status" ON "public"."call_sessions" USING "btree" ("campaign_id", "call_status", "created_at" DESC);



CREATE INDEX "idx_call_sessions_recipient" ON "public"."call_sessions" USING "btree" ("recipient_id");



CREATE INDEX "idx_call_sessions_recording_sid" ON "public"."call_sessions" USING "btree" ("recording_sid") WHERE ("recording_sid" IS NOT NULL);



CREATE INDEX "idx_call_sessions_simulated" ON "public"."call_sessions" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_campaign_approvals_campaign" ON "public"."campaign_approvals" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_comments_campaign" ON "public"."campaign_comments" USING "btree" ("campaign_id", "created_at" DESC);



CREATE INDEX "idx_campaign_conditions_active" ON "public"."campaign_conditions" USING "btree" ("campaign_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_campaign_conditions_brand_value" ON "public"."campaign_conditions" USING "btree" ("brand_id", "card_value") WHERE ("brand_id" IS NOT NULL);



CREATE INDEX "idx_campaign_conditions_campaign" ON "public"."campaign_conditions" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_drafts_client_user" ON "public"."campaign_drafts" USING "btree" ("client_id", "user_id");



CREATE INDEX "idx_campaign_giftcard_brand" ON "public"."campaign_gift_card_config" USING "btree" ("brand_id");



CREATE INDEX "idx_campaign_giftcard_campaign" ON "public"."campaign_gift_card_config" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_message_settings_campaign" ON "public"."campaign_message_settings" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_versions_campaign" ON "public"."campaign_versions" USING "btree" ("campaign_id", "version_number" DESC);



CREATE INDEX "idx_campaigns_client_id" ON "public"."campaigns" USING "btree" ("client_id");



CREATE INDEX "idx_campaigns_client_status" ON "public"."campaigns" USING "btree" ("client_id", "status");



CREATE INDEX "idx_campaigns_created" ON "public"."campaigns" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "idx_campaigns_landing_page" ON "public"."campaigns" USING "btree" ("landing_page_id");



CREATE INDEX "idx_campaigns_mailing_method" ON "public"."campaigns" USING "btree" ("mailing_method");



CREATE INDEX "idx_campaigns_reward_pool" ON "public"."campaigns" USING "btree" ("reward_pool_id") WHERE ("reward_pool_id" IS NOT NULL);



CREATE INDEX "idx_campaigns_rewards_enabled" ON "public"."campaigns" USING "btree" ("client_id", "rewards_enabled") WHERE ("rewards_enabled" = true);



CREATE INDEX "idx_campaigns_simulation_batch" ON "public"."campaigns" USING "btree" ("simulation_batch_id") WHERE ("simulation_batch_id" IS NOT NULL);



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("status");



CREATE INDEX "idx_campaigns_status_client" ON "public"."campaigns" USING "btree" ("client_id", "status");



CREATE INDEX "idx_client_giftcards_brand" ON "public"."client_available_gift_cards" USING "btree" ("brand_id");



CREATE INDEX "idx_client_giftcards_client" ON "public"."client_available_gift_cards" USING "btree" ("client_id");



CREATE INDEX "idx_client_giftcards_enabled" ON "public"."client_available_gift_cards" USING "btree" ("is_enabled") WHERE ("is_enabled" = true);



CREATE INDEX "idx_client_users_client" ON "public"."client_users" USING "btree" ("client_id");



CREATE INDEX "idx_client_users_user" ON "public"."client_users" USING "btree" ("user_id");



CREATE INDEX "idx_clients_archived" ON "public"."clients" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE UNIQUE INDEX "idx_clients_slug" ON "public"."clients" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "idx_contact_campaign_participation_campaign_id" ON "public"."contact_campaign_participation" USING "btree" ("campaign_id");



CREATE INDEX "idx_contact_campaign_participation_contact_id" ON "public"."contact_campaign_participation" USING "btree" ("contact_id");



CREATE INDEX "idx_contact_campaign_participation_recipient_id" ON "public"."contact_campaign_participation" USING "btree" ("recipient_id");



CREATE INDEX "idx_contact_code_audit_contact" ON "public"."contact_code_audit" USING "btree" ("contact_id");



CREATE INDEX "idx_contact_code_audit_date" ON "public"."contact_code_audit" USING "btree" ("changed_at");



CREATE INDEX "idx_contact_list_members_contact" ON "public"."contact_list_members" USING "btree" ("contact_id");



CREATE INDEX "idx_contact_list_members_list" ON "public"."contact_list_members" USING "btree" ("list_id");



CREATE INDEX "idx_contact_list_members_unique_code" ON "public"."contact_list_members" USING "btree" ("unique_code") WHERE ("unique_code" IS NOT NULL);



CREATE INDEX "idx_contact_lists_client_id" ON "public"."contact_lists" USING "btree" ("client_id");



CREATE INDEX "idx_contact_lists_filter_rules" ON "public"."contact_lists" USING "gin" ("filter_rules");



CREATE INDEX "idx_contact_lists_simulated" ON "public"."contact_lists" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_contact_lists_type" ON "public"."contact_lists" USING "btree" ("list_type");



CREATE INDEX "idx_contact_tags_category" ON "public"."contact_tags" USING "btree" ("tag_category");



CREATE INDEX "idx_contact_tags_contact" ON "public"."contact_tags" USING "btree" ("contact_id");



CREATE INDEX "idx_contact_tags_tag" ON "public"."contact_tags" USING "btree" ("tag");



CREATE INDEX "idx_contacts_batch" ON "public"."contacts" USING "btree" ("simulation_batch_id");



CREATE INDEX "idx_contacts_client_id" ON "public"."contacts" USING "btree" ("client_id");



CREATE INDEX "idx_contacts_custom_fields" ON "public"."contacts" USING "gin" ("custom_fields");



CREATE INDEX "idx_contacts_customer_code" ON "public"."contacts" USING "btree" ("customer_code");



CREATE INDEX "idx_contacts_email" ON "public"."contacts" USING "btree" ("email");



CREATE INDEX "idx_contacts_engagement_score" ON "public"."contacts" USING "btree" ("engagement_score");



CREATE INDEX "idx_contacts_is_simulated" ON "public"."contacts" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_contacts_last_activity" ON "public"."contacts" USING "btree" ("last_activity_date");



CREATE INDEX "idx_contacts_lead_score" ON "public"."contacts" USING "btree" ("lead_score");



CREATE INDEX "idx_contacts_lifecycle_stage" ON "public"."contacts" USING "btree" ("lifecycle_stage");



CREATE INDEX "idx_contacts_phone" ON "public"."contacts" USING "btree" ("phone");



CREATE INDEX "idx_contacts_search" ON "public"."contacts" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((((((COALESCE("first_name", ''::"text") || ' '::"text") || COALESCE("last_name", ''::"text")) || ' '::"text") || COALESCE("email", ''::"text")) || ' '::"text") || COALESCE("company", ''::"text"))));



CREATE INDEX "idx_contacts_simulated" ON "public"."contacts" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_credit_accounts_auto_reload" ON "public"."credit_accounts" USING "btree" ("auto_reload_enabled", "total_remaining") WHERE ("auto_reload_enabled" = true);



CREATE INDEX "idx_credit_accounts_stripe_customer" ON "public"."credit_accounts" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_crm_events_integration" ON "public"."crm_events" USING "btree" ("crm_integration_id");



CREATE INDEX "idx_crm_events_processed" ON "public"."crm_events" USING "btree" ("processed");



CREATE INDEX "idx_crm_events_recipient" ON "public"."crm_events" USING "btree" ("recipient_id");



CREATE INDEX "idx_crm_integrations_active" ON "public"."crm_integrations" USING "btree" ("is_active");



CREATE INDEX "idx_crm_integrations_campaign" ON "public"."crm_integrations" USING "btree" ("campaign_id");



CREATE INDEX "idx_crm_integrations_client" ON "public"."crm_integrations" USING "btree" ("client_id");



CREATE INDEX "idx_custom_field_defs_active" ON "public"."contact_custom_field_definitions" USING "btree" ("client_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_custom_field_defs_client" ON "public"."contact_custom_field_definitions" USING "btree" ("client_id");



CREATE INDEX "idx_denominations_brand" ON "public"."gift_card_denominations" USING "btree" ("brand_id");



CREATE INDEX "idx_denominations_custom_pricing" ON "public"."gift_card_denominations" USING "btree" ("use_custom_pricing") WHERE ("use_custom_pricing" = true);



CREATE INDEX "idx_denominations_enabled" ON "public"."gift_card_denominations" USING "btree" ("is_enabled_by_admin") WHERE ("is_enabled_by_admin" = true);



CREATE INDEX "idx_denominations_pricing" ON "public"."gift_card_denominations" USING "btree" ("brand_id", "denomination", "client_price");



CREATE INDEX "idx_design_versions_lookup" ON "public"."design_versions" USING "btree" ("design_type", "design_id", "version_number" DESC);



CREATE INDEX "idx_doc_pages_doc_audience" ON "public"."documentation_pages" USING "btree" ("doc_audience");



CREATE INDEX "idx_doc_pages_visible_roles" ON "public"."documentation_pages" USING "gin" ("visible_to_roles");



CREATE INDEX "idx_documentation_feedback_page_id" ON "public"."documentation_feedback" USING "btree" ("page_id");



CREATE INDEX "idx_documentation_pages_category" ON "public"."documentation_pages" USING "btree" ("category");



CREATE INDEX "idx_documentation_pages_slug" ON "public"."documentation_pages" USING "btree" ("slug");



CREATE INDEX "idx_documentation_views_page_id" ON "public"."documentation_views" USING "btree" ("page_id");



CREATE INDEX "idx_documentation_views_user_id" ON "public"."documentation_views" USING "btree" ("user_id");



CREATE INDEX "idx_dr_phillip_chats_created_at" ON "public"."dr_phillip_chats" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_dr_phillip_chats_user_id" ON "public"."dr_phillip_chats" USING "btree" ("user_id");



CREATE INDEX "idx_email_delivery_logs_campaign_id" ON "public"."email_delivery_logs" USING "btree" ("campaign_id");



CREATE INDEX "idx_email_delivery_logs_client_id" ON "public"."email_delivery_logs" USING "btree" ("client_id");



CREATE INDEX "idx_email_delivery_logs_delivery_status" ON "public"."email_delivery_logs" USING "btree" ("delivery_status");



CREATE INDEX "idx_email_delivery_logs_gift_card_id" ON "public"."email_delivery_logs" USING "btree" ("gift_card_id");



CREATE INDEX "idx_email_delivery_logs_recipient_email" ON "public"."email_delivery_logs" USING "btree" ("recipient_email");



CREATE INDEX "idx_email_delivery_logs_recipient_id" ON "public"."email_delivery_logs" USING "btree" ("recipient_id");



CREATE INDEX "idx_email_delivery_logs_sent_at" ON "public"."email_delivery_logs" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_email_delivery_logs_template_name" ON "public"."email_delivery_logs" USING "btree" ("template_name");



CREATE INDEX "idx_error_logs_campaign_id" ON "public"."error_logs" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_error_logs_category_occurred" ON "public"."error_logs" USING "btree" ("category", "occurred_at" DESC);



CREATE INDEX "idx_error_logs_client" ON "public"."error_logs" USING "btree" ("client_id", "occurred_at" DESC);



CREATE INDEX "idx_error_logs_client_occurred" ON "public"."error_logs" USING "btree" ("client_id", "occurred_at" DESC) WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_error_logs_error_message_search" ON "public"."error_logs" USING "gin" ("to_tsvector"('"english"'::"regconfig", "error_message")) WHERE ("error_message" IS NOT NULL);



CREATE INDEX "idx_error_logs_error_type" ON "public"."error_logs" USING "btree" ("error_type");



CREATE INDEX "idx_error_logs_occurred" ON "public"."error_logs" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_error_logs_organization_id" ON "public"."error_logs" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);



CREATE INDEX "idx_error_logs_recipient_id" ON "public"."error_logs" USING "btree" ("recipient_id") WHERE ("recipient_id" IS NOT NULL);



CREATE INDEX "idx_error_logs_request_id" ON "public"."error_logs" USING "btree" ("request_id") WHERE ("request_id" IS NOT NULL);



CREATE INDEX "idx_error_logs_severity_occurred" ON "public"."error_logs" USING "btree" ("severity", "occurred_at" DESC);



CREATE INDEX "idx_error_logs_source" ON "public"."error_logs" USING "btree" ("source");



CREATE INDEX "idx_error_logs_timestamp" ON "public"."error_logs" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_error_logs_type" ON "public"."error_logs" USING "btree" ("error_type", "occurred_at" DESC);



CREATE INDEX "idx_error_logs_unresolved" ON "public"."error_logs" USING "btree" ("resolved", "occurred_at" DESC) WHERE ("resolved" = false);



CREATE INDEX "idx_error_logs_user" ON "public"."error_logs" USING "btree" ("user_id", "occurred_at" DESC);



CREATE INDEX "idx_error_logs_user_occurred" ON "public"."error_logs" USING "btree" ("user_id", "occurred_at" DESC) WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_events_campaign_id" ON "public"."events" USING "btree" ("campaign_id");



CREATE INDEX "idx_events_campaign_type_date" ON "public"."events" USING "btree" ("campaign_id", "event_type", "created_at" DESC);



CREATE INDEX "idx_events_campaign_type_occurred" ON "public"."events" USING "btree" ("campaign_id", "event_type", "occurred_at" DESC);



CREATE INDEX "idx_events_occurred_at" ON "public"."events" USING "btree" ("occurred_at");



CREATE INDEX "idx_events_recipient" ON "public"."events" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "idx_events_recipient_id" ON "public"."events" USING "btree" ("recipient_id");



CREATE INDEX "idx_events_recipient_occurred" ON "public"."events" USING "btree" ("recipient_id", "occurred_at" DESC);



CREATE INDEX "idx_events_type_date" ON "public"."events" USING "btree" ("event_type", "created_at" DESC);



CREATE INDEX "idx_gift_card_brands_is_demo" ON "public"."gift_card_brands" USING "btree" ("is_demo_brand");



CREATE INDEX "idx_gift_card_brands_metadata_source" ON "public"."gift_card_brands" USING "btree" ("metadata_source");



CREATE INDEX "idx_gift_card_brands_tillo_code" ON "public"."gift_card_brands" USING "btree" ("tillo_brand_code") WHERE ("tillo_brand_code" IS NOT NULL);



CREATE INDEX "idx_gift_card_brands_website" ON "public"."gift_card_brands" USING "btree" ("website_url") WHERE ("website_url" IS NOT NULL);



CREATE INDEX "idx_inventory_balance_history_card" ON "public"."gift_card_inventory_balance_history" USING "btree" ("inventory_card_id");



CREATE INDEX "idx_inventory_balance_history_date" ON "public"."gift_card_inventory_balance_history" USING "btree" ("checked_at" DESC);



CREATE INDEX "idx_inventory_balance_status" ON "public"."gift_card_inventory" USING "btree" ("balance_check_status", "last_balance_check") WHERE ("status" = 'available'::"text");



CREATE INDEX "idx_inventory_brand_denom" ON "public"."gift_card_inventory" USING "btree" ("brand_id", "denomination");



CREATE INDEX "idx_inventory_campaign" ON "public"."gift_card_inventory" USING "btree" ("assigned_to_campaign_id") WHERE ("assigned_to_campaign_id" IS NOT NULL);



CREATE INDEX "idx_inventory_card_code" ON "public"."gift_card_inventory" USING "btree" ("card_code");



CREATE INDEX "idx_inventory_recipient" ON "public"."gift_card_inventory" USING "btree" ("assigned_to_recipient_id") WHERE ("assigned_to_recipient_id" IS NOT NULL);



CREATE INDEX "idx_inventory_status" ON "public"."gift_card_inventory" USING "btree" ("status") WHERE ("status" = 'available'::"text");



CREATE INDEX "idx_inventory_upload_batch" ON "public"."gift_card_inventory" USING "btree" ("upload_batch_id") WHERE ("upload_batch_id" IS NOT NULL);



CREATE INDEX "idx_landing_page_ai_chats_page" ON "public"."landing_page_ai_chats" USING "btree" ("landing_page_id");



CREATE INDEX "idx_landing_page_ai_chats_user" ON "public"."landing_page_ai_chats" USING "btree" ("user_id");



CREATE INDEX "idx_landing_page_exports_format" ON "public"."landing_page_exports" USING "btree" ("export_format");



CREATE INDEX "idx_landing_page_exports_page" ON "public"."landing_page_exports" USING "btree" ("landing_page_id");



CREATE INDEX "idx_landing_pages_ai_provider" ON "public"."landing_pages" USING "btree" ("ai_provider");



CREATE INDEX "idx_landing_pages_campaign" ON "public"."landing_pages" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_landing_pages_custom_domain" ON "public"."landing_pages" USING "btree" ("custom_domain") WHERE ("custom_domain" IS NOT NULL);



CREATE INDEX "idx_landing_pages_editor_type" ON "public"."landing_pages" USING "btree" ("editor_type");



CREATE INDEX "idx_landing_pages_simulated" ON "public"."landing_pages" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_landing_pages_source_type" ON "public"."landing_pages" USING "btree" ("source_type");



CREATE INDEX "idx_leads_campaign_id" ON "public"."leads" USING "btree" ("campaign_id");



CREATE INDEX "idx_leads_recipient_id" ON "public"."leads" USING "btree" ("recipient_id");



CREATE INDEX "idx_leads_submitted_at" ON "public"."leads" USING "btree" ("submitted_at");



CREATE INDEX "idx_login_history_created" ON "public"."login_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_login_history_user" ON "public"."login_history" USING "btree" ("user_id");



CREATE INDEX "idx_mail_provider_client" ON "public"."mail_provider_settings" USING "btree" ("client_id");



CREATE INDEX "idx_mail_provider_org" ON "public"."mail_provider_settings" USING "btree" ("org_id");



CREATE INDEX "idx_mail_submissions_campaign" ON "public"."mail_submissions" USING "btree" ("campaign_id");



CREATE INDEX "idx_mail_submissions_client" ON "public"."mail_submissions" USING "btree" ("client_id");



CREATE INDEX "idx_mail_submissions_status" ON "public"."mail_submissions" USING "btree" ("status");



CREATE INDEX "idx_mail_submissions_submitted_at" ON "public"."mail_submissions" USING "btree" ("submitted_at");



CREATE INDEX "idx_message_templates_client" ON "public"."message_templates" USING "btree" ("client_id", "template_type");



CREATE INDEX "idx_organizations_archived" ON "public"."organizations" USING "btree" ("archived_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_organizations_is_simulated" ON "public"."organizations" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_performance_metrics_client" ON "public"."performance_metrics" USING "btree" ("client_id", "recorded_at" DESC);



CREATE INDEX "idx_performance_metrics_duration" ON "public"."performance_metrics" USING "btree" ("metric_type", "duration_ms" DESC);



CREATE INDEX "idx_performance_metrics_type" ON "public"."performance_metrics" USING "btree" ("metric_type", "recorded_at" DESC);



CREATE INDEX "idx_preview_links_token" ON "public"."preview_links" USING "btree" ("token");



CREATE INDEX "idx_print_batches_campaign_id" ON "public"."print_batches" USING "btree" ("campaign_id");



CREATE INDEX "idx_provisioning_trace_campaign_id" ON "public"."gift_card_provisioning_trace" USING "btree" ("campaign_id") WHERE ("campaign_id" IS NOT NULL);



CREATE INDEX "idx_provisioning_trace_created_at" ON "public"."gift_card_provisioning_trace" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_provisioning_trace_error_code" ON "public"."gift_card_provisioning_trace" USING "btree" ("error_code", "created_at" DESC) WHERE ("error_code" IS NOT NULL);



CREATE INDEX "idx_provisioning_trace_failed" ON "public"."gift_card_provisioning_trace" USING "btree" ("created_at" DESC) WHERE ("status" = 'failed'::"text");



CREATE INDEX "idx_provisioning_trace_recipient_id" ON "public"."gift_card_provisioning_trace" USING "btree" ("recipient_id") WHERE ("recipient_id" IS NOT NULL);



CREATE INDEX "idx_provisioning_trace_request_id" ON "public"."gift_card_provisioning_trace" USING "btree" ("request_id");



CREATE INDEX "idx_provisioning_trace_status_created" ON "public"."gift_card_provisioning_trace" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_qr_code_configs_layer_id" ON "public"."qr_code_configs" USING "btree" ("layer_id");



CREATE INDEX "idx_qr_code_configs_template_id" ON "public"."qr_code_configs" USING "btree" ("template_id");



CREATE INDEX "idx_qr_tracking_campaign" ON "public"."qr_tracking_events" USING "btree" ("campaign_id");



CREATE INDEX "idx_qr_tracking_recipient" ON "public"."qr_tracking_events" USING "btree" ("recipient_id");



CREATE INDEX "idx_qr_tracking_scanned_at" ON "public"."qr_tracking_events" USING "btree" ("scanned_at");



CREATE INDEX "idx_rate_limit_cleanup" ON "public"."rate_limit_log" USING "btree" ("created_at");



CREATE INDEX "idx_rate_limit_endpoint_time" ON "public"."rate_limit_log" USING "btree" ("endpoint", "created_at" DESC);



CREATE INDEX "idx_rate_limit_identifier_time" ON "public"."rate_limit_log" USING "btree" ("identifier", "created_at" DESC);



CREATE INDEX "idx_rate_limit_tracking_cleanup" ON "public"."rate_limit_tracking" USING "btree" ("created_at");



CREATE INDEX "idx_rate_limit_tracking_lookup" ON "public"."rate_limit_tracking" USING "btree" ("endpoint", "identifier", "created_at" DESC);



CREATE INDEX "idx_recipient_audit_log_action" ON "public"."recipient_audit_log" USING "btree" ("action");



CREATE INDEX "idx_recipient_audit_log_created" ON "public"."recipient_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_recipient_audit_log_recipient" ON "public"."recipient_audit_log" USING "btree" ("recipient_id");



CREATE INDEX "idx_recipient_enrichment_log_agent" ON "public"."recipient_enrichment_log" USING "btree" ("agent_user_id");



CREATE INDEX "idx_recipient_enrichment_log_recipient" ON "public"."recipient_enrichment_log" USING "btree" ("recipient_id");



CREATE INDEX "idx_recipients_approval_status" ON "public"."recipients" USING "btree" ("approval_status");



CREATE INDEX "idx_recipients_audience" ON "public"."recipients" USING "btree" ("audience_id");



CREATE INDEX "idx_recipients_audience_id" ON "public"."recipients" USING "btree" ("audience_id");



CREATE INDEX "idx_recipients_code_campaign" ON "public"."recipients" USING "btree" ("redemption_code", "campaign_id") WHERE ("redemption_code" IS NOT NULL);



CREATE INDEX "idx_recipients_contact_id" ON "public"."recipients" USING "btree" ("contact_id");



CREATE INDEX "idx_recipients_custom_fields" ON "public"."recipients" USING "gin" ("custom_fields");



CREATE INDEX "idx_recipients_disposition" ON "public"."recipients" USING "btree" ("disposition") WHERE ("disposition" IS NOT NULL);



CREATE INDEX "idx_recipients_email_verification_token" ON "public"."recipients" USING "btree" ("email_verification_token") WHERE ("email_verification_token" IS NOT NULL);



CREATE INDEX "idx_recipients_is_simulated" ON "public"."recipients" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_recipients_phone" ON "public"."recipients" USING "btree" ("phone");



CREATE INDEX "idx_recipients_redemption_code" ON "public"."recipients" USING "btree" ("redemption_code");



CREATE INDEX "idx_recipients_sms_opt_in_phone" ON "public"."recipients" USING "btree" ("phone", "sms_opt_in_status") WHERE ("sms_opt_in_status" = 'pending'::"text");



CREATE INDEX "idx_recipients_sms_opt_in_status" ON "public"."recipients" USING "btree" ("sms_opt_in_status") WHERE ("sms_opt_in_status" = 'pending'::"text");



CREATE INDEX "idx_recipients_token" ON "public"."recipients" USING "btree" ("token");



CREATE INDEX "idx_recipients_verification_method" ON "public"."recipients" USING "btree" ("verification_method") WHERE ("verification_method" IS NOT NULL);



CREATE INDEX "idx_security_audit_action" ON "public"."security_audit_log" USING "btree" ("action_type");



CREATE INDEX "idx_security_audit_created" ON "public"."security_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_security_audit_user" ON "public"."security_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_sms_delivery_gift_card" ON "public"."sms_delivery_log" USING "btree" ("gift_card_id");



CREATE INDEX "idx_sms_delivery_log_provider" ON "public"."sms_delivery_log" USING "btree" ("provider_used");



CREATE INDEX "idx_sms_delivery_log_simulated" ON "public"."sms_delivery_log" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_sms_delivery_recipient" ON "public"."sms_delivery_log" USING "btree" ("recipient_id");



CREATE INDEX "idx_sms_delivery_retry" ON "public"."sms_delivery_log" USING "btree" ("retry_count", "last_retry_at") WHERE ("delivery_status" = 'failed'::"text");



CREATE INDEX "idx_sms_delivery_status" ON "public"."sms_delivery_log" USING "btree" ("delivery_status");



CREATE INDEX "idx_sms_opt_in_log_call_session" ON "public"."sms_opt_in_log" USING "btree" ("call_session_id");



CREATE INDEX "idx_sms_opt_in_log_created" ON "public"."sms_opt_in_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sms_opt_in_log_phone" ON "public"."sms_opt_in_log" USING "btree" ("phone");



CREATE INDEX "idx_sms_opt_in_log_provider" ON "public"."sms_opt_in_log" USING "btree" ("provider_used");



CREATE INDEX "idx_sms_opt_in_log_recipient" ON "public"."sms_opt_in_log" USING "btree" ("recipient_id");



CREATE UNIQUE INDEX "idx_sms_provider_settings_single" ON "public"."sms_provider_settings" USING "btree" ((true));



CREATE INDEX "idx_suppressed_addresses_client_id" ON "public"."suppressed_addresses" USING "btree" ("client_id");



CREATE INDEX "idx_suppressed_addresses_lookup" ON "public"."suppressed_addresses" USING "btree" ("address1", "city", "state", "zip");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_campaign_id" ON "public"."tasks" USING "btree" ("campaign_id");



CREATE INDEX "idx_tasks_client_id" ON "public"."tasks" USING "btree" ("client_id");



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_templates_client_id" ON "public"."templates" USING "btree" ("client_id");



CREATE INDEX "idx_templates_simulated" ON "public"."templates" USING "btree" ("is_simulated") WHERE ("is_simulated" = true);



CREATE INDEX "idx_tracked_numbers_campaign" ON "public"."tracked_phone_numbers" USING "btree" ("campaign_id");



CREATE INDEX "idx_tracked_numbers_client" ON "public"."tracked_phone_numbers" USING "btree" ("client_id");



CREATE INDEX "idx_usage_analytics_client" ON "public"."usage_analytics" USING "btree" ("client_id", "occurred_at" DESC);



CREATE INDEX "idx_usage_analytics_event" ON "public"."usage_analytics" USING "btree" ("event_type", "occurred_at" DESC);



CREATE INDEX "idx_usage_analytics_feature" ON "public"."usage_analytics" USING "btree" ("feature_name", "occurred_at" DESC);



CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_user_invitations_status" ON "public"."user_invitations" USING "btree" ("status");



CREATE INDEX "idx_user_invitations_token" ON "public"."user_invitations" USING "btree" ("token");



CREATE INDEX "idx_user_table_preferences_user_id" ON "public"."user_table_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_zapier_connections_active" ON "public"."zapier_connections" USING "btree" ("is_active");



CREATE INDEX "idx_zapier_connections_client_id" ON "public"."zapier_connections" USING "btree" ("client_id");



CREATE INDEX "idx_zapier_trigger_logs_connection_id" ON "public"."zapier_trigger_logs" USING "btree" ("zapier_connection_id");



CREATE INDEX "idx_zapier_trigger_logs_triggered_at" ON "public"."zapier_trigger_logs" USING "btree" ("triggered_at" DESC);



CREATE OR REPLACE TRIGGER "contacts_log_code_change" AFTER UPDATE ON "public"."contacts" FOR EACH ROW WHEN (("old"."customer_code" IS DISTINCT FROM "new"."customer_code")) EXECUTE FUNCTION "public"."log_customer_code_change"();



CREATE OR REPLACE TRIGGER "contacts_set_customer_code" BEFORE INSERT ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."set_customer_code"();



CREATE OR REPLACE TRIGGER "generate_brand_code_trigger" BEFORE INSERT ON "public"."gift_card_brands" FOR EACH ROW EXECUTE FUNCTION "public"."generate_brand_code_from_name"();



CREATE OR REPLACE TRIGGER "recipient_sync_to_participation" AFTER INSERT OR UPDATE ON "public"."recipients" FOR EACH ROW EXECUTE FUNCTION "public"."sync_recipient_to_participation"();



CREATE OR REPLACE TRIGGER "trigger_check_auto_reload" AFTER UPDATE OF "total_remaining" ON "public"."credit_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."check_auto_reload"();



CREATE OR REPLACE TRIGGER "trigger_check_campaign_activation_credit_insert" BEFORE INSERT ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."check_campaign_activation_credit"();



CREATE OR REPLACE TRIGGER "trigger_check_campaign_activation_credit_update" BEFORE UPDATE OF "status" ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."check_campaign_activation_credit"();



CREATE OR REPLACE TRIGGER "trigger_update_engagement_score" BEFORE INSERT OR UPDATE OF "last_activity_date", "total_interactions", "redemptions_count", "email_opens_count" ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_contact_engagement_score"();



CREATE OR REPLACE TRIGGER "update_ace_forms_updated_at" BEFORE UPDATE ON "public"."ace_forms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_activities_updated_at" BEFORE UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agencies_updated_at" BEFORE UPDATE ON "public"."agencies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agency_available_gift_cards_updated_at" BEFORE UPDATE ON "public"."agency_available_gift_cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_beta_feedback_updated_at" BEFORE UPDATE ON "public"."beta_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaign_drafts_updated_at" BEFORE UPDATE ON "public"."campaign_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaign_gift_card_config_updated_at" BEFORE UPDATE ON "public"."campaign_gift_card_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_client_available_gift_cards_updated_at" BEFORE UPDATE ON "public"."client_available_gift_cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contact_lists_timestamp" BEFORE UPDATE ON "public"."contact_lists" FOR EACH ROW EXECUTE FUNCTION "public"."update_contacts_updated_at"();



CREATE OR REPLACE TRIGGER "update_contacts_timestamp" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_contacts_updated_at"();



CREATE OR REPLACE TRIGGER "update_crm_integrations_updated_at" BEFORE UPDATE ON "public"."crm_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dr_phillip_chats_updated_at" BEFORE UPDATE ON "public"."dr_phillip_chats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_delivery_logs_updated_at" BEFORE UPDATE ON "public"."email_delivery_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_email_delivery_logs_updated_at"();



CREATE OR REPLACE TRIGGER "update_gift_card_brands_updated_at" BEFORE UPDATE ON "public"."gift_card_brands" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_gift_card_denominations_updated_at" BEFORE UPDATE ON "public"."gift_card_denominations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mail_provider_settings_updated_at" BEFORE UPDATE ON "public"."mail_provider_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mail_submissions_updated_at" BEFORE UPDATE ON "public"."mail_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_print_batches_updated_at" BEFORE UPDATE ON "public"."print_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_qr_code_configs_updated_at" BEFORE UPDATE ON "public"."qr_code_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sms_provider_settings_updated_at" BEFORE UPDATE ON "public"."sms_provider_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_webhooks_updated_at" BEFORE UPDATE ON "public"."webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_zapier_connections_updated_at" BEFORE UPDATE ON "public"."zapier_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ace_form_submissions"
    ADD CONSTRAINT "ace_form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."ace_forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ace_form_submissions"
    ADD CONSTRAINT "ace_form_submissions_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id");



ALTER TABLE ONLY "public"."ace_forms"
    ADD CONSTRAINT "ace_forms_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ace_forms"
    ADD CONSTRAINT "ace_forms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ace_forms"
    ADD CONSTRAINT "ace_forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."admin_alerts"
    ADD CONSTRAINT "admin_alerts_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id");



ALTER TABLE ONLY "public"."admin_impersonations"
    ADD CONSTRAINT "admin_impersonations_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_impersonations"
    ADD CONSTRAINT "admin_impersonations_impersonated_user_id_fkey" FOREIGN KEY ("impersonated_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_available_gift_cards"
    ADD CONSTRAINT "agency_available_gift_cards_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_available_gift_cards"
    ADD CONSTRAINT "agency_available_gift_cards_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_client_assignments"
    ADD CONSTRAINT "agency_client_assignments_agency_org_id_fkey" FOREIGN KEY ("agency_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_client_assignments"
    ADD CONSTRAINT "agency_client_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agency_client_assignments"
    ADD CONSTRAINT "agency_client_assignments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."agent_performance_metrics"
    ADD CONSTRAINT "agent_performance_metrics_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."audiences"
    ADD CONSTRAINT "audiences_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audiences"
    ADD CONSTRAINT "audiences_simulation_batch_id_fkey" FOREIGN KEY ("simulation_batch_id") REFERENCES "public"."simulation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auto_reload_queue"
    ADD CONSTRAINT "auto_reload_queue_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "public"."credit_accounts"("id");



ALTER TABLE ONLY "public"."beta_feedback"
    ADD CONSTRAINT "beta_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_kits"
    ADD CONSTRAINT "brand_kits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bulk_code_uploads"
    ADD CONSTRAINT "bulk_code_uploads_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bulk_code_uploads"
    ADD CONSTRAINT "bulk_code_uploads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bulk_code_uploads"
    ADD CONSTRAINT "bulk_code_uploads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bulk_code_uploads"
    ADD CONSTRAINT "bulk_code_uploads_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."call_center_scripts"
    ADD CONSTRAINT "call_center_scripts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_center_scripts"
    ADD CONSTRAINT "call_center_scripts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_center_scripts"
    ADD CONSTRAINT "call_center_scripts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."call_conditions_met"
    ADD CONSTRAINT "call_conditions_met_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_conditions_met"
    ADD CONSTRAINT "call_conditions_met_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_conditions_met"
    ADD CONSTRAINT "call_conditions_met_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_dispositions"
    ADD CONSTRAINT "call_dispositions_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."call_dispositions"
    ADD CONSTRAINT "call_dispositions_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_dispositions"
    ADD CONSTRAINT "call_dispositions_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_tracked_number_id_fkey" FOREIGN KEY ("tracked_number_id") REFERENCES "public"."tracked_phone_numbers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_conditions"
    ADD CONSTRAINT "campaign_conditions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_conditions"
    ADD CONSTRAINT "campaign_conditions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_gift_card_config"
    ADD CONSTRAINT "campaign_gift_card_config_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id");



ALTER TABLE ONLY "public"."campaign_gift_card_config"
    ADD CONSTRAINT "campaign_gift_card_config_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_message_settings"
    ADD CONSTRAINT "campaign_message_settings_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_message_settings"
    ADD CONSTRAINT "campaign_message_settings_email_template_id_fkey" FOREIGN KEY ("email_template_id") REFERENCES "public"."message_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_message_settings"
    ADD CONSTRAINT "campaign_message_settings_sms_template_id_fkey" FOREIGN KEY ("sms_template_id") REFERENCES "public"."message_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_reward_configs"
    ADD CONSTRAINT "campaign_reward_configs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_versions"
    ADD CONSTRAINT "campaign_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_contact_list_id_fkey" FOREIGN KEY ("contact_list_id") REFERENCES "public"."contact_lists"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."ace_forms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_available_gift_cards"
    ADD CONSTRAINT "client_available_gift_cards_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_available_gift_cards"
    ADD CONSTRAINT "client_available_gift_cards_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_users"
    ADD CONSTRAINT "client_users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_users"
    ADD CONSTRAINT "client_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_campaign_participation"
    ADD CONSTRAINT "contact_campaign_participation_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_campaign_participation"
    ADD CONSTRAINT "contact_campaign_participation_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_campaign_participation"
    ADD CONSTRAINT "contact_campaign_participation_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contact_code_audit"
    ADD CONSTRAINT "contact_code_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contact_code_audit"
    ADD CONSTRAINT "contact_code_audit_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_custom_field_definitions"
    ADD CONSTRAINT "contact_custom_field_definitions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."contact_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_list_members"
    ADD CONSTRAINT "contact_list_members_simulation_batch_id_fkey" FOREIGN KEY ("simulation_batch_id") REFERENCES "public"."simulation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_lists"
    ADD CONSTRAINT "contact_lists_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_lists"
    ADD CONSTRAINT "contact_lists_simulation_batch_id_fkey" FOREIGN KEY ("simulation_batch_id") REFERENCES "public"."simulation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_simulation_batch_id_fkey" FOREIGN KEY ("simulation_batch_id") REFERENCES "public"."simulation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "public"."credit_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_events"
    ADD CONSTRAINT "crm_events_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id");



ALTER TABLE ONLY "public"."crm_events"
    ADD CONSTRAINT "crm_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."crm_events"
    ADD CONSTRAINT "crm_events_crm_integration_id_fkey" FOREIGN KEY ("crm_integration_id") REFERENCES "public"."crm_integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_events"
    ADD CONSTRAINT "crm_events_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id");



ALTER TABLE ONLY "public"."crm_integrations"
    ADD CONSTRAINT "crm_integrations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crm_integrations"
    ADD CONSTRAINT "crm_integrations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documentation_feedback"
    ADD CONSTRAINT "documentation_feedback_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."documentation_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documentation_feedback"
    ADD CONSTRAINT "documentation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documentation_views"
    ADD CONSTRAINT "documentation_views_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."documentation_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documentation_views"
    ADD CONSTRAINT "documentation_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dr_phillip_chats"
    ADD CONSTRAINT "dr_phillip_chats_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dr_phillip_chats"
    ADD CONSTRAINT "dr_phillip_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."ace_forms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_delivery_logs"
    ADD CONSTRAINT "email_delivery_logs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_card_billing_ledger"
    ADD CONSTRAINT "gift_card_billing_ledger_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id");



ALTER TABLE ONLY "public"."gift_card_billing_ledger"
    ADD CONSTRAINT "gift_card_billing_ledger_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."gift_card_billing_ledger"
    ADD CONSTRAINT "gift_card_billing_ledger_inventory_card_id_fkey" FOREIGN KEY ("inventory_card_id") REFERENCES "public"."gift_card_inventory"("id");



ALTER TABLE ONLY "public"."gift_card_billing_ledger"
    ADD CONSTRAINT "gift_card_billing_ledger_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id");



ALTER TABLE ONLY "public"."gift_card_denominations"
    ADD CONSTRAINT "gift_card_denominations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_card_inventory"
    ADD CONSTRAINT "gift_card_inventory_assigned_to_campaign_id_fkey" FOREIGN KEY ("assigned_to_campaign_id") REFERENCES "public"."campaigns"("id");



ALTER TABLE ONLY "public"."gift_card_inventory"
    ADD CONSTRAINT "gift_card_inventory_assigned_to_recipient_id_fkey" FOREIGN KEY ("assigned_to_recipient_id") REFERENCES "public"."recipients"("id");



ALTER TABLE ONLY "public"."gift_card_inventory_balance_history"
    ADD CONSTRAINT "gift_card_inventory_balance_history_inventory_card_id_fkey" FOREIGN KEY ("inventory_card_id") REFERENCES "public"."gift_card_inventory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gift_card_inventory"
    ADD CONSTRAINT "gift_card_inventory_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id");



ALTER TABLE ONLY "public"."gift_card_provisioning_trace"
    ADD CONSTRAINT "gift_card_provisioning_trace_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."gift_card_brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gift_card_provisioning_trace"
    ADD CONSTRAINT "gift_card_provisioning_trace_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gift_card_provisioning_trace"
    ADD CONSTRAINT "gift_card_provisioning_trace_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."landing_page_ai_chats"
    ADD CONSTRAINT "landing_page_ai_chats_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."landing_page_ai_chats"
    ADD CONSTRAINT "landing_page_ai_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."landing_page_exports"
    ADD CONSTRAINT "landing_page_exports_exported_by_user_id_fkey" FOREIGN KEY ("exported_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."landing_page_exports"
    ADD CONSTRAINT "landing_page_exports_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."landing_page_versions"
    ADD CONSTRAINT "landing_page_versions_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_simulation_batch_id_fkey" FOREIGN KEY ("simulation_batch_id") REFERENCES "public"."simulation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_purchases"
    ADD CONSTRAINT "lead_purchases_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_purchases"
    ADD CONSTRAINT "lead_purchases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_purchases"
    ADD CONSTRAINT "lead_purchases_lead_source_id_fkey" FOREIGN KEY ("lead_source_id") REFERENCES "public"."lead_sources"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mail_provider_settings"
    ADD CONSTRAINT "mail_provider_settings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mail_provider_settings"
    ADD CONSTRAINT "mail_provider_settings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mail_provider_settings"
    ADD CONSTRAINT "mail_provider_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mail_submissions"
    ADD CONSTRAINT "mail_submissions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mail_submissions"
    ADD CONSTRAINT "mail_submissions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_members"
    ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."performance_metrics"
    ADD CONSTRAINT "performance_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."print_batches"
    ADD CONSTRAINT "print_batches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_code_configs"
    ADD CONSTRAINT "qr_code_configs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_tracking_events"
    ADD CONSTRAINT "qr_tracking_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_tracking_events"
    ADD CONSTRAINT "qr_tracking_events_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipient_audit_log"
    ADD CONSTRAINT "recipient_audit_log_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id");



ALTER TABLE ONLY "public"."recipient_audit_log"
    ADD CONSTRAINT "recipient_audit_log_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."recipient_audit_log"
    ADD CONSTRAINT "recipient_audit_log_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipient_enrichment_log"
    ADD CONSTRAINT "recipient_enrichment_log_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."recipient_enrichment_log"
    ADD CONSTRAINT "recipient_enrichment_log_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_approved_call_session_id_fkey" FOREIGN KEY ("approved_call_session_id") REFERENCES "public"."call_sessions"("id");



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_audience_id_fkey" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipients"
    ADD CONSTRAINT "recipients_enriched_by_user_id_fkey" FOREIGN KEY ("enriched_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."simulation_batches"
    ADD CONSTRAINT "simulation_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sms_delivery_log"
    ADD CONSTRAINT "sms_delivery_log_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_delivery_log"
    ADD CONSTRAINT "sms_delivery_log_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_delivery_log"
    ADD CONSTRAINT "sms_delivery_log_simulation_batch_id_fkey" FOREIGN KEY ("simulation_batch_id") REFERENCES "public"."simulation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_opt_in_log"
    ADD CONSTRAINT "sms_opt_in_log_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sms_opt_in_log"
    ADD CONSTRAINT "sms_opt_in_log_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_opt_in_log"
    ADD CONSTRAINT "sms_opt_in_log_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_provider_settings"
    ADD CONSTRAINT "sms_provider_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."suppressed_addresses"
    ADD CONSTRAINT "suppressed_addresses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_simulation_batch_id_fkey" FOREIGN KEY ("simulation_batch_id") REFERENCES "public"."simulation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracked_phone_numbers"
    ADD CONSTRAINT "tracked_phone_numbers_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tracked_phone_numbers"
    ADD CONSTRAINT "tracked_phone_numbers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_analytics"
    ADD CONSTRAINT "usage_analytics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_analytics"
    ADD CONSTRAINT "usage_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_agencies"
    ADD CONSTRAINT "user_agencies_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."user_management_audit"
    ADD CONSTRAINT "user_management_audit_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_management_audit"
    ADD CONSTRAINT "user_management_audit_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_table_preferences"
    ADD CONSTRAINT "user_table_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zapier_connections"
    ADD CONSTRAINT "zapier_connections_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."zapier_trigger_logs"
    ADD CONSTRAINT "zapier_trigger_logs_zapier_connection_id_fkey" FOREIGN KEY ("zapier_connection_id") REFERENCES "public"."zapier_connections"("id") ON DELETE CASCADE;



CREATE POLICY "Admin and call center can view all audit logs" ON "public"."recipient_audit_log" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'call_center'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role") OR ("performed_by_user_id" = "auth"."uid"())));



CREATE POLICY "Admin can manage bulk uploads" ON "public"."bulk_code_uploads" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can manage call sessions" ON "public"."call_sessions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can view all bulk uploads" ON "public"."bulk_code_uploads" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role")));



CREATE POLICY "Admin can view all call sessions" ON "public"."call_sessions" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'call_center'::"public"."app_role")));



CREATE POLICY "Admin has full access to recipients" ON "public"."recipients" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'call_center'::"public"."app_role")));



CREATE POLICY "Admins can create documentation" ON "public"."documentation_pages" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete client memberships" ON "public"."client_users" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete documentation" ON "public"."documentation_pages" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can delete org memberships" ON "public"."org_members" FOR DELETE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert SMS provider settings" ON "public"."sms_provider_settings" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert client memberships" ON "public"."client_users" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert impersonations" ON "public"."admin_impersonations" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert org memberships" ON "public"."org_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage alert thresholds" ON "public"."provisioning_alert_thresholds" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all mail provider settings" ON "public"."mail_provider_settings" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all organizations" ON "public"."organizations" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage all user permissions" ON "public"."user_permissions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage brands" ON "public"."gift_card_brands" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage client gift cards" ON "public"."client_available_gift_cards" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("public"."user_can_access_client"("auth"."uid"(), "client_id") AND "public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role")))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("public"."user_can_access_client"("auth"."uid"(), "client_id") AND "public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role"))));



CREATE POLICY "Admins can manage client users" ON "public"."client_users" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage denominations" ON "public"."gift_card_denominations" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage inventory" ON "public"."gift_card_inventory" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage lead sources" ON "public"."lead_sources" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage permission templates" ON "public"."permission_templates" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage rate limit tracking" ON "public"."rate_limit_tracking" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage simulation batches" ON "public"."simulation_batches" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage vendors" ON "public"."vendors" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update SMS provider settings" ON "public"."sms_provider_settings" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update beta feedback" ON "public"."beta_feedback" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update documentation" ON "public"."documentation_pages" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update error logs" ON "public"."error_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update impersonations" ON "public"."admin_impersonations" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update inventory" ON "public"."gift_card_inventory" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can update invitations" ON "public"."user_invitations" FOR UPDATE TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view SMS provider settings" ON "public"."sms_provider_settings" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all audit logs" ON "public"."recipient_audit_log" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all audit logs" ON "public"."user_management_audit" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all billing" ON "public"."gift_card_billing_ledger" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all client memberships" ON "public"."client_users" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all client users" ON "public"."client_users" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all documentation views" ON "public"."documentation_views" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all error logs" ON "public"."error_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all feedback" ON "public"."documentation_feedback" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all impersonations" ON "public"."admin_impersonations" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all inventory" ON "public"."gift_card_inventory" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all invitations" ON "public"."user_invitations" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all lead sources" ON "public"."lead_sources" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all mail submissions" ON "public"."mail_submissions" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all notifications" ON "public"."admin_notifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all org memberships" ON "public"."org_members" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all organizations" ON "public"."organizations" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all performance metrics" ON "public"."performance_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all provisioning traces" ON "public"."gift_card_provisioning_trace" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'tech_support'::"public"."app_role"]))))));



CREATE POLICY "Admins can view all security logs" ON "public"."security_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all usage analytics" ON "public"."usage_analytics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view all vendors" ON "public"."vendors" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view auto_reload_queue" ON "public"."auto_reload_queue" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view rate limit logs" ON "public"."rate_limit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can view webhook logs" ON "public"."webhook_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."webhooks" "w"
  WHERE (("w"."id" = "webhook_logs"."webhook_id") AND "public"."user_can_access_client"("auth"."uid"(), "w"."client_id")))));



CREATE POLICY "Admins manage balance history" ON "public"."gift_card_inventory_balance_history" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Agencies can view their billing" ON "public"."gift_card_billing_ledger" FOR SELECT USING ((("billed_entity_type" = 'agency'::"text") AND ("billed_entity_id" IN ( SELECT "user_agencies"."agency_id"
   FROM "public"."user_agencies"
  WHERE ("user_agencies"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agency owners can delete from their clients" ON "public"."client_users" FOR DELETE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))))));



CREATE POLICY "Agency owners can delete from their orgs" ON "public"."org_members" FOR DELETE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))));



CREATE POLICY "Agency owners can insert to their clients" ON "public"."client_users" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))))));



CREATE POLICY "Agency owners can insert to their orgs" ON "public"."org_members" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))));



CREATE POLICY "Agency owners can manage gift cards" ON "public"."agency_available_gift_cards" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("agency_id" IN ( SELECT "user_agencies"."agency_id"
   FROM "public"."user_agencies"
  WHERE (("user_agencies"."user_id" = "auth"."uid"()) AND ("user_agencies"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("agency_id" IN ( SELECT "user_agencies"."agency_id"
   FROM "public"."user_agencies"
  WHERE (("user_agencies"."user_id" = "auth"."uid"()) AND ("user_agencies"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



CREATE POLICY "Agency owners can manage org mail provider settings" ON "public"."mail_provider_settings" USING ((("org_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."org_members" "om"
     JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "om"."user_id")))
  WHERE (("om"."org_id" = "mail_provider_settings"."org_id") AND ("om"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'agency_owner'::"public"."app_role"))))));



CREATE POLICY "Agency owners can view their assignments" ON "public"."agency_client_assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_members" "om"
  WHERE (("om"."org_id" = "agency_client_assignments"."agency_org_id") AND ("om"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agency owners can view their clients' memberships" ON "public"."client_users" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("client_id" IN ( SELECT "c"."id"
   FROM "public"."clients" "c"
  WHERE ("c"."org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))))));



CREATE POLICY "Agency owners can view their org memberships" ON "public"."org_members" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))));



CREATE POLICY "Agency users can view agency gift cards" ON "public"."agency_available_gift_cards" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR ("agency_id" IN ( SELECT "user_agencies"."agency_id"
   FROM "public"."user_agencies"
  WHERE ("user_agencies"."user_id" = "auth"."uid"())))));



CREATE POLICY "Agency users can view their agency" ON "public"."agencies" FOR SELECT USING (("id" IN ( SELECT "user_agencies"."agency_id"
   FROM "public"."user_agencies"
  WHERE ("user_agencies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Agents can create dispositions" ON "public"."call_dispositions" FOR INSERT WITH CHECK (("auth"."uid"() = "agent_user_id"));



CREATE POLICY "Agents can create enrichment logs" ON "public"."recipient_enrichment_log" FOR INSERT WITH CHECK (("auth"."uid"() = "agent_user_id"));



CREATE POLICY "Agents can view their own metrics" ON "public"."agent_performance_metrics" FOR SELECT USING ((("auth"."uid"() = "agent_user_id") OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Allow all credit_accounts" ON "public"."credit_accounts" USING (true);



CREATE POLICY "Allow all credit_transactions" ON "public"."credit_transactions" USING (true);



CREATE POLICY "Allow anonymous error logging" ON "public"."error_logs" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow insert alerts" ON "public"."admin_alerts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow public access to active forms" ON "public"."ace_forms" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Allow public form submissions" ON "public"."ace_form_submissions" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow read access to permission templates" ON "public"."permission_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access to role hierarchy" ON "public"."role_hierarchy" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow update alerts" ON "public"."admin_alerts" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Anyone can view active vendors" ON "public"."vendors" FOR SELECT USING (("active" = true));



CREATE POLICY "Anyone can view enabled brands" ON "public"."gift_card_brands" FOR SELECT USING ((("is_enabled_by_admin" = true) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



COMMENT ON POLICY "Anyone can view enabled brands" ON "public"."gift_card_brands" IS 'Public can see enabled brands; admins see all';



CREATE POLICY "Anyone can view gift card brands" ON "public"."gift_card_brands" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can view role hierarchy" ON "public"."role_hierarchy" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."recipient_audit_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can submit feedback" ON "public"."documentation_feedback" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can view alerts" ON "public"."admin_alerts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Call center can view campaign conditions" ON "public"."campaign_conditions" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'call_center'::"public"."app_role", 'company_owner'::"public"."app_role", 'agency_owner'::"public"."app_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."campaigns" "c"
     JOIN "public"."clients" "cl" ON (("cl"."id" = "c"."client_id")))
  WHERE (("c"."id" = "campaign_conditions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "cl"."id"))))));



CREATE POLICY "Call center can view provisioning traces" ON "public"."gift_card_provisioning_trace" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['call_center'::"public"."app_role", 'company_owner'::"public"."app_role", 'agency_owner'::"public"."app_role"]))))));



CREATE POLICY "Clients can manage their mail provider settings" ON "public"."mail_provider_settings" USING ((("client_id" IS NOT NULL) AND "public"."user_can_access_client"("auth"."uid"(), "client_id")));



CREATE POLICY "Clients can view their billing" ON "public"."gift_card_billing_ledger" FOR SELECT USING ((("billed_entity_type" = 'client'::"text") AND ("billed_entity_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE "public"."user_can_access_client"("auth"."uid"(), "clients"."id")))));



CREATE POLICY "Company owners can delete from their client" ON "public"."client_users" FOR DELETE TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role") AND ("client_id" IN ( SELECT "public"."get_user_client_ids"("auth"."uid"()) AS "get_user_client_ids"))));



CREATE POLICY "Company owners can insert to their client" ON "public"."client_users" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role") AND ("client_id" IN ( SELECT "public"."get_user_client_ids"("auth"."uid"()) AS "get_user_client_ids"))));



CREATE POLICY "Company owners can view their client memberships" ON "public"."client_users" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'company_owner'::"public"."app_role") AND ("client_id" IN ( SELECT "public"."get_user_client_ids"("auth"."uid"()) AS "get_user_client_ids"))));



CREATE POLICY "Everyone can view permissions" ON "public"."permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Everyone can view role permissions" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Platform admins can insert error logs" ON "public"."error_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Platform admins can manage agencies" ON "public"."agencies" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Public can create call sessions" ON "public"."call_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can create submissions" ON "public"."ace_form_submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can insert leads" ON "public"."leads" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can view own invitation by token" ON "public"."user_invitations" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Public can view preview links with valid token" ON "public"."preview_links" FOR SELECT USING (true);



CREATE POLICY "Service can insert billing" ON "public"."gift_card_billing_ledger" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service can update inventory" ON "public"."gift_card_inventory" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Service role can access SMS provider settings" ON "public"."sms_provider_settings" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can insert error logs" ON "public"."error_logs" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert provisioning trace" ON "public"."gift_card_provisioning_trace" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can insert rate limit logs" ON "public"."rate_limit_log" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage all email logs" ON "public"."email_delivery_logs" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role full access to balance history" ON "public"."gift_card_inventory_balance_history" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to billing ledger" ON "public"."gift_card_billing_ledger" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to inventory" ON "public"."gift_card_inventory" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to audiences" ON "public"."audiences" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to call sessions" ON "public"."call_sessions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to campaign conditions" ON "public"."campaign_conditions" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Service role has full access to campaign conditions" ON "public"."campaign_conditions" IS 'Allows edge functions to read gift card configuration during provisioning';



CREATE POLICY "Service role has full access to campaign gift card config" ON "public"."campaign_gift_card_config" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to campaigns" ON "public"."campaigns" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to clients" ON "public"."clients" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to error logs" ON "public"."error_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to gift card billing" ON "public"."gift_card_billing_ledger" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to gift card brands" ON "public"."gift_card_brands" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to gift card denominations" ON "public"."gift_card_denominations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to gift card inventory" ON "public"."gift_card_inventory" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Service role has full access to gift card inventory" ON "public"."gift_card_inventory" IS 'Allows edge functions to claim cards from inventory during provisioning';



CREATE POLICY "Service role has full access to recipients" ON "public"."recipients" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Service role has full access to recipients" ON "public"."recipients" IS 'Allows edge functions to look up recipients by redemption code';



CREATE POLICY "Service role has full access to sms delivery log" ON "public"."sms_delivery_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can create notifications" ON "public"."admin_notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert QR tracking events" ON "public"."qr_tracking_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert SMS logs" ON "public"."sms_delivery_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert audit logs" ON "public"."recipient_audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert audit logs" ON "public"."security_audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert error logs" ON "public"."error_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert mail submissions" ON "public"."mail_submissions" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert performance metrics" ON "public"."performance_metrics" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert usage analytics" ON "public"."usage_analytics" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert/update metrics" ON "public"."agent_performance_metrics" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "System can update SMS logs" ON "public"."sms_delivery_log" FOR UPDATE USING (true);



CREATE POLICY "System can update mail submissions" ON "public"."mail_submissions" FOR UPDATE USING (true);



CREATE POLICY "Users can acknowledge notifications for accessible clients" ON "public"."admin_notifications" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id")) WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create QR configs for accessible templates" ON "public"."qr_code_configs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."templates" "t"
  WHERE (("t"."id" = "qr_code_configs"."template_id") AND "public"."user_can_access_client"("auth"."uid"(), "t"."client_id")))));



CREATE POLICY "Users can create activities for accessible clients" ON "public"."activities" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create audiences for accessible clients" ON "public"."audiences" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create beta feedback" ON "public"."beta_feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create brand kits for their clients" ON "public"."brand_kits" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create call sessions for accessible campaigns" ON "public"."call_sessions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "call_sessions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can create campaigns for accessible clients" ON "public"."campaigns" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create conditions for accessible campaigns" ON "public"."call_conditions_met" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "call_conditions_met"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can create contacts for accessible clients" ON "public"."contacts" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create custom field definitions for their clients" ON "public"."contact_custom_field_definitions" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create design versions for their client's designs" ON "public"."design_versions" FOR INSERT WITH CHECK (
CASE
    WHEN ("design_type" = 'landing_page'::"text") THEN (EXISTS ( SELECT 1
       FROM ("public"."landing_pages" "lp"
         JOIN "public"."clients" "c" ON (("c"."id" = "lp"."client_id")))
      WHERE (("lp"."id" = "design_versions"."design_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."id"))))
    WHEN ("design_type" = 'mailer'::"text") THEN (EXISTS ( SELECT 1
       FROM ("public"."templates" "t"
         JOIN "public"."clients" "c" ON (("c"."id" = "t"."client_id")))
      WHERE (("t"."id" = "design_versions"."design_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."id"))))
    ELSE false
END);



CREATE POLICY "Users can create events for accessible campaigns" ON "public"."events" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "events"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can create exports for accessible landing pages" ON "public"."landing_page_exports" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."landing_pages" "lp"
  WHERE (("lp"."id" = "landing_page_exports"."landing_page_id") AND "public"."user_can_access_client"("auth"."uid"(), "lp"."client_id")))));



CREATE POLICY "Users can create forms for accessible clients" ON "public"."ace_forms" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create integrations for accessible clients" ON "public"."crm_integrations" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create invitations" ON "public"."user_invitations" FOR INSERT TO "authenticated" WITH CHECK (("invited_by" = "auth"."uid"()));



CREATE POLICY "Users can create lead purchases for accessible clients" ON "public"."lead_purchases" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create lists for accessible clients" ON "public"."contact_lists" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create print batches for accessible campaigns" ON "public"."print_batches" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "print_batches"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can create recipients for accessible audiences" ON "public"."recipients" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."audiences" "a"
  WHERE (("a"."id" = "recipients"."audience_id") AND "public"."user_can_access_client"("auth"."uid"(), "a"."client_id")))));



CREATE POLICY "Users can create tasks for accessible clients" ON "public"."tasks" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create templates for accessible clients" ON "public"."templates" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create templates for their clients" ON "public"."message_templates" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create their own AI design sessions" ON "public"."ai_design_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own chats" ON "public"."dr_phillip_chats" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create uploads for accessible clients" ON "public"."bulk_code_uploads" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create versions for accessible campaigns" ON "public"."campaign_versions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."campaigns"
  WHERE (("campaigns"."id" = "campaign_versions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "campaigns"."client_id")))));



CREATE POLICY "Users can create zapier connections for accessible clients" ON "public"."zapier_connections" FOR INSERT WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can create zapier connections for their client" ON "public"."zapier_connections" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."client_users"
  WHERE (("client_users"."client_id" = "zapier_connections"."client_id") AND ("client_users"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can delete QR configs for accessible templates" ON "public"."qr_code_configs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."templates" "t"
  WHERE (("t"."id" = "qr_code_configs"."template_id") AND "public"."user_can_access_client"("auth"."uid"(), "t"."client_id")))));



CREATE POLICY "Users can delete activities for accessible clients" ON "public"."activities" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete audiences for accessible clients" ON "public"."audiences" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete brand kits for their clients" ON "public"."brand_kits" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete campaign gift card config" ON "public"."campaign_gift_card_config" FOR DELETE USING (("campaign_id" IN ( SELECT "c"."id"
   FROM "public"."campaigns" "c"
  WHERE "public"."user_can_access_client"("auth"."uid"(), "c"."client_id"))));



CREATE POLICY "Users can delete campaigns for accessible clients" ON "public"."campaigns" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete contacts for accessible clients" ON "public"."contacts" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete custom field definitions for their clients" ON "public"."contact_custom_field_definitions" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete forms for accessible clients" ON "public"."ace_forms" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete integrations for accessible clients" ON "public"."crm_integrations" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete lists for accessible clients" ON "public"."contact_lists" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete recipients for accessible audiences" ON "public"."recipients" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."audiences" "a"
  WHERE (("a"."id" = "recipients"."audience_id") AND "public"."user_can_access_client"("auth"."uid"(), "a"."client_id")))));



CREATE POLICY "Users can delete tasks for accessible clients" ON "public"."tasks" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete templates for accessible clients" ON "public"."templates" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete templates for their clients" ON "public"."message_templates" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete their own chats" ON "public"."dr_phillip_chats" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete zapier connections for accessible clients" ON "public"."zapier_connections" FOR DELETE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can delete zapier connections for their client" ON "public"."zapier_connections" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."client_users"
  WHERE (("client_users"."client_id" = "zapier_connections"."client_id") AND ("client_users"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can insert SMS logs for accessible campaigns" ON "public"."sms_opt_in_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "sms_opt_in_log"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can insert own documentation views" ON "public"."documentation_views" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage AI chats for accessible landing pages" ON "public"."landing_page_ai_chats" USING ((EXISTS ( SELECT 1
   FROM "public"."landing_pages" "lp"
  WHERE (("lp"."id" = "landing_page_ai_chats"."landing_page_id") AND "public"."user_can_access_client"("auth"."uid"(), "lp"."client_id")))));



CREATE POLICY "Users can manage approvals for accessible campaigns" ON "public"."campaign_approvals" USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_approvals"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage campaign conditions for accessible campaigns" ON "public"."campaign_conditions" USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_conditions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage campaign gift card config" ON "public"."campaign_gift_card_config" FOR INSERT WITH CHECK (("campaign_id" IN ( SELECT "c"."id"
   FROM "public"."campaigns" "c"
  WHERE "public"."user_can_access_client"("auth"."uid"(), "c"."client_id"))));



CREATE POLICY "Users can manage campaign participation for accessible contacts" ON "public"."contact_campaign_participation" USING ((EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "contact_campaign_participation"."contact_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage comments for accessible campaigns" ON "public"."campaign_comments" USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_comments"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage drafts for accessible clients" ON "public"."campaign_drafts" USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can manage landing pages for accessible clients" ON "public"."landing_pages" USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can manage list members for accessible contacts" ON "public"."contact_list_members" USING ((EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "contact_list_members"."contact_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage message settings for accessible campaigns" ON "public"."campaign_message_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_message_settings"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage preview links for accessible campaigns" ON "public"."preview_links" USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "preview_links"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage prototypes for accessible campaigns" ON "public"."campaign_prototypes" USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_prototypes"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage scripts for accessible clients" ON "public"."call_center_scripts" USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can manage suppressed addresses for accessible clients" ON "public"."suppressed_addresses" USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can manage tags for accessible contacts" ON "public"."contact_tags" USING ((EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "contact_tags"."contact_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can manage their own table preferences" ON "public"."user_table_preferences" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update QR configs for accessible templates" ON "public"."qr_code_configs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."templates" "t"
  WHERE (("t"."id" = "qr_code_configs"."template_id") AND "public"."user_can_access_client"("auth"."uid"(), "t"."client_id")))));



CREATE POLICY "Users can update activities for accessible clients" ON "public"."activities" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update audiences for accessible clients" ON "public"."audiences" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update brand kits for their clients" ON "public"."brand_kits" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update call sessions for accessible campaigns" ON "public"."call_sessions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "call_sessions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can update campaign gift card config" ON "public"."campaign_gift_card_config" FOR UPDATE USING (("campaign_id" IN ( SELECT "c"."id"
   FROM "public"."campaigns" "c"
  WHERE "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))) WITH CHECK (("campaign_id" IN ( SELECT "c"."id"
   FROM "public"."campaigns" "c"
  WHERE "public"."user_can_access_client"("auth"."uid"(), "c"."client_id"))));



CREATE POLICY "Users can update campaigns for accessible clients" ON "public"."campaigns" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update contacts for accessible clients" ON "public"."contacts" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update custom field definitions for their clients" ON "public"."contact_custom_field_definitions" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update forms for accessible clients" ON "public"."ace_forms" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update integrations for accessible clients" ON "public"."crm_integrations" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update lists for accessible clients" ON "public"."contact_lists" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update print batches for accessible campaigns" ON "public"."print_batches" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "print_batches"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can update recipients for accessible audiences" ON "public"."recipients" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."audiences" "a"
  WHERE (("a"."id" = "recipients"."audience_id") AND "public"."user_can_access_client"("auth"."uid"(), "a"."client_id")))));



CREATE POLICY "Users can update tasks for accessible clients" ON "public"."tasks" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update templates for accessible clients" ON "public"."templates" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update templates for their clients" ON "public"."message_templates" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update their own AI design sessions" ON "public"."ai_design_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own chats" ON "public"."dr_phillip_chats" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update zapier connections for accessible clients" ON "public"."zapier_connections" FOR UPDATE USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can update zapier connections for their client" ON "public"."zapier_connections" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."client_users"
  WHERE (("client_users"."client_id" = "zapier_connections"."client_id") AND ("client_users"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can view QR configs for accessible templates" ON "public"."qr_code_configs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."templates" "t"
  WHERE (("t"."id" = "qr_code_configs"."template_id") AND "public"."user_can_access_client"("auth"."uid"(), "t"."client_id")))));



CREATE POLICY "Users can view QR tracking for accessible campaigns" ON "public"."qr_tracking_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "qr_tracking_events"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view SMS logs for accessible campaigns" ON "public"."sms_delivery_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "sms_delivery_log"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view SMS logs for accessible campaigns" ON "public"."sms_opt_in_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "sms_opt_in_log"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view activities for accessible clients" ON "public"."activities" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view all beta feedback" ON "public"."beta_feedback" FOR SELECT USING (true);



CREATE POLICY "Users can view api keys for their client" ON "public"."api_keys" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view assigned cards" ON "public"."gift_card_inventory" FOR SELECT USING (("assigned_to_campaign_id" IN ( SELECT "c"."id"
   FROM "public"."campaigns" "c"
  WHERE "public"."user_can_access_client"("auth"."uid"(), "c"."client_id"))));



CREATE POLICY "Users can view audiences for accessible clients" ON "public"."audiences" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view audit logs for accessible clients" ON "public"."recipient_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."recipients" "r"
     JOIN "public"."audiences" "a" ON (("a"."id" = "r"."audience_id")))
  WHERE (("r"."id" = "recipient_audit_log"."recipient_id") AND "public"."user_can_access_client"("auth"."uid"(), "a"."client_id")))));



CREATE POLICY "Users can view brand kits for their clients" ON "public"."brand_kits" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view call sessions for accessible campaigns" ON "public"."call_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "call_sessions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view campaign conditions for accessible campaigns" ON "public"."campaign_conditions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_conditions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view campaign gift card config" ON "public"."campaign_gift_card_config" FOR SELECT USING (("campaign_id" IN ( SELECT "c"."id"
   FROM "public"."campaigns" "c"
  WHERE "public"."user_can_access_client"("auth"."uid"(), "c"."client_id"))));



CREATE POLICY "Users can view campaign participation for accessible contacts" ON "public"."contact_campaign_participation" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "contact_campaign_participation"."contact_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view campaigns for accessible clients" ON "public"."campaigns" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view client error logs" ON "public"."error_logs" FOR SELECT USING (("client_id" IN ( SELECT "client_users"."client_id"
   FROM "public"."client_users"
  WHERE ("client_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view client gift cards" ON "public"."client_available_gift_cards" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view client user list for accessible clients" ON "public"."client_users" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view code audit for accessible clients" ON "public"."contact_code_audit" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "contact_code_audit"."contact_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view conditions for accessible campaigns" ON "public"."call_conditions_met" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "call_conditions_met"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view contacts for accessible clients" ON "public"."contacts" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view custom field definitions for their clients" ON "public"."contact_custom_field_definitions" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view design versions for their client's designs" ON "public"."design_versions" FOR SELECT USING (
CASE
    WHEN ("design_type" = 'landing_page'::"text") THEN (EXISTS ( SELECT 1
       FROM ("public"."landing_pages" "lp"
         JOIN "public"."clients" "c" ON (("c"."id" = "lp"."client_id")))
      WHERE (("lp"."id" = "design_versions"."design_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."id"))))
    WHEN ("design_type" = 'mailer'::"text") THEN (EXISTS ( SELECT 1
       FROM ("public"."templates" "t"
         JOIN "public"."clients" "c" ON (("c"."id" = "t"."client_id")))
      WHERE (("t"."id" = "design_versions"."design_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."id"))))
    ELSE false
END);



CREATE POLICY "Users can view dispositions for accessible campaigns" ON "public"."call_dispositions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."call_sessions" "cs"
     JOIN "public"."campaigns" "c" ON (("c"."id" = "cs"."campaign_id")))
  WHERE (("cs"."id" = "call_dispositions"."call_session_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view docs matching their role" ON "public"."documentation_pages" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role") OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY ("documentation_pages"."visible_to_roles")))))));



CREATE POLICY "Users can view enabled denominations" ON "public"."gift_card_denominations" FOR SELECT USING ((("is_enabled_by_admin" = true) OR "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Users can view enrichment logs for accessible recipients" ON "public"."recipient_enrichment_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."recipients" "r"
     JOIN "public"."audiences" "a" ON (("a"."id" = "r"."audience_id")))
  WHERE (("r"."id" = "recipient_enrichment_log"."recipient_id") AND "public"."user_can_access_client"("auth"."uid"(), "a"."client_id")))));



CREATE POLICY "Users can view events for accessible campaigns" ON "public"."events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "events"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view events for accessible integrations" ON "public"."crm_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."crm_integrations" "ci"
  WHERE (("ci"."id" = "crm_events"."crm_integration_id") AND "public"."user_can_access_client"("auth"."uid"(), "ci"."client_id")))));



CREATE POLICY "Users can view exports for accessible landing pages" ON "public"."landing_page_exports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."landing_pages" "lp"
  WHERE (("lp"."id" = "landing_page_exports"."landing_page_id") AND "public"."user_can_access_client"("auth"."uid"(), "lp"."client_id")))));



CREATE POLICY "Users can view forms for accessible clients" ON "public"."ace_forms" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view integrations for accessible clients" ON "public"."crm_integrations" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view invitations they sent" ON "public"."user_invitations" FOR SELECT TO "authenticated" USING (("invited_by" = "auth"."uid"()));



CREATE POLICY "Users can view lead filter presets" ON "public"."lead_filter_presets" FOR SELECT USING (true);



CREATE POLICY "Users can view leads for accessible campaigns" ON "public"."leads" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "leads"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view list members for accessible contacts" ON "public"."contact_list_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "contact_list_members"."contact_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view lists for accessible clients" ON "public"."contact_lists" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view mail submissions for accessible clients" ON "public"."mail_submissions" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view message settings for accessible campaigns" ON "public"."campaign_message_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_message_settings"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view notifications for accessible clients" ON "public"."admin_notifications" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view own client memberships" ON "public"."client_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own documentation views" ON "public"."documentation_views" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own feedback" ON "public"."documentation_feedback" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own memberships" ON "public"."org_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view permission templates" ON "public"."permission_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view print batches for accessible campaigns" ON "public"."print_batches" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "print_batches"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view recipients for accessible audiences" ON "public"."recipients" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."audiences" "a"
  WHERE (("a"."id" = "recipients"."audience_id") AND "public"."user_can_access_client"("auth"."uid"(), "a"."client_id")))));



CREATE POLICY "Users can view reward configs for their campaigns" ON "public"."campaign_reward_configs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns" "c"
  WHERE (("c"."id" = "campaign_reward_configs"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view scripts for accessible clients" ON "public"."call_center_scripts" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view submissions for their forms" ON "public"."ace_form_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ace_forms" "af"
  WHERE (("af"."id" = "ace_form_submissions"."form_id") AND "public"."user_can_access_client"("auth"."uid"(), "af"."client_id")))));



CREATE POLICY "Users can view suppressed addresses for accessible clients" ON "public"."suppressed_addresses" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view tags for accessible contacts" ON "public"."contact_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."contacts" "c"
  WHERE (("c"."id" = "contact_tags"."contact_id") AND "public"."user_can_access_client"("auth"."uid"(), "c"."client_id")))));



CREATE POLICY "Users can view tasks for accessible clients" ON "public"."tasks" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view templates for accessible clients" ON "public"."templates" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view templates for their clients" ON "public"."message_templates" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view their agency memberships" ON "public"."user_agencies" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their client's email logs" ON "public"."email_delivery_logs" FOR SELECT USING (("client_id" IN ( SELECT "client_users"."client_id"
   FROM "public"."client_users"
  WHERE ("client_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their client's lead purchases" ON "public"."lead_purchases" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view their organizations" ON "public"."organizations" FOR SELECT USING ("public"."user_has_org_access"("auth"."uid"(), "id"));



CREATE POLICY "Users can view their own AI design sessions" ON "public"."ai_design_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own chats" ON "public"."dr_phillip_chats" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own client assignments" ON "public"."client_users" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own error logs" ON "public"."error_logs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own login history" ON "public"."login_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own permissions" ON "public"."user_permissions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view tracked numbers for accessible clients" ON "public"."tracked_phone_numbers" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view trigger logs for their client connections" ON "public"."zapier_trigger_logs" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."zapier_connections" "zc"
     JOIN "public"."client_users" "cu" ON (("cu"."client_id" = "zc"."client_id")))
  WHERE (("zc"."id" = "zapier_trigger_logs"."zapier_connection_id") AND ("cu"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can view uploads for accessible clients" ON "public"."bulk_code_uploads" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view versions for accessible campaigns" ON "public"."campaign_versions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."campaigns"
  WHERE (("campaigns"."id" = "campaign_versions"."campaign_id") AND "public"."user_can_access_client"("auth"."uid"(), "campaigns"."client_id")))));



CREATE POLICY "Users can view versions for accessible landing pages" ON "public"."landing_page_versions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."landing_pages" "lp"
  WHERE (("lp"."id" = "landing_page_versions"."landing_page_id") AND "public"."user_can_access_client"("auth"."uid"(), "lp"."client_id")))));



CREATE POLICY "Users can view webhooks for their client" ON "public"."webhooks" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view zapier connections for accessible clients" ON "public"."zapier_connections" FOR SELECT USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));



CREATE POLICY "Users can view zapier connections for their client" ON "public"."zapier_connections" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."client_users"
  WHERE (("client_users"."client_id" = "zapier_connections"."client_id") AND ("client_users"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Users can view zapier logs for accessible connections" ON "public"."zapier_trigger_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."zapier_connections" "zc"
  WHERE (("zc"."id" = "zapier_trigger_logs"."zapier_connection_id") AND "public"."user_can_access_client"("auth"."uid"(), "zc"."client_id")))));



ALTER TABLE "public"."ace_form_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ace_forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_impersonations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_manage_clients" ON "public"."clients" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_select_all_clients" ON "public"."clients" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



ALTER TABLE "public"."agencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agency_available_gift_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agency_client_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agency_owner_manage_clients" ON "public"."clients" TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids")))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))));



CREATE POLICY "agency_owner_select_clients" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'agency_owner'::"public"."app_role") AND ("org_id" IN ( SELECT "public"."get_user_org_ids"("auth"."uid"()) AS "get_user_org_ids"))));



ALTER TABLE "public"."agent_performance_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_design_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audiences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auto_reload_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beta_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brand_kits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bulk_code_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."call_center_scripts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."call_conditions_met" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."call_dispositions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."call_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_conditions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_gift_card_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_message_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_prototypes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_reward_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_available_gift_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_campaign_participation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_code_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_custom_field_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_list_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crm_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentation_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentation_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentation_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dr_phillip_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_delivery_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_card_billing_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_card_brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_card_denominations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_card_inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_card_inventory_balance_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_card_provisioning_trace" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."landing_page_ai_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."landing_page_exports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."landing_page_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."landing_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_filter_presets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mail_provider_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mail_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."performance_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preview_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."print_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provisioning_alert_thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qr_code_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qr_tracking_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limit_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipient_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipient_enrichment_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_hierarchy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simulation_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sms_delivery_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sms_opt_in_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sms_provider_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppressed_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracked_phone_numbers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_agencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_management_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_select_assigned_clients" ON "public"."clients" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "public"."get_user_client_ids"("auth"."uid"()) AS "get_user_client_ids")));



ALTER TABLE "public"."user_table_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zapier_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."zapier_trigger_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."call_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."sms_opt_in_log";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_organization"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_organization"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_organization"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_repair_condition_gift_card_config"("p_condition_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_repair_condition_gift_card_config"("p_condition_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_repair_condition_gift_card_config"("p_condition_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_billing_amount"("p_brand_id" "uuid", "p_denomination" numeric, "p_billed_entity_type" "text", "p_billed_entity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_billing_amount"("p_brand_id" "uuid", "p_denomination" numeric, "p_billed_entity_type" "text", "p_billed_entity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_billing_amount"("p_brand_id" "uuid", "p_denomination" numeric, "p_billed_entity_type" "text", "p_billed_entity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("p_last_activity_date" timestamp with time zone, "p_total_interactions" integer, "p_redemptions_count" integer, "p_email_opens_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("p_last_activity_date" timestamp with time zone, "p_total_interactions" integer, "p_redemptions_count" integer, "p_email_opens_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_engagement_score"("p_last_activity_date" timestamp with time zone, "p_total_interactions" integer, "p_redemptions_count" integer, "p_email_opens_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_auto_reload"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_auto_reload"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_auto_reload"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_campaign_activation_credit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_campaign_activation_credit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_campaign_activation_credit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_endpoint" "text", "p_limit" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_endpoint" "text", "p_limit" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_endpoint" "text", "p_limit" integer, "p_window_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_card_atomic"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_condition_id" "uuid", "p_agent_id" "uuid", "p_source" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_card_atomic"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_condition_id" "uuid", "p_agent_id" "uuid", "p_source" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_card_atomic"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_condition_id" "uuid", "p_agent_id" "uuid", "p_source" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_gift_card_from_inventory"("p_brand_id" "uuid", "p_denomination" numeric, "p_recipient_id" "uuid", "p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_gift_card_from_inventory"("p_brand_id" "uuid", "p_denomination" numeric, "p_recipient_id" "uuid", "p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_gift_card_from_inventory"("p_brand_id" "uuid", "p_denomination" numeric, "p_recipient_id" "uuid", "p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_provisioning_traces"("p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_provisioning_traces"("p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_provisioning_traces"("p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_rate_limit_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_rate_limit_tracking"("retention_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limit_tracking"("retention_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limit_tracking"("retention_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_stuck_gift_cards"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_stuck_gift_cards"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_stuck_gift_cards"() TO "service_role";



GRANT ALL ON FUNCTION "public"."client_can_use_gift_card"("p_client_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."client_can_use_gift_card"("p_client_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."client_can_use_gift_card"("p_client_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_system_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_system_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_system_alert"("p_alert_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_inventory_card"("p_card_id" "uuid", "p_force" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_inventory_card"("p_card_id" "uuid", "p_force" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_inventory_card"("p_card_id" "uuid", "p_force" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_brand_code_from_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_brand_code_from_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_brand_code_from_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_customer_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_customer_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_customer_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_recipient_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_recipient_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recipient_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_redemption_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_redemption_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_redemption_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accessible_documentation"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_accessible_documentation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accessible_documentation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_audience_geo_distribution"("audience_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_audience_geo_distribution"("audience_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audience_geo_distribution"("audience_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_brand_denominations"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_brand_denominations"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_brand_denominations"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_billing_entity_for_campaign"("p_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_billing_entity_for_campaign"("p_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_billing_entity_for_campaign"("p_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brand_denomination_info"("p_client_id" "uuid", "p_brand_id" "uuid", "p_card_value" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_brand_denomination_info"("p_client_id" "uuid", "p_brand_id" "uuid", "p_card_value" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brand_denomination_info"("p_client_id" "uuid", "p_brand_id" "uuid", "p_card_value" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brand_denominations_with_inventory"("p_brand_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_brand_denominations_with_inventory"("p_brand_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brand_denominations_with_inventory"("p_brand_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_gift_cards_with_details"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_gift_cards_with_details"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_gift_cards_with_details"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_spending_summary"("p_client_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_spending_summary"("p_client_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_spending_summary"("p_client_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_condition_gift_card_config"("p_condition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_condition_gift_card_config"("p_condition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_condition_gift_card_config"("p_condition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_condition_with_readiness"("p_condition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_condition_with_readiness"("p_condition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_condition_with_readiness"("p_condition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_conditions_missing_gift_card_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_conditions_missing_gift_card_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conditions_missing_gift_card_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_critical_errors_needing_attention"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_critical_errors_needing_attention"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_critical_errors_needing_attention"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_denomination_price"("p_brand_id" "uuid", "p_denomination" numeric, "p_for_agency" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_denomination_price"("p_brand_id" "uuid", "p_denomination" numeric, "p_for_agency" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_denomination_price"("p_brand_id" "uuid", "p_denomination" numeric, "p_for_agency" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_error_rate"("p_time_window_minutes" integer, "p_severity" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_error_rate"("p_time_window_minutes" integer, "p_severity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_error_rate"("p_time_window_minutes" integer, "p_severity" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_error_stats"("p_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_error_stats"("p_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_error_stats"("p_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inventory_count"("p_brand_id" "uuid", "p_denomination" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."get_inventory_count"("p_brand_id" "uuid", "p_denomination" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_count"("p_brand_id" "uuid", "p_denomination" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_manageable_users_paginated"("_requesting_user_id" "uuid", "_search" "text", "_role_filter" "public"."app_role", "_org_filter" "uuid", "_client_filter" "uuid", "_show_inactive" boolean, "_limit" integer, "_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_manageable_users_paginated"("_requesting_user_id" "uuid", "_search" "text", "_role_filter" "public"."app_role", "_org_filter" "uuid", "_client_filter" "uuid", "_show_inactive" boolean, "_limit" integer, "_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_manageable_users_paginated"("_requesting_user_id" "uuid", "_search" "text", "_role_filter" "public"."app_role", "_org_filter" "uuid", "_client_filter" "uuid", "_show_inactive" boolean, "_limit" integer, "_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_minimum_campaign_activation_credit"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_minimum_campaign_activation_credit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_minimum_campaign_activation_credit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provisioning_dashboard_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_provisioning_dashboard_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provisioning_dashboard_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provisioning_error_rate_realtime"("p_window_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_provisioning_error_rate_realtime"("p_window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provisioning_error_rate_realtime"("p_window_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provisioning_error_stats"("p_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_provisioning_error_stats"("p_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provisioning_error_stats"("p_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provisioning_health"("p_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_provisioning_health"("p_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provisioning_health"("p_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provisioning_trace"("p_request_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_provisioning_trace"("p_request_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provisioning_trace"("p_request_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_rate_limit_stats"("p_time_window_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_rate_limit_stats"("p_time_window_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rate_limit_stats"("p_time_window_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_provisioning_failures"("p_limit" integer, "p_campaign_id" "uuid", "p_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_provisioning_failures"("p_limit" integer, "p_campaign_id" "uuid", "p_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_provisioning_failures"("p_limit" integer, "p_campaign_id" "uuid", "p_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recipient_gift_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_recipient_gift_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recipient_gift_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_sms_provider_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_sms_provider_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sms_provider_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_client_ids"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_client_ids"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_client_ids"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_ids"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_ids"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_ids"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role_level"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_level"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_level"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_available_cards"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("_user_id" "uuid", "_permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("_user_id" "uuid", "_permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("_user_id" "uuid", "_permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_form_stat"("form_id" "uuid", "stat_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_form_stat"("form_id" "uuid", "stat_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_form_stat"("form_id" "uuid", "stat_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_landing_page_tokens"("page_id" "uuid", "tokens_used" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_landing_page_tokens"("page_id" "uuid", "tokens_used" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_landing_page_tokens"("page_id" "uuid", "tokens_used" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_card_available_for_assignment"("card_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_card_available_for_assignment"("card_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_card_available_for_assignment"("card_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_code_unique_for_client"("code" "text", "client_uuid" "uuid", "exclude_contact_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_code_unique_for_client"("code" "text", "client_uuid" "uuid", "exclude_contact_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_code_unique_for_client"("code" "text", "client_uuid" "uuid", "exclude_contact_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_condition_ready_for_provisioning"("p_condition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_condition_ready_for_provisioning"("p_condition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_condition_ready_for_provisioning"("p_condition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_customer_code_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_customer_code_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_customer_code_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_error"("p_error_type" "text", "p_severity" "text", "p_source" "text", "p_error_message" "text", "p_error_stack" "text", "p_user_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_organization_id" "uuid", "p_metadata" "jsonb", "p_request_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_error"("p_error_type" "text", "p_severity" "text", "p_source" "text", "p_error_message" "text", "p_error_stack" "text", "p_user_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_organization_id" "uuid", "p_metadata" "jsonb", "p_request_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_error"("p_error_type" "text", "p_severity" "text", "p_source" "text", "p_error_message" "text", "p_error_stack" "text", "p_user_id" "uuid", "p_recipient_id" "uuid", "p_campaign_id" "uuid", "p_organization_id" "uuid", "p_metadata" "jsonb", "p_request_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_rate_limit_request"("p_identifier" "text", "p_endpoint" "text", "p_user_agent" "text", "p_request_method" "text", "p_request_path" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_rate_limit_request"("p_identifier" "text", "p_endpoint" "text", "p_user_agent" "text", "p_request_method" "text", "p_request_path" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_rate_limit_request"("p_identifier" "text", "p_endpoint" "text", "p_user_agent" "text", "p_request_method" "text", "p_request_path" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."lookup_gift_card_by_redemption_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_gift_card_by_redemption_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_gift_card_by_redemption_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_card_delivered"("p_card_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_card_delivered"("p_card_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_card_delivered"("p_card_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_condition_to_brand_value"("p_condition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_condition_to_brand_value"("p_condition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_condition_to_brand_value"("p_condition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_contact_code"("contact_uuid" "uuid", "new_code" "text", "migration_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_contact_code"("contact_uuid" "uuid", "new_code" "text", "migration_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_contact_code"("contact_uuid" "uuid", "new_code" "text", "migration_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_pool_empty"("p_pool_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."notify_pool_empty"("p_pool_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_pool_empty"("p_pool_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."platform_admin_exists"() TO "anon";
GRANT ALL ON FUNCTION "public"."platform_admin_exists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."platform_admin_exists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recipient_has_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recipient_has_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recipient_has_card_for_condition"("p_recipient_id" "uuid", "p_condition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_billing_transaction"("p_transaction_type" "text", "p_billed_entity_type" "text", "p_billed_entity_id" "uuid", "p_campaign_id" "uuid", "p_recipient_id" "uuid", "p_brand_id" "uuid", "p_denomination" numeric, "p_amount_billed" numeric, "p_cost_basis" numeric, "p_inventory_card_id" "uuid", "p_tillo_transaction_id" "text", "p_tillo_order_reference" "text", "p_metadata" "jsonb", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_client"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_client"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_client"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_organization"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_organization"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_organization"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."select_best_pool_for_card"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."select_best_pool_for_card"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."select_best_pool_for_card"("p_brand_id" "uuid", "p_card_value" numeric, "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_customer_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_customer_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_customer_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_as_admin"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_as_admin"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_as_admin"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_recipient_to_participation"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_recipient_to_participation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_recipient_to_participation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_engagement_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_engagement_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_engagement_score"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contacts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contacts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contacts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_delivery_logs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_email_delivery_logs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_email_delivery_logs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_gift_card_delivery_status"("p_recipient_id" "uuid", "p_condition_id" "uuid", "p_delivery_status" "text", "p_delivered_at" timestamp with time zone, "p_delivery_method" "text", "p_delivery_address" "text", "p_delivery_error" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_gift_card_delivery_status"("p_recipient_id" "uuid", "p_condition_id" "uuid", "p_delivery_status" "text", "p_delivered_at" timestamp with time zone, "p_delivery_method" "text", "p_delivery_address" "text", "p_delivery_error" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gift_card_delivery_status"("p_recipient_id" "uuid", "p_condition_id" "uuid", "p_delivery_status" "text", "p_delivered_at" timestamp with time zone, "p_delivery_method" "text", "p_delivery_address" "text", "p_delivery_error" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inventory_card_balance"("p_card_id" "uuid", "p_new_balance" numeric, "p_status" "text", "p_error_message" "text", "p_checked_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_inventory_card_balance"("p_card_id" "uuid", "p_new_balance" numeric, "p_status" "text", "p_error_message" "text", "p_checked_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inventory_card_balance"("p_card_id" "uuid", "p_new_balance" numeric, "p_status" "text", "p_error_message" "text", "p_checked_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_landing_page_scores"("page_id" "uuid", "seo_score_value" integer, "accessibility_score_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."update_landing_page_scores"("page_id" "uuid", "seo_score_value" integer, "accessibility_score_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_landing_page_scores"("page_id" "uuid", "seo_score_value" integer, "accessibility_score_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_recipient_gift_cards_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_recipient_gift_cards_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_recipient_gift_cards_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sms_provider_settings"("p_primary_provider" "text", "p_enable_fallback" boolean, "p_infobip_enabled" boolean, "p_infobip_base_url" "text", "p_infobip_sender_id" "text", "p_twilio_enabled" boolean, "p_fallback_on_error" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_sms_provider_settings"("p_primary_provider" "text", "p_enable_fallback" boolean, "p_infobip_enabled" boolean, "p_infobip_base_url" "text", "p_infobip_sender_id" "text", "p_twilio_enabled" boolean, "p_fallback_on_error" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sms_provider_settings"("p_primary_provider" "text", "p_enable_fallback" boolean, "p_infobip_enabled" boolean, "p_infobip_base_url" "text", "p_infobip_sender_id" "text", "p_twilio_enabled" boolean, "p_fallback_on_error" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_client"("_user_id" "uuid", "_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_client"("_user_id" "uuid", "_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_client"("_user_id" "uuid", "_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_manage_role"("_user_id" "uuid", "_target_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_manage_role"("_user_id" "uuid", "_target_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_manage_role"("_user_id" "uuid", "_target_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_client_access"("_user_id" "uuid", "_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_client_access"("_user_id" "uuid", "_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_client_access"("_user_id" "uuid", "_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_org_access"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_org_access"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_org_access"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_org_member"("_user_id" "uuid", "_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_org_member"("_user_id" "uuid", "_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_org_member"("_user_id" "uuid", "_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_password_strength"("password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_password_strength"("password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_password_strength"("password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_unique_code_format"("code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_unique_code_format"("code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_unique_code_format"("code" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."ace_form_submissions" TO "anon";
GRANT ALL ON TABLE "public"."ace_form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ace_form_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."ace_forms" TO "anon";
GRANT ALL ON TABLE "public"."ace_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."ace_forms" TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."admin_alerts" TO "anon";
GRANT ALL ON TABLE "public"."admin_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."admin_impersonations" TO "anon";
GRANT ALL ON TABLE "public"."admin_impersonations" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_impersonations" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."agencies" TO "anon";
GRANT ALL ON TABLE "public"."agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."agencies" TO "service_role";



GRANT ALL ON TABLE "public"."agency_available_gift_cards" TO "anon";
GRANT ALL ON TABLE "public"."agency_available_gift_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."agency_available_gift_cards" TO "service_role";



GRANT ALL ON TABLE "public"."agency_client_assignments" TO "anon";
GRANT ALL ON TABLE "public"."agency_client_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."agency_client_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."agent_performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."agent_performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."ai_design_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ai_design_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_design_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."audiences" TO "anon";
GRANT ALL ON TABLE "public"."audiences" TO "authenticated";
GRANT ALL ON TABLE "public"."audiences" TO "service_role";



GRANT ALL ON TABLE "public"."auto_reload_queue" TO "anon";
GRANT ALL ON TABLE "public"."auto_reload_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."auto_reload_queue" TO "service_role";



GRANT ALL ON TABLE "public"."beta_feedback" TO "anon";
GRANT ALL ON TABLE "public"."beta_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."beta_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."brand_kits" TO "anon";
GRANT ALL ON TABLE "public"."brand_kits" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_kits" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_code_uploads" TO "anon";
GRANT ALL ON TABLE "public"."bulk_code_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_code_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."call_center_scripts" TO "anon";
GRANT ALL ON TABLE "public"."call_center_scripts" TO "authenticated";
GRANT ALL ON TABLE "public"."call_center_scripts" TO "service_role";



GRANT ALL ON TABLE "public"."call_conditions_met" TO "anon";
GRANT ALL ON TABLE "public"."call_conditions_met" TO "authenticated";
GRANT ALL ON TABLE "public"."call_conditions_met" TO "service_role";



GRANT ALL ON TABLE "public"."call_dispositions" TO "anon";
GRANT ALL ON TABLE "public"."call_dispositions" TO "authenticated";
GRANT ALL ON TABLE "public"."call_dispositions" TO "service_role";



GRANT ALL ON TABLE "public"."call_sessions" TO "anon";
GRANT ALL ON TABLE "public"."call_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."call_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_approvals" TO "anon";
GRANT ALL ON TABLE "public"."campaign_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_comments" TO "anon";
GRANT ALL ON TABLE "public"."campaign_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_comments" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_conditions" TO "anon";
GRANT ALL ON TABLE "public"."campaign_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_conditions" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_drafts" TO "anon";
GRANT ALL ON TABLE "public"."campaign_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_gift_card_config" TO "anon";
GRANT ALL ON TABLE "public"."campaign_gift_card_config" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_gift_card_config" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_message_settings" TO "anon";
GRANT ALL ON TABLE "public"."campaign_message_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_message_settings" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_prototypes" TO "anon";
GRANT ALL ON TABLE "public"."campaign_prototypes" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_prototypes" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_reward_configs" TO "anon";
GRANT ALL ON TABLE "public"."campaign_reward_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_reward_configs" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_versions" TO "anon";
GRANT ALL ON TABLE "public"."campaign_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_versions" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."client_available_gift_cards" TO "anon";
GRANT ALL ON TABLE "public"."client_available_gift_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."client_available_gift_cards" TO "service_role";



GRANT ALL ON TABLE "public"."client_users" TO "anon";
GRANT ALL ON TABLE "public"."client_users" TO "authenticated";
GRANT ALL ON TABLE "public"."client_users" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."contact_campaign_participation" TO "anon";
GRANT ALL ON TABLE "public"."contact_campaign_participation" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_campaign_participation" TO "service_role";



GRANT ALL ON TABLE "public"."contact_code_audit" TO "anon";
GRANT ALL ON TABLE "public"."contact_code_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_code_audit" TO "service_role";



GRANT ALL ON TABLE "public"."contact_custom_field_definitions" TO "anon";
GRANT ALL ON TABLE "public"."contact_custom_field_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_custom_field_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."contact_list_members" TO "anon";
GRANT ALL ON TABLE "public"."contact_list_members" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_list_members" TO "service_role";



GRANT ALL ON TABLE "public"."contact_lists" TO "anon";
GRANT ALL ON TABLE "public"."contact_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_lists" TO "service_role";



GRANT ALL ON TABLE "public"."contact_tags" TO "anon";
GRANT ALL ON TABLE "public"."contact_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_tags" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."credit_accounts" TO "anon";
GRANT ALL ON TABLE "public"."credit_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."credit_system_config" TO "anon";
GRANT ALL ON TABLE "public"."credit_system_config" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_system_config" TO "service_role";



GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."crm_events" TO "anon";
GRANT ALL ON TABLE "public"."crm_events" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_events" TO "service_role";



GRANT ALL ON TABLE "public"."crm_integrations" TO "anon";
GRANT ALL ON TABLE "public"."crm_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."crm_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."design_versions" TO "anon";
GRANT ALL ON TABLE "public"."design_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."design_versions" TO "service_role";



GRANT ALL ON TABLE "public"."documentation_feedback" TO "anon";
GRANT ALL ON TABLE "public"."documentation_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."documentation_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."documentation_pages" TO "anon";
GRANT ALL ON TABLE "public"."documentation_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."documentation_pages" TO "service_role";



GRANT ALL ON TABLE "public"."documentation_views" TO "anon";
GRANT ALL ON TABLE "public"."documentation_views" TO "authenticated";
GRANT ALL ON TABLE "public"."documentation_views" TO "service_role";



GRANT ALL ON TABLE "public"."dr_phillip_chats" TO "anon";
GRANT ALL ON TABLE "public"."dr_phillip_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."dr_phillip_chats" TO "service_role";



GRANT ALL ON TABLE "public"."email_delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."gift_card_billing_ledger" TO "anon";
GRANT ALL ON TABLE "public"."gift_card_billing_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_card_billing_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."gift_card_brands" TO "anon";
GRANT ALL ON TABLE "public"."gift_card_brands" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_card_brands" TO "service_role";



GRANT ALL ON TABLE "public"."gift_card_denominations" TO "anon";
GRANT ALL ON TABLE "public"."gift_card_denominations" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_card_denominations" TO "service_role";



GRANT ALL ON TABLE "public"."gift_card_inventory" TO "anon";
GRANT ALL ON TABLE "public"."gift_card_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_card_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."gift_card_inventory_balance_history" TO "anon";
GRANT ALL ON TABLE "public"."gift_card_inventory_balance_history" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_card_inventory_balance_history" TO "service_role";



GRANT ALL ON TABLE "public"."gift_card_inventory_summary" TO "anon";
GRANT ALL ON TABLE "public"."gift_card_inventory_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_card_inventory_summary" TO "service_role";



GRANT ALL ON TABLE "public"."gift_card_provisioning_trace" TO "anon";
GRANT ALL ON TABLE "public"."gift_card_provisioning_trace" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_card_provisioning_trace" TO "service_role";



GRANT ALL ON TABLE "public"."landing_page_ai_chats" TO "anon";
GRANT ALL ON TABLE "public"."landing_page_ai_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_page_ai_chats" TO "service_role";



GRANT ALL ON TABLE "public"."landing_page_exports" TO "anon";
GRANT ALL ON TABLE "public"."landing_page_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_page_exports" TO "service_role";



GRANT ALL ON TABLE "public"."landing_page_versions" TO "anon";
GRANT ALL ON TABLE "public"."landing_page_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_page_versions" TO "service_role";



GRANT ALL ON TABLE "public"."landing_pages" TO "anon";
GRANT ALL ON TABLE "public"."landing_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_pages" TO "service_role";



GRANT ALL ON TABLE "public"."lead_filter_presets" TO "anon";
GRANT ALL ON TABLE "public"."lead_filter_presets" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_filter_presets" TO "service_role";



GRANT ALL ON TABLE "public"."lead_purchases" TO "anon";
GRANT ALL ON TABLE "public"."lead_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."lead_sources" TO "anon";
GRANT ALL ON TABLE "public"."lead_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_sources" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON TABLE "public"."login_history" TO "anon";
GRANT ALL ON TABLE "public"."login_history" TO "authenticated";
GRANT ALL ON TABLE "public"."login_history" TO "service_role";



GRANT ALL ON TABLE "public"."mail_provider_settings" TO "anon";
GRANT ALL ON TABLE "public"."mail_provider_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."mail_provider_settings" TO "service_role";



GRANT ALL ON TABLE "public"."mail_submissions" TO "anon";
GRANT ALL ON TABLE "public"."mail_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."mail_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."message_templates" TO "anon";
GRANT ALL ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."org_members" TO "anon";
GRANT ALL ON TABLE "public"."org_members" TO "authenticated";
GRANT ALL ON TABLE "public"."org_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."performance_metrics" TO "anon";
GRANT ALL ON TABLE "public"."performance_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."permission_templates" TO "anon";
GRANT ALL ON TABLE "public"."permission_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_templates" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."preview_links" TO "anon";
GRANT ALL ON TABLE "public"."preview_links" TO "authenticated";
GRANT ALL ON TABLE "public"."preview_links" TO "service_role";



GRANT ALL ON TABLE "public"."print_batches" TO "anon";
GRANT ALL ON TABLE "public"."print_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."print_batches" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."provisioning_alert_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."provisioning_alert_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."provisioning_alert_thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."qr_code_configs" TO "anon";
GRANT ALL ON TABLE "public"."qr_code_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."qr_code_configs" TO "service_role";



GRANT ALL ON TABLE "public"."qr_tracking_events" TO "anon";
GRANT ALL ON TABLE "public"."qr_tracking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."qr_tracking_events" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_log" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_log" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "anon";
GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limit_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."recipient_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."recipient_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."recipient_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."recipient_enrichment_log" TO "anon";
GRANT ALL ON TABLE "public"."recipient_enrichment_log" TO "authenticated";
GRANT ALL ON TABLE "public"."recipient_enrichment_log" TO "service_role";



GRANT ALL ON TABLE "public"."recipients" TO "anon";
GRANT ALL ON TABLE "public"."recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."recipients" TO "service_role";



GRANT ALL ON TABLE "public"."role_hierarchy" TO "anon";
GRANT ALL ON TABLE "public"."role_hierarchy" TO "authenticated";
GRANT ALL ON TABLE "public"."role_hierarchy" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."security_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."security_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_batches" TO "anon";
GRANT ALL ON TABLE "public"."simulation_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_batches" TO "service_role";



GRANT ALL ON TABLE "public"."sms_delivery_log" TO "anon";
GRANT ALL ON TABLE "public"."sms_delivery_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_delivery_log" TO "service_role";



GRANT ALL ON TABLE "public"."sms_opt_in_log" TO "anon";
GRANT ALL ON TABLE "public"."sms_opt_in_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_opt_in_log" TO "service_role";



GRANT ALL ON TABLE "public"."sms_provider_settings" TO "anon";
GRANT ALL ON TABLE "public"."sms_provider_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_provider_settings" TO "service_role";



GRANT ALL ON TABLE "public"."suppressed_addresses" TO "anon";
GRANT ALL ON TABLE "public"."suppressed_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."suppressed_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."tracked_phone_numbers" TO "anon";
GRANT ALL ON TABLE "public"."tracked_phone_numbers" TO "authenticated";
GRANT ALL ON TABLE "public"."tracked_phone_numbers" TO "service_role";



GRANT ALL ON TABLE "public"."usage_analytics" TO "anon";
GRANT ALL ON TABLE "public"."usage_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."user_agencies" TO "anon";
GRANT ALL ON TABLE "public"."user_agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."user_agencies" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_management_audit" TO "anon";
GRANT ALL ON TABLE "public"."user_management_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."user_management_audit" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_table_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_table_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_table_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."v_active_provisioning_issues" TO "anon";
GRANT ALL ON TABLE "public"."v_active_provisioning_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."v_active_provisioning_issues" TO "service_role";



GRANT ALL ON TABLE "public"."v_campaign_provisioning_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_campaign_provisioning_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_campaign_provisioning_stats" TO "service_role";



GRANT ALL ON TABLE "public"."v_conditions_needing_gift_card_config" TO "anon";
GRANT ALL ON TABLE "public"."v_conditions_needing_gift_card_config" TO "authenticated";
GRANT ALL ON TABLE "public"."v_conditions_needing_gift_card_config" TO "service_role";



GRANT ALL ON TABLE "public"."v_provisioning_attempts" TO "anon";
GRANT ALL ON TABLE "public"."v_provisioning_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."v_provisioning_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."v_provisioning_health_hourly" TO "anon";
GRANT ALL ON TABLE "public"."v_provisioning_health_hourly" TO "authenticated";
GRANT ALL ON TABLE "public"."v_provisioning_health_hourly" TO "service_role";



GRANT ALL ON TABLE "public"."v_provisioning_step_performance" TO "anon";
GRANT ALL ON TABLE "public"."v_provisioning_step_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."v_provisioning_step_performance" TO "service_role";



GRANT ALL ON TABLE "public"."v_top_provisioning_failures" TO "anon";
GRANT ALL ON TABLE "public"."v_top_provisioning_failures" TO "authenticated";
GRANT ALL ON TABLE "public"."v_top_provisioning_failures" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";



GRANT ALL ON TABLE "public"."webhooks" TO "anon";
GRANT ALL ON TABLE "public"."webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."zapier_connections" TO "anon";
GRANT ALL ON TABLE "public"."zapier_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."zapier_connections" TO "service_role";



GRANT ALL ON TABLE "public"."zapier_trigger_logs" TO "anon";
GRANT ALL ON TABLE "public"."zapier_trigger_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."zapier_trigger_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































