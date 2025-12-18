-- ============================================================================
-- ACE ENGAGE - EMAIL & SMS MARKETING FEATURE
-- Migration: Add marketing campaigns, automations, and related tables
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Marketing campaign type
CREATE TYPE "public"."marketing_campaign_type" AS ENUM (
    'email',
    'sms',
    'both'
);

-- Marketing campaign status
CREATE TYPE "public"."marketing_campaign_status" AS ENUM (
    'draft',
    'scheduled',
    'sending',
    'sent',
    'paused',
    'cancelled'
);

-- Marketing send status
CREATE TYPE "public"."marketing_send_status" AS ENUM (
    'pending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'unsubscribed'
);

-- Marketing audience type
CREATE TYPE "public"."marketing_audience_type" AS ENUM (
    'all_contacts',
    'contact_list',
    'segment',
    'manual'
);

-- Automation trigger type
CREATE TYPE "public"."automation_trigger_type" AS ENUM (
    'mail_campaign_sent',
    'mail_campaign_delivered',
    'gift_card_redeemed',
    'form_submitted',
    'recipient_approved',
    'manual'
);

-- Automation step type
CREATE TYPE "public"."automation_step_type" AS ENUM (
    'send_email',
    'send_sms',
    'wait',
    'condition'
);

-- Automation enrollment status
CREATE TYPE "public"."automation_enrollment_status" AS ENUM (
    'active',
    'completed',
    'cancelled',
    'failed'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "client_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "campaign_type" "public"."marketing_campaign_type" NOT NULL DEFAULT 'email',
    "status" "public"."marketing_campaign_status" NOT NULL DEFAULT 'draft',
    "linked_mail_campaign_id" uuid,
    "audience_type" "public"."marketing_audience_type" NOT NULL DEFAULT 'all_contacts',
    "audience_config" jsonb DEFAULT '{}'::jsonb,
    "scheduled_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "total_recipients" integer DEFAULT 0,
    "sent_count" integer DEFAULT 0,
    "delivered_count" integer DEFAULT 0,
    "opened_count" integer DEFAULT 0,
    "clicked_count" integer DEFAULT 0,
    "bounced_count" integer DEFAULT 0,
    "unsubscribed_count" integer DEFAULT 0,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketing_campaigns_client_id_fkey" FOREIGN KEY ("client_id") 
        REFERENCES "public"."clients"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_campaigns_linked_mail_campaign_id_fkey" FOREIGN KEY ("linked_mail_campaign_id") 
        REFERENCES "public"."campaigns"("id") ON DELETE SET NULL,
    CONSTRAINT "marketing_campaigns_created_by_fkey" FOREIGN KEY ("created_by") 
        REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."marketing_campaigns" OWNER TO "postgres";

COMMENT ON TABLE "public"."marketing_campaigns" IS 'Email and SMS marketing campaigns';

-- Marketing Campaign Messages
CREATE TABLE IF NOT EXISTS "public"."marketing_campaign_messages" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" uuid NOT NULL,
    "message_type" text NOT NULL,
    "template_id" uuid,
    "subject" text,
    "body_html" text,
    "body_text" text,
    "sequence_order" integer DEFAULT 1,
    "delay_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "marketing_campaign_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketing_campaign_messages_campaign_id_fkey" FOREIGN KEY ("campaign_id") 
        REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_campaign_messages_template_id_fkey" FOREIGN KEY ("template_id") 
        REFERENCES "public"."message_templates"("id") ON DELETE SET NULL,
    CONSTRAINT "marketing_campaign_messages_type_check" CHECK ("message_type" IN ('email', 'sms'))
);

ALTER TABLE "public"."marketing_campaign_messages" OWNER TO "postgres";

COMMENT ON TABLE "public"."marketing_campaign_messages" IS 'Individual messages within a marketing campaign';

-- Marketing Sends (delivery tracking)
CREATE TABLE IF NOT EXISTS "public"."marketing_sends" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" uuid NOT NULL,
    "message_id" uuid NOT NULL,
    "contact_id" uuid,
    "message_type" text NOT NULL,
    "recipient_email" text,
    "recipient_phone" text,
    "status" "public"."marketing_send_status" NOT NULL DEFAULT 'pending',
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "error_message" text,
    "provider_message_id" text,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "marketing_sends_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketing_sends_campaign_id_fkey" FOREIGN KEY ("campaign_id") 
        REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_sends_message_id_fkey" FOREIGN KEY ("message_id") 
        REFERENCES "public"."marketing_campaign_messages"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_sends_contact_id_fkey" FOREIGN KEY ("contact_id") 
        REFERENCES "public"."contacts"("id") ON DELETE SET NULL,
    CONSTRAINT "marketing_sends_type_check" CHECK ("message_type" IN ('email', 'sms'))
);

ALTER TABLE "public"."marketing_sends" OWNER TO "postgres";

COMMENT ON TABLE "public"."marketing_sends" IS 'Individual send records for marketing messages';

-- Marketing Automations
CREATE TABLE IF NOT EXISTS "public"."marketing_automations" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "client_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "trigger_type" "public"."automation_trigger_type" NOT NULL,
    "trigger_config" jsonb DEFAULT '{}'::jsonb,
    "is_active" boolean DEFAULT false,
    "total_enrolled" integer DEFAULT 0,
    "total_completed" integer DEFAULT 0,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "marketing_automations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketing_automations_client_id_fkey" FOREIGN KEY ("client_id") 
        REFERENCES "public"."clients"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_automations_created_by_fkey" FOREIGN KEY ("created_by") 
        REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."marketing_automations" OWNER TO "postgres";

COMMENT ON TABLE "public"."marketing_automations" IS 'Marketing automation workflows';

-- Marketing Automation Steps
CREATE TABLE IF NOT EXISTS "public"."marketing_automation_steps" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "automation_id" uuid NOT NULL,
    "step_order" integer NOT NULL,
    "step_type" "public"."automation_step_type" NOT NULL,
    "template_id" uuid,
    "config" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "marketing_automation_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketing_automation_steps_automation_id_fkey" FOREIGN KEY ("automation_id") 
        REFERENCES "public"."marketing_automations"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_automation_steps_template_id_fkey" FOREIGN KEY ("template_id") 
        REFERENCES "public"."message_templates"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."marketing_automation_steps" OWNER TO "postgres";

COMMENT ON TABLE "public"."marketing_automation_steps" IS 'Steps within an automation workflow';

-- Marketing Automation Enrollments
CREATE TABLE IF NOT EXISTS "public"."marketing_automation_enrollments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "automation_id" uuid NOT NULL,
    "contact_id" uuid,
    "recipient_id" uuid,
    "current_step" integer DEFAULT 0,
    "status" "public"."automation_enrollment_status" NOT NULL DEFAULT 'active',
    "enrolled_at" timestamp with time zone DEFAULT now(),
    "completed_at" timestamp with time zone,
    "next_step_at" timestamp with time zone,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "marketing_automation_enrollments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "marketing_automation_enrollments_automation_id_fkey" FOREIGN KEY ("automation_id") 
        REFERENCES "public"."marketing_automations"("id") ON DELETE CASCADE,
    CONSTRAINT "marketing_automation_enrollments_contact_id_fkey" FOREIGN KEY ("contact_id") 
        REFERENCES "public"."contacts"("id") ON DELETE SET NULL,
    CONSTRAINT "marketing_automation_enrollments_recipient_id_fkey" FOREIGN KEY ("recipient_id") 
        REFERENCES "public"."recipients"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."marketing_automation_enrollments" OWNER TO "postgres";

COMMENT ON TABLE "public"."marketing_automation_enrollments" IS 'Contacts enrolled in automation workflows';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Marketing campaigns indexes
CREATE INDEX IF NOT EXISTS "idx_marketing_campaigns_client_id" 
    ON "public"."marketing_campaigns" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_marketing_campaigns_status" 
    ON "public"."marketing_campaigns" ("status");
CREATE INDEX IF NOT EXISTS "idx_marketing_campaigns_scheduled_at" 
    ON "public"."marketing_campaigns" ("scheduled_at") 
    WHERE "scheduled_at" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_marketing_campaigns_linked_campaign" 
    ON "public"."marketing_campaigns" ("linked_mail_campaign_id") 
    WHERE "linked_mail_campaign_id" IS NOT NULL;

-- Marketing messages indexes
CREATE INDEX IF NOT EXISTS "idx_marketing_messages_campaign_id" 
    ON "public"."marketing_campaign_messages" ("campaign_id");

-- Marketing sends indexes
CREATE INDEX IF NOT EXISTS "idx_marketing_sends_campaign_id" 
    ON "public"."marketing_sends" ("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_marketing_sends_contact_id" 
    ON "public"."marketing_sends" ("contact_id");
CREATE INDEX IF NOT EXISTS "idx_marketing_sends_status" 
    ON "public"."marketing_sends" ("status");
CREATE INDEX IF NOT EXISTS "idx_marketing_sends_sent_at" 
    ON "public"."marketing_sends" ("sent_at");

-- Marketing automations indexes
CREATE INDEX IF NOT EXISTS "idx_marketing_automations_client_id" 
    ON "public"."marketing_automations" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_marketing_automations_active" 
    ON "public"."marketing_automations" ("is_active") 
    WHERE "is_active" = true;
CREATE INDEX IF NOT EXISTS "idx_marketing_automations_trigger_type" 
    ON "public"."marketing_automations" ("trigger_type");

-- Automation steps indexes
CREATE INDEX IF NOT EXISTS "idx_automation_steps_automation_id" 
    ON "public"."marketing_automation_steps" ("automation_id");

-- Automation enrollments indexes
CREATE INDEX IF NOT EXISTS "idx_automation_enrollments_automation_id" 
    ON "public"."marketing_automation_enrollments" ("automation_id");
CREATE INDEX IF NOT EXISTS "idx_automation_enrollments_contact_id" 
    ON "public"."marketing_automation_enrollments" ("contact_id");
CREATE INDEX IF NOT EXISTS "idx_automation_enrollments_status" 
    ON "public"."marketing_automation_enrollments" ("status");
CREATE INDEX IF NOT EXISTS "idx_automation_enrollments_next_step" 
    ON "public"."marketing_automation_enrollments" ("next_step_at") 
    WHERE "status" = 'active' AND "next_step_at" IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER "update_marketing_campaigns_updated_at"
    BEFORE UPDATE ON "public"."marketing_campaigns"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_marketing_messages_updated_at"
    BEFORE UPDATE ON "public"."marketing_campaign_messages"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_marketing_automations_updated_at"
    BEFORE UPDATE ON "public"."marketing_automations"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_automation_steps_updated_at"
    BEFORE UPDATE ON "public"."marketing_automation_steps"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE "public"."marketing_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."marketing_campaign_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."marketing_sends" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."marketing_automations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."marketing_automation_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."marketing_automation_enrollments" ENABLE ROW LEVEL SECURITY;

-- Marketing Campaigns RLS Policies
CREATE POLICY "Users can view marketing campaigns for accessible clients"
    ON "public"."marketing_campaigns" FOR SELECT
    USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

CREATE POLICY "Users can create marketing campaigns for accessible clients"
    ON "public"."marketing_campaigns" FOR INSERT
    WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

CREATE POLICY "Users can update marketing campaigns for accessible clients"
    ON "public"."marketing_campaigns" FOR UPDATE
    USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"))
    WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

CREATE POLICY "Users can delete marketing campaigns for accessible clients"
    ON "public"."marketing_campaigns" FOR DELETE
    USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

-- Marketing Campaign Messages RLS Policies
CREATE POLICY "Users can view messages for accessible campaigns"
    ON "public"."marketing_campaign_messages" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ));

CREATE POLICY "Users can create messages for accessible campaigns"
    ON "public"."marketing_campaign_messages" FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ));

CREATE POLICY "Users can update messages for accessible campaigns"
    ON "public"."marketing_campaign_messages" FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ));

CREATE POLICY "Users can delete messages for accessible campaigns"
    ON "public"."marketing_campaign_messages" FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ));

-- Marketing Sends RLS Policies
CREATE POLICY "Users can view sends for accessible campaigns"
    ON "public"."marketing_sends" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ));

CREATE POLICY "Users can create sends for accessible campaigns"
    ON "public"."marketing_sends" FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ));

CREATE POLICY "Users can update sends for accessible campaigns"
    ON "public"."marketing_sends" FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_campaigns" mc
        WHERE mc.id = campaign_id 
        AND "public"."user_can_access_client"("auth"."uid"(), mc.client_id)
    ));

-- Marketing Automations RLS Policies
CREATE POLICY "Users can view automations for accessible clients"
    ON "public"."marketing_automations" FOR SELECT
    USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

CREATE POLICY "Users can create automations for accessible clients"
    ON "public"."marketing_automations" FOR INSERT
    WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

CREATE POLICY "Users can update automations for accessible clients"
    ON "public"."marketing_automations" FOR UPDATE
    USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"))
    WITH CHECK ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

CREATE POLICY "Users can delete automations for accessible clients"
    ON "public"."marketing_automations" FOR DELETE
    USING ("public"."user_can_access_client"("auth"."uid"(), "client_id"));

-- Marketing Automation Steps RLS Policies
CREATE POLICY "Users can view steps for accessible automations"
    ON "public"."marketing_automation_steps" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ));

CREATE POLICY "Users can create steps for accessible automations"
    ON "public"."marketing_automation_steps" FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ));

CREATE POLICY "Users can update steps for accessible automations"
    ON "public"."marketing_automation_steps" FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ));

CREATE POLICY "Users can delete steps for accessible automations"
    ON "public"."marketing_automation_steps" FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ));

-- Marketing Automation Enrollments RLS Policies
CREATE POLICY "Users can view enrollments for accessible automations"
    ON "public"."marketing_automation_enrollments" FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ));

CREATE POLICY "Users can create enrollments for accessible automations"
    ON "public"."marketing_automation_enrollments" FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ));

CREATE POLICY "Users can update enrollments for accessible automations"
    ON "public"."marketing_automation_enrollments" FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM "public"."marketing_automations" ma
        WHERE ma.id = automation_id 
        AND "public"."user_can_access_client"("auth"."uid"(), ma.client_id)
    ));

-- ============================================================================
-- SERVICE ROLE POLICIES (for edge functions)
-- ============================================================================

-- Allow service role full access for automation processing
CREATE POLICY "Service role can manage all marketing campaigns"
    ON "public"."marketing_campaigns"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage all marketing messages"
    ON "public"."marketing_campaign_messages"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage all marketing sends"
    ON "public"."marketing_sends"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage all automations"
    ON "public"."marketing_automations"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage all automation steps"
    ON "public"."marketing_automation_steps"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage all enrollments"
    ON "public"."marketing_automation_enrollments"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION "public"."update_marketing_campaign_stats"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update campaign stats when a send status changes
    UPDATE marketing_campaigns
    SET
        sent_count = (SELECT COUNT(*) FROM marketing_sends WHERE campaign_id = NEW.campaign_id AND status != 'pending'),
        delivered_count = (SELECT COUNT(*) FROM marketing_sends WHERE campaign_id = NEW.campaign_id AND status IN ('delivered', 'opened', 'clicked')),
        opened_count = (SELECT COUNT(*) FROM marketing_sends WHERE campaign_id = NEW.campaign_id AND status IN ('opened', 'clicked')),
        clicked_count = (SELECT COUNT(*) FROM marketing_sends WHERE campaign_id = NEW.campaign_id AND status = 'clicked'),
        bounced_count = (SELECT COUNT(*) FROM marketing_sends WHERE campaign_id = NEW.campaign_id AND status = 'bounced'),
        unsubscribed_count = (SELECT COUNT(*) FROM marketing_sends WHERE campaign_id = NEW.campaign_id AND status = 'unsubscribed'),
        updated_at = now()
    WHERE id = NEW.campaign_id;
    
    RETURN NEW;
END;
$$;

-- Trigger to update stats on send status change
CREATE TRIGGER "update_campaign_stats_on_send"
    AFTER INSERT OR UPDATE OF status ON "public"."marketing_sends"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_marketing_campaign_stats"();

-- Function to update automation enrollment stats
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
        updated_at = now()
    WHERE id = NEW.automation_id;
    
    RETURN NEW;
END;
$$;

-- Trigger to update automation stats
CREATE TRIGGER "update_automation_stats_on_enrollment"
    AFTER INSERT OR UPDATE OF status ON "public"."marketing_automation_enrollments"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_automation_enrollment_stats"();
