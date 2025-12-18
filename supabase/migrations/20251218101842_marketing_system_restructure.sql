-- ============================================================================
-- ACE ENGAGE - MARKETING SYSTEM RESTRUCTURE
-- Migration: Enhance marketing tables for broadcasts with sequences and
--            automations with custom content support
-- ============================================================================

-- ============================================================================
-- UPDATE ENUMS
-- ============================================================================

-- Add 'sequence' to marketing campaign type for multi-message broadcasts
ALTER TYPE "public"."marketing_campaign_type" ADD VALUE IF NOT EXISTS 'sequence';

-- Add new automation step types
ALTER TYPE "public"."automation_step_type" ADD VALUE IF NOT EXISTS 'update_contact';
ALTER TYPE "public"."automation_step_type" ADD VALUE IF NOT EXISTS 'end_journey';

-- ============================================================================
-- UPDATE CAMPAIGN MESSAGES TABLE (for broadcast sequences)
-- ============================================================================

-- Add columns for custom content support (not template-only)
ALTER TABLE "public"."marketing_campaign_messages"
  ADD COLUMN IF NOT EXISTS "use_template" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "custom_subject" text,
  ADD COLUMN IF NOT EXISTS "custom_body_html" text,
  ADD COLUMN IF NOT EXISTS "custom_body_text" text;

-- Migrate existing data: set use_template=true where template_id exists
UPDATE "public"."marketing_campaign_messages"
SET "use_template" = true
WHERE "template_id" IS NOT NULL AND "use_template" IS NULL;

-- Add comment
COMMENT ON COLUMN "public"."marketing_campaign_messages"."use_template" 
  IS 'True if using a template, false if using custom content';
COMMENT ON COLUMN "public"."marketing_campaign_messages"."custom_subject" 
  IS 'Custom subject line for email (when not using template)';
COMMENT ON COLUMN "public"."marketing_campaign_messages"."custom_body_html" 
  IS 'Custom HTML body for email (when not using template)';
COMMENT ON COLUMN "public"."marketing_campaign_messages"."custom_body_text" 
  IS 'Custom text body (when not using template)';

-- ============================================================================
-- UPDATE AUTOMATION STEPS TABLE (for custom content support)
-- ============================================================================

-- Add columns for custom content (not template-only)
ALTER TABLE "public"."marketing_automation_steps"
  ADD COLUMN IF NOT EXISTS "use_template" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "custom_subject" text,
  ADD COLUMN IF NOT EXISTS "custom_body_html" text,
  ADD COLUMN IF NOT EXISTS "custom_body_text" text;

-- Add columns for branching/conditions
ALTER TABLE "public"."marketing_automation_steps"
  ADD COLUMN IF NOT EXISTS "condition_type" text,
  ADD COLUMN IF NOT EXISTS "condition_config" jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "branch_yes_step_id" uuid,
  ADD COLUMN IF NOT EXISTS "branch_no_step_id" uuid;

-- Add columns for wait step configuration
ALTER TABLE "public"."marketing_automation_steps"
  ADD COLUMN IF NOT EXISTS "delay_minutes" integer,
  ADD COLUMN IF NOT EXISTS "wait_until_time" text,
  ADD COLUMN IF NOT EXISTS "wait_until_day" text;

-- Add columns for update contact step
ALTER TABLE "public"."marketing_automation_steps"
  ADD COLUMN IF NOT EXISTS "update_action" text,
  ADD COLUMN IF NOT EXISTS "update_config" jsonb DEFAULT '{}'::jsonb;

-- Add foreign keys for branching (self-referencing)
-- Drop if exists first to avoid conflicts
DO $$
BEGIN
    -- Add branch_yes foreign key if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'marketing_automation_steps_branch_yes_fkey'
    ) THEN
        ALTER TABLE "public"."marketing_automation_steps"
            ADD CONSTRAINT "marketing_automation_steps_branch_yes_fkey" 
            FOREIGN KEY ("branch_yes_step_id") 
            REFERENCES "public"."marketing_automation_steps"("id") 
            ON DELETE SET NULL;
    END IF;
    
    -- Add branch_no foreign key if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'marketing_automation_steps_branch_no_fkey'
    ) THEN
        ALTER TABLE "public"."marketing_automation_steps"
            ADD CONSTRAINT "marketing_automation_steps_branch_no_fkey" 
            FOREIGN KEY ("branch_no_step_id") 
            REFERENCES "public"."marketing_automation_steps"("id") 
            ON DELETE SET NULL;
    END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'update_action_check'
    ) THEN
        ALTER TABLE "public"."marketing_automation_steps"
            ADD CONSTRAINT "update_action_check" 
            CHECK ("update_action" IS NULL OR "update_action" IN ('add_tag', 'remove_tag', 'update_field'));
    END IF;
END $$;

COMMENT ON COLUMN "public"."marketing_automation_steps"."use_template" 
  IS 'True if using a template, false if using custom content';
COMMENT ON COLUMN "public"."marketing_automation_steps"."condition_type" 
  IS 'Type of condition for branching (email_opened, email_clicked, has_tag, contact_field)';
COMMENT ON COLUMN "public"."marketing_automation_steps"."branch_yes_step_id" 
  IS 'Next step if condition is true';
COMMENT ON COLUMN "public"."marketing_automation_steps"."branch_no_step_id" 
  IS 'Next step if condition is false';

-- ============================================================================
-- UPDATE MARKETING CAMPAIGNS TABLE (for A/B testing and sequences)
-- ============================================================================

-- Add columns for A/B testing
ALTER TABLE "public"."marketing_campaigns"
  ADD COLUMN IF NOT EXISTS "ab_testing_enabled" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ab_testing_config" jsonb DEFAULT '{}'::jsonb;

-- Add column to track active enrollments for automations
ALTER TABLE "public"."marketing_automations"
  ADD COLUMN IF NOT EXISTS "total_active" integer DEFAULT 0;

COMMENT ON COLUMN "public"."marketing_campaigns"."ab_testing_enabled" 
  IS 'True if A/B testing is enabled for this broadcast';
COMMENT ON COLUMN "public"."marketing_campaigns"."ab_testing_config" 
  IS 'Configuration for A/B testing (variants, test size, winner metric, etc.)';

-- ============================================================================
-- UPDATE AUTOMATION ENROLLMENT STATS FUNCTION
-- ============================================================================

-- Update function to include total_active count
CREATE OR REPLACE FUNCTION "public"."update_automation_enrollment_stats"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE marketing_automations
    SET
        total_enrolled = (SELECT COUNT(*) FROM marketing_automation_enrollments WHERE automation_id = NEW.automation_id),
        total_completed = (SELECT COUNT(*) FROM marketing_automation_enrollments WHERE automation_id = NEW.automation_id AND status = 'completed'),
        total_active = (SELECT COUNT(*) FROM marketing_automation_enrollments WHERE automation_id = NEW.automation_id AND status = 'active'),
        updated_at = now()
    WHERE id = NEW.automation_id;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Index for A/B testing enabled campaigns
CREATE INDEX IF NOT EXISTS "idx_marketing_campaigns_ab_testing" 
    ON "public"."marketing_campaigns" ("ab_testing_enabled") 
    WHERE "ab_testing_enabled" = true;

-- Index for automation step branching
CREATE INDEX IF NOT EXISTS "idx_automation_steps_branch_yes" 
    ON "public"."marketing_automation_steps" ("branch_yes_step_id") 
    WHERE "branch_yes_step_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_automation_steps_branch_no" 
    ON "public"."marketing_automation_steps" ("branch_no_step_id") 
    WHERE "branch_no_step_id" IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration
DO $$
BEGIN
    RAISE NOTICE 'Marketing system restructure migration completed successfully';
    RAISE NOTICE 'Added support for:';
    RAISE NOTICE '  - Broadcast sequences with custom content';
    RAISE NOTICE '  - Automation custom content (not template-only)';
    RAISE NOTICE '  - Automation branching/conditions';
    RAISE NOTICE '  - A/B testing for broadcasts';
    RAISE NOTICE '  - New automation step types (update_contact, end_journey)';
END $$;
