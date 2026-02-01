-- ============================================
-- FINAL RLS CLEANUP
-- 1. Fix remaining auth_rls_initplan issues
-- 2. Consolidate truly duplicate policies
-- ============================================

-- ============================================
-- PART 1: Fix remaining auth_rls_initplan issues
-- These policies still use auth.uid() without (SELECT ...)
-- ============================================

-- 1. client_users - "Users can view their own client assignments"
DROP POLICY IF EXISTS "Users can view their own client assignments" ON public.client_users;
CREATE POLICY "Users can view their own client assignments" ON public.client_users
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 2. ai_design_sessions - 3 policies
DROP POLICY IF EXISTS "Users can create their own AI design sessions" ON public.ai_design_sessions;
DROP POLICY IF EXISTS "Users can update their own AI design sessions" ON public.ai_design_sessions;
DROP POLICY IF EXISTS "Users can view their own AI design sessions" ON public.ai_design_sessions;

CREATE POLICY "Users can create their own AI design sessions" ON public.ai_design_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own AI design sessions" ON public.ai_design_sessions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own AI design sessions" ON public.ai_design_sessions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3. error_logs - Service role insert
DROP POLICY IF EXISTS "Service role can insert error logs" ON public.error_logs;
CREATE POLICY "Service role can insert error logs" ON public.error_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 4. beta_feedback - Users can create
DROP POLICY IF EXISTS "Users can create beta feedback" ON public.beta_feedback;
CREATE POLICY "Users can create beta feedback" ON public.beta_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 5. user_table_preferences - Users can manage
DROP POLICY IF EXISTS "Users can manage their own table preferences" ON public.user_table_preferences;
CREATE POLICY "Users can manage their own table preferences" ON public.user_table_preferences
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 6. call_dispositions - Agents can create
DROP POLICY IF EXISTS "Agents can create dispositions" ON public.call_dispositions;
CREATE POLICY "Agents can create dispositions" ON public.call_dispositions
  FOR INSERT TO authenticated
  WITH CHECK (agent_user_id = (SELECT auth.uid()));

-- 7. recipient_enrichment_log - Agents can create
DROP POLICY IF EXISTS "Agents can create enrichment logs" ON public.recipient_enrichment_log;
CREATE POLICY "Agents can create enrichment logs" ON public.recipient_enrichment_log
  FOR INSERT TO authenticated
  WITH CHECK (agent_user_id = (SELECT auth.uid()));

-- 8. gift_card_provisioning_trace - Service role insert
DROP POLICY IF EXISTS "Service role can insert provisioning trace" ON public.gift_card_provisioning_trace;
CREATE POLICY "Service role can insert provisioning trace" ON public.gift_card_provisioning_trace
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================
-- PART 2: Consolidate truly duplicate policies
-- Remove policies that are redundant (same check, same operation)
-- ============================================

-- ace_form_submissions: Two INSERT policies both WITH CHECK (true)
DROP POLICY IF EXISTS "Public can create submissions" ON public.ace_form_submissions;
-- Keep: "Allow public form submissions"

-- ace_forms: Remove duplicate public access
DROP POLICY IF EXISTS "Allow public access to published forms" ON public.ace_forms;
-- Keep: "Allow public access to active forms" (already has is_active check)

-- call_center_scripts: "manage" is FOR ALL, "view" is FOR SELECT - redundant
DROP POLICY IF EXISTS "Users can view scripts for accessible clients" ON public.call_center_scripts;
-- Keep: "Users can manage scripts for accessible clients" (covers all operations)

-- campaign_conditions: "manage" is FOR ALL, "view" is FOR SELECT - redundant
DROP POLICY IF EXISTS "Users can view campaign conditions for accessible campaigns" ON public.campaign_conditions;
-- Keep: "Users can manage campaign conditions for accessible campaigns"

-- campaign_message_settings: Same pattern
DROP POLICY IF EXISTS "Users can view message settings for accessible campaigns" ON public.campaign_message_settings;
-- Keep: "Users can manage message settings for accessible campaigns"

-- contact_campaign_participation: Same pattern
DROP POLICY IF EXISTS "Users can view campaign participation for accessible contacts" ON public.contact_campaign_participation;
-- Keep: "Users can manage campaign participation for accessible contacts"

-- contact_list_members: Same pattern
DROP POLICY IF EXISTS "Users can view list members for accessible contacts" ON public.contact_list_members;
-- Keep: "Users can manage list members for accessible contacts"

-- contact_tags: Same pattern
DROP POLICY IF EXISTS "Users can view tags for accessible contacts" ON public.contact_tags;
-- Keep: "Users can manage tags for accessible contacts"

-- suppressed_addresses: Same pattern
DROP POLICY IF EXISTS "Users can view suppressed addresses for accessible clients" ON public.suppressed_addresses;
-- Keep: "Users can manage suppressed addresses for accessible clients"

-- lead_sources: Admin has both "manage" (FOR ALL) and "view" (FOR SELECT)
DROP POLICY IF EXISTS "Admins can view all lead sources" ON public.lead_sources;
-- Keep: "Admins can manage lead sources"

-- vendors: Admin has "manage" (FOR ALL) and "view" (FOR SELECT) - redundant
DROP POLICY IF EXISTS "Admins can view all vendors" ON public.vendors;
-- Keep: "Admins can manage vendors" and "Anyone can view active vendors"

-- gift_card_inventory: Multiple admin policies overlap
DROP POLICY IF EXISTS "Admins can view all inventory" ON public.gift_card_inventory;
DROP POLICY IF EXISTS "Admins can update inventory" ON public.gift_card_inventory;
-- Keep: "Admins can manage inventory" (covers all operations)

-- permission_templates: Multiple SELECT policies
DROP POLICY IF EXISTS "Allow read access to permission templates" ON public.permission_templates;
-- Keep: "Users can view permission templates" and "Admins can manage permission templates"

-- role_hierarchy: Duplicate SELECT policies
DROP POLICY IF EXISTS "Allow read access to role hierarchy" ON public.role_hierarchy;
-- Keep: "Anyone can view role hierarchy"

-- recipient_audit_log: Duplicate INSERT policies
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.recipient_audit_log;
-- Keep: "System can insert audit logs"

-- recipient_audit_log: "Admin and call center" overlaps with "Admins can view all"
DROP POLICY IF EXISTS "Admin and call center can view all audit logs" ON public.recipient_audit_log;
-- Keep: "Admins can view all audit logs" and "Users can view audit logs for accessible clients"

-- ============================================
-- PART 3: Summary
-- ============================================

DO $$
DECLARE
  auth_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count remaining auth_rls_initplan issues
  SELECT COUNT(*) INTO auth_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND (
      (pg_get_expr(pol.polqual, pol.polrelid) ~ '"auth"\."uid"\(\)'
       AND pg_get_expr(pol.polqual, pol.polrelid) !~ '\(SELECT "auth"\."uid"\(\)\)')
      OR
      (pg_get_expr(pol.polwithcheck, pol.polrelid) ~ '"auth"\."uid"\(\)'
       AND pg_get_expr(pol.polwithcheck, pol.polrelid) !~ '\(SELECT "auth"\."uid"\(\)\)')
    );
  
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public';
  
  RAISE NOTICE '=== Final RLS Cleanup Complete ===';
  RAISE NOTICE 'Remaining auth_rls_initplan issues: %', auth_count;
  RAISE NOTICE 'Total policies in public schema: %', policy_count;
END $$;
