# FOLLOW-UP MARKETING SYSTEM
## Complete Implementation Prompts

**Document:** All Phases (0-10)  
**Created:** December 10, 2025  
**Purpose:** Copy-paste prompts for implementing the follow-up marketing system  
**Code Policy:** Prompts describe LOGIC and REQUIREMENTS - Claude will write the code

---

# TABLE OF CONTENTS

1. [Phase 0: Foundation](#phase-0-foundation)
2. [Phase 1: Core Engine](#phase-1-core-engine)
3. [Phase 2: SMS & Email Delivery](#phase-2-sms--email-delivery)
4. [Phase 3: Sequence Builder UI](#phase-3-sequence-builder-ui)
5. [Phase 4: Two-Way Conversations](#phase-4-two-way-conversations)
6. [Phase 5: WhatsApp Channel](#phase-5-whatsapp-channel)
7. [Phase 6: Voice Channel](#phase-6-voice-channel)
8. [Phase 7: Email Designer](#phase-7-email-designer)
9. [Phase 8: Advanced Features](#phase-8-advanced-features)
10. [Phase 9: AI & Optimization](#phase-9-ai--optimization)
11. [Phase 10: Polish & Launch](#phase-10-polish--launch)

---

# HOW TO USE THIS DOCUMENT

Each prompt is self-contained and can be copied directly to Claude or Cursor. The prompts:

1. **Describe the objective** - What needs to be built
2. **Provide context** - What exists, what's needed
3. **Specify the logic** - Business rules and data flow
4. **List acceptance criteria** - How to know it's done
5. **Note edge cases** - What to watch for

**DO NOT** paste multiple prompts at once. Complete each prompt, verify it works, then move to the next.

---

# PHASE 0: FOUNDATION
**Duration:** 2 Weeks  
**Goal:** Establish database schema, types, and infrastructure

---

## Prompt 0.1: Core Database Schema - Sequences & Steps

```
OBJECTIVE: Create database migration for the core follow-up sequence tables.

CONTEXT:
- We're building a follow-up marketing system
- Sequences contain multiple steps (SMS, email, WhatsApp, voice, wait, condition, action)
- Steps can branch based on conditions
- Reference: FOLLOW_UP_MARKETING_PRD_v2.md for full schema details

CREATE THESE TABLES:

1. follow_up_sequences
   - Primary container for a follow-up automation
   - Belongs to organization, optionally to client
   - Has trigger type (what starts the sequence)
   - Has send window settings (when messages can be sent)
   - Status: draft → active → paused → archived
   - AI optimization toggle
   - Cooldown and enrollment limit settings

2. follow_up_steps  
   - Individual steps within a sequence
   - Ordered by step_number
   - Channel: sms, email, whatsapp, voice, wait, condition, action
   - Delay configuration (value + unit)
   - Condition type for branching (always, if_opened, if_clicked, if_replied, if_not_engaged, custom)
   - Action on complete (next_step, branch, end, gift_card, webhook)
   - A/B variant configuration (JSONB array)
   - Can be deactivated without deletion

3. follow_up_templates
   - Reusable message templates
   - Channel-specific content fields:
     * SMS: body text
     * Email: subject, HTML body, plain text, design JSON (for builder)
     * WhatsApp: template ID, components JSONB
     * Voice: script text, SSML, voice settings
   - Available variables array
   - Status: draft, active, archived

REQUIREMENTS:
- All tables need: id (UUID), created_at, updated_at
- Foreign keys with appropriate cascade rules
- Indexes on frequently queried columns (status, organization_id, sequence_id)
- RLS policies for multi-tenant security
- Check constraints where applicable (e.g., step_number > 0)

LOCATION: supabase/migrations/[timestamp]_follow_up_core_tables.sql

After creating, run: supabase db push
```

---

## Prompt 0.2: Enrollment & Execution Tables

```
OBJECTIVE: Create database migration for enrollment and execution tracking.

CONTEXT:
- Enrollments track a recipient's participation in a sequence
- Executions track individual send attempts
- Need to track full recipient journey for analytics

CREATE THESE TABLES:

1. follow_up_enrollments
   - Links recipient to sequence
   - Tracks current position in sequence
   - Status: active, paused, completed, cancelled, opted_out, failed
   - A/B variant assignment (assigned at enrollment, stays consistent)
   - AI-calculated send times (JSONB)
   - Progress tracking (steps_completed, steps_total)
   - Timestamps: enrolled_at, paused_at, resumed_at, completed_at, cancelled_at
   - Trigger metadata (what started this enrollment)

2. follow_up_executions
   - Individual send attempts
   - Links to enrollment and step
   - Rendered content (what was actually sent - JSONB)
   - Scheduling: scheduled_at, sent_at, delivered_at
   - Status: scheduled, sending, sent, delivered, failed, bounced, skipped
   - Provider info: provider name, message ID, cost
   - Engagement: opened_at, clicked_at, replied_at, open_count, click_count
   - Links clicked (JSONB array with URL and timestamp)
   - Error tracking

REQUIREMENTS:
- Enrollment has unique constraint on (sequence_id, recipient_id) for active enrollments only
- Execution references both enrollment and step
- Indexes for:
  * Finding due executions (status + scheduled_at)
  * Finding by recipient
  * Finding by sequence
- Partitioning consideration: executions table will be large, consider partitioning by month

LOCATION: supabase/migrations/[timestamp]_follow_up_enrollment_tables.sql
```

---

## Prompt 0.3: Compliance Tables (Consent & Suppression)

```
OBJECTIVE: Create database migration for TCPA/CAN-SPAM/GDPR compliance.

CONTEXT:
- Must track consent for each channel separately
- Suppression list is global do-not-contact
- Audit trail required for legal compliance
- 5-year retention requirement for consent records

CREATE THESE TABLES:

1. sms_consent_records
   - Phone number (E.164 format)
   - Organization scope (can be global or org-specific)
   - Consent status: pending, opted_in, opted_out, expired
   - Consent type: express_written, verbal, implied, double_opt_in
   - Consent source: web_form, paper_form, sms_keyword, import, api
   - Consent language (what they agreed to)
   - Collected timestamp, IP address, user agent
   - Proof reference (URL to screenshot, recording, etc.)
   - Expiration date (if applicable)
   - Revoked timestamp (when opted out)

2. email_consent_records
   - Same structure as SMS
   - Additional: double_opt_in_sent_at, double_opt_in_confirmed_at
   - Preference center settings (JSONB for email types)

3. whatsapp_consent_records
   - Phone number
   - WhatsApp Business Account ID
   - Consent timestamp and source

4. voice_consent_records
   - Phone number
   - Consent for marketing calls
   - Do-not-call list check timestamp

5. suppression_list
   - Contact type: phone, email
   - Contact value (normalized)
   - Organization scope (null = global)
   - Suppression reason: user_request, bounce, complaint, admin, legal
   - Added via: unsubscribe_link, sms_keyword, api, admin, import
   - Added timestamp
   - Added by (user ID if admin action)
   - Notes

6. consent_audit_log
   - All changes to consent records
   - Before/after values
   - Changed by
   - Change reason
   - IP address, user agent

REQUIREMENTS:
- Unique constraints on contact + organization for consent tables
- Suppression checks must be fast (indexed)
- Audit log is append-only (no updates/deletes)
- Consider soft deletes for consent records (never hard delete)

LOCATION: supabase/migrations/[timestamp]_follow_up_compliance_tables.sql
```

---

## Prompt 0.4: Analytics & Events Tables

```
OBJECTIVE: Create database migration for event tracking and analytics.

CONTEXT:
- Event-sourced design for complete audit trail
- Need real-time and historical analytics
- Attribution tracking for revenue

CREATE THESE TABLES:

1. follow_up_events
   - Event stream for all follow-up activity
   - Event types: enrolled, step_sent, delivered, opened, clicked, replied, 
     converted, completed, cancelled, opted_out, failed, paused, resumed
   - Links to: enrollment, execution, sequence, recipient
   - Event data (JSONB for type-specific data)
   - Channel and step number
   - Timestamp with timezone
   - Source IP and user agent (where applicable)

2. attribution_touchpoints
   - Track every touchpoint in customer journey
   - Touchpoint type: mail_sent, mail_delivered, qr_scan, purl_visit, 
     form_view, form_submit, sms_sent, email_sent, call_made, etc.
   - Recipient and campaign links
   - Timestamp
   - Metadata (JSONB)

3. conversion_events
   - Track conversions
   - Conversion type: form_submit, gift_card_redeem, purchase, custom
   - Value (monetary amount)
   - Attribution window (how long after last touch)
   - Linked touchpoints (for multi-touch)

4. revenue_attribution
   - Calculated attribution per touchpoint
   - Attribution model used
   - Attributed amount
   - Calculated timestamp

5. follow_up_sequence_stats (MATERIALIZED VIEW)
   - Pre-aggregated stats per sequence
   - Enrollment counts by status
   - Send counts by channel
   - Engagement rates
   - Conversion counts and revenue
   - Refresh strategy: every 15 minutes or on-demand

REQUIREMENTS:
- Events table will be very large - partition by month
- Indexes on timestamp ranges for reporting
- Consider TimescaleDB extension for time-series optimization
- Materialized view refresh function

LOCATION: supabase/migrations/[timestamp]_follow_up_analytics_tables.sql
```

---

## Prompt 0.5: Conversation Tables

```
OBJECTIVE: Create database migration for two-way conversation support.

CONTEXT:
- Support conversations across SMS, email, WhatsApp
- Conversations can be handled by AI or routed to agents
- Full message history required

CREATE THESE TABLES:

1. follow_up_conversations
   - Conversation thread container
   - Links to: enrollment (optional), recipient, organization
   - Channel: sms, email, whatsapp
   - Status: open, waiting_response, waiting_agent, closed
   - Assigned agent (user ID)
   - Priority: low, normal, high, urgent
   - Last message timestamp
   - Opened/closed timestamps
   - Close reason: resolved, opted_out, no_response, transferred, merged
   - Tags (array)
   - Metadata (JSONB)

2. follow_up_messages
   - Individual messages in conversation
   - Direction: inbound, outbound
   - Sender type: recipient, system, agent, ai
   - Sender ID (user ID for agent)
   - Content (text)
   - Content type: text, image, file, template, voice_note
   - Media URLs (array)
   - Provider message ID
   - Status: queued, sent, delivered, read, failed
   - Timestamps: created, sent, delivered, read
   - Metadata (JSONB for provider-specific data)

3. conversation_assignments
   - Assignment history
   - Conversation ID
   - Assigned to (user ID)
   - Assigned by (user ID or 'system')
   - Assignment reason
   - Timestamps

4. conversation_notes
   - Internal notes on conversations
   - Not visible to recipient
   - Added by agent

REQUIREMENTS:
- Fast lookup by recipient contact info
- Conversation search (full-text on messages)
- Unread count tracking
- Agent workload queries

LOCATION: supabase/migrations/[timestamp]_follow_up_conversation_tables.sql
```

---

## Prompt 0.6: Database Functions

```
OBJECTIVE: Create PostgreSQL functions for common operations.

CONTEXT:
- Functions run in database for performance
- Used by edge functions for atomic operations
- Need transaction safety

CREATE THESE FUNCTIONS:

1. get_due_follow_up_steps(p_limit INTEGER, p_batch_id UUID)
   PURPOSE: Get steps ready for processing
   LOGIC:
   - Find enrollments where next_step_due_at <= NOW()
   - Status must be 'active'
   - Join to get step details and recipient info
   - Use FOR UPDATE SKIP LOCKED to prevent duplicate processing
   - Respect send window (convert to recipient timezone)
   - Check send_on_weekends setting
   - Return step details with all needed data for sending
   - Batch ID for tracking which processor took which steps

2. check_recipient_consent(p_phone TEXT, p_email TEXT, p_organization_id UUID)
   PURPOSE: Check if recipient has consent for channels
   LOGIC:
   - Check SMS consent if phone provided
   - Check email consent if email provided
   - Check suppression list for both
   - Return: has_sms_consent, has_email_consent, is_suppressed, suppression_reason
   - Handle organization-scoped vs global consent

3. record_consent(p_contact_type TEXT, p_contact_value TEXT, p_org_id UUID, 
                  p_consent_type TEXT, p_source TEXT, p_language TEXT,
                  p_ip TEXT, p_user_agent TEXT)
   PURPOSE: Record new consent
   LOGIC:
   - Normalize contact value (phone to E.164, email lowercase)
   - Insert or update consent record
   - Create audit log entry
   - Return consent record ID

4. process_opt_out(p_contact_type TEXT, p_contact_value TEXT, p_org_id UUID,
                   p_source TEXT, p_reason TEXT)
   PURPOSE: Handle opt-out request
   LOGIC:
   - Update consent record to opted_out
   - Add to suppression list
   - Cancel all active enrollments for this recipient
   - Create audit log entry
   - Return number of enrollments cancelled

5. calculate_next_step_due_time(p_enrollment_id UUID, p_current_step INTEGER)
   PURPOSE: Calculate when next step should execute
   LOGIC:
   - Get sequence settings (timezone, send window)
   - Get next step delay settings
   - Calculate base time from now
   - Adjust for send window (if outside, move to next valid time)
   - Adjust for weekend settings
   - Return timestamp

6. update_enrollment_progress(p_enrollment_id UUID, p_step_number INTEGER, p_success BOOLEAN)
   PURPOSE: Update enrollment after step execution
   LOGIC:
   - Update current_step_number
   - Update steps_completed
   - If step failed, maybe retry or mark enrollment failed
   - If last step, mark enrollment completed
   - Otherwise, calculate and set next_step_due_at
   - Return new enrollment status

LOCATION: supabase/migrations/[timestamp]_follow_up_functions.sql
```

---

## Prompt 0.7: Email Provider Abstraction

```
OBJECTIVE: Create email provider service similar to existing SMS provider.

CONTEXT:
- We have _shared/sms-provider.ts that handles SMS with fallback
- Need similar pattern for email
- Primary: Resend, Fallback: SendGrid

REFERENCE: Look at supabase/functions/_shared/sms-provider.ts for pattern

CREATE: supabase/functions/_shared/email-provider.ts

LOGIC:
1. Configuration
   - Get provider settings from organization_settings table
   - Cache settings with TTL (1 minute)
   - Support org-specific provider config or global defaults

2. Provider Interface
   - Common interface for all email providers
   - Input: to, subject, htmlBody, textBody, from, fromName, replyTo, 
           trackingId, tags, attachments
   - Output: success, messageId, provider, error

3. Resend Implementation
   - Use Resend SDK
   - Handle rate limits (exponential backoff)
   - Parse webhook format for status updates

4. SendGrid Implementation
   - Use SendGrid SDK
   - Same interface as Resend
   - Handle their specific error codes

5. Send Function
   - Try primary provider first
   - On failure, try fallback
   - Log all attempts
   - Return which provider succeeded

6. Tracking
   - Add custom headers for tracking ID
   - Support click/open tracking toggle

ALSO CREATE types in: src/features/follow-up/types/email-provider.ts
```

---

## Prompt 0.8: TypeScript Type Definitions

```
OBJECTIVE: Create comprehensive TypeScript types for the follow-up system.

CONTEXT:
- Types should match database schema exactly
- Include API request/response types
- Include UI state types

CREATE: src/features/follow-up/types/index.ts

DEFINE TYPES FOR:

1. Database Entities
   - FollowUpSequence (all columns from follow_up_sequences)
   - FollowUpStep (all columns from follow_up_steps)
   - FollowUpTemplate (all columns from follow_up_templates)
   - FollowUpEnrollment (all columns from follow_up_enrollments)
   - FollowUpExecution (all columns from follow_up_executions)
   - FollowUpConversation (all columns)
   - FollowUpMessage (all columns)
   - ConsentRecord (base for all consent types)
   - SuppressionEntry

2. Enums
   - SequenceStatus: 'draft' | 'active' | 'paused' | 'archived'
   - StepChannel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'wait' | 'condition' | 'action'
   - TriggerType: 'campaign_condition' | 'form_submit' | 'qr_scan' | 'purl_visit' | 'call_completed' | 'mail_delivered' | 'manual' | 'schedule' | 'segment_entry'
   - EnrollmentStatus: 'active' | 'paused' | 'completed' | 'cancelled' | 'opted_out' | 'failed'
   - ExecutionStatus: 'scheduled' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'skipped'
   - ConsentStatus: 'pending' | 'opted_in' | 'opted_out' | 'expired'
   - ConversationStatus: 'open' | 'waiting_response' | 'waiting_agent' | 'closed'
   - MessageDirection: 'inbound' | 'outbound'

3. Configuration Types
   - SequenceSettings (send window, timezone, AI settings)
   - TriggerConfig (campaign IDs, form IDs, filters)
   - StepConditionConfig (condition parameters)
   - ABVariant (variant config for A/B testing)

4. API Types
   - CreateSequenceRequest / Response
   - UpdateSequenceRequest / Response
   - EnrollRecipientRequest / Response
   - SendMessageRequest / Response
   - ProcessDueStepsRequest / Response

5. UI Types
   - SequenceBuilderState
   - StepEditorState
   - TemplateEditorState
   - ConversationInboxState

EXPORT all types from index.ts for easy importing.
```

---

## Prompt 0.9: RLS Policies & Security

```
OBJECTIVE: Set up Row Level Security policies for all follow-up tables.

CONTEXT:
- Multi-tenant system - users can only access their organization's data
- Some tables need cross-org access for suppression checking
- Admin roles need broader access

CREATE RLS POLICIES FOR:

1. follow_up_sequences
   - SELECT: user's organization OR user is superadmin
   - INSERT: user's organization, user must have appropriate role
   - UPDATE: user's organization, only if not archived
   - DELETE: user's organization, only if draft and no enrollments

2. follow_up_steps
   - SELECT: user can access parent sequence
   - INSERT/UPDATE/DELETE: user can modify parent sequence

3. follow_up_templates
   - SELECT: user's organization OR template is public/shared
   - INSERT/UPDATE/DELETE: user's organization

4. follow_up_enrollments
   - SELECT: user's organization
   - INSERT: system (service role) only
   - UPDATE: user's organization for pause/cancel, system for progress
   - DELETE: never (audit trail)

5. follow_up_executions
   - SELECT: user's organization
   - INSERT: system only
   - UPDATE: system only (for status updates)
   - DELETE: never

6. Consent tables
   - SELECT: user's organization OR checking for compliance
   - INSERT/UPDATE: user's organization or system
   - DELETE: never

7. suppression_list
   - SELECT: always allowed (for compliance checks)
   - INSERT: user's organization or system
   - UPDATE/DELETE: admin only

8. follow_up_conversations / messages
   - SELECT: user's organization
   - INSERT: system for inbound, user's org for outbound
   - UPDATE: user's organization

ALSO:
- Enable RLS on all tables
- Create helper function: is_org_member(org_id UUID) returns BOOLEAN
- Create helper function: has_role(role_name TEXT) returns BOOLEAN

LOCATION: supabase/migrations/[timestamp]_follow_up_rls_policies.sql
```

---

## Prompt 0.10: Verify Phase 0 Completion

```
OBJECTIVE: Verify all Phase 0 deliverables are complete and working.

CHECKLIST:

DATABASE:
□ All migrations applied successfully (supabase db push)
□ Tables exist with correct columns
□ Indexes created
□ Foreign keys working
□ RLS policies active
□ Functions callable

Run these verification queries:
- SELECT * FROM follow_up_sequences LIMIT 1;
- SELECT * FROM get_due_follow_up_steps(10, gen_random_uuid());
- Check RLS: Try accessing as different users

TYPES:
□ TypeScript compiles without errors
□ Types match database schema
□ All enums defined

Run: npx tsc --noEmit

EMAIL PROVIDER:
□ File exists at _shared/email-provider.ts
□ Resend integration working
□ SendGrid fallback working
□ Test send successful

DIRECTORY STRUCTURE:
□ src/features/follow-up/
  □ types/index.ts
  □ hooks/ (empty, for Phase 1)
  □ components/ (empty, for Phase 3)

READY FOR PHASE 1:
□ Can create a sequence record manually
□ Can create step records manually
□ Can create enrollment record manually
□ Database functions return expected results

Report any issues found and fix before proceeding to Phase 1.
```

---

# PHASE 1: CORE ENGINE
**Duration:** 3 Weeks  
**Goal:** Build sequence orchestration engine

---

## Prompt 1.1: Create Sequence Edge Function

```
OBJECTIVE: Create edge function to create a new follow-up sequence with steps.

LOCATION: supabase/functions/create-follow-up-sequence/index.ts

INPUT (JSON body):
{
  name: string (required)
  description: string (optional)
  clientId: UUID (optional)
  triggerType: enum (required)
  triggerConfig: object (optional) - campaign IDs, form IDs, filters
  settings: {
    timezone: string (default: America/New_York)
    sendWindowStart: time string (default: 09:00)
    sendWindowEnd: time string (default: 21:00)
    sendOnWeekends: boolean (default: false)
    sendDays: number[] (default: [1,2,3,4,5])
    aiOptimization: boolean (default: false)
    maxEnrollments: number (optional)
    cooldownDays: number (optional)
  }
  steps: array of {
    stepNumber: number (required, starts at 1)
    name: string (optional)
    channel: enum (required)
    templateId: UUID (optional - use existing template)
    inlineTemplate: object (optional - create new template)
    delayValue: number (required, 0 for immediate)
    delayUnit: enum (minutes, hours, days, weeks)
    conditionType: enum (default: always)
    conditionConfig: object (optional)
    actionOnComplete: enum (default: next_step)
    actionConfig: object (optional)
  }
}

LOGIC:
1. Authenticate user, get organization ID
2. Validate input (use Zod schema)
3. Start transaction:
   a. Create sequence record (status: draft)
   b. For each step with inlineTemplate, create template record
   c. Create step records with template IDs
4. On any error, rollback transaction
5. Return created sequence with steps

OUTPUT:
{
  success: boolean
  sequence: {
    id: UUID
    name: string
    status: 'draft'
    stepsCount: number
    createdAt: timestamp
  }
  error?: string
}

ERROR CASES:
- Invalid input: 400 with validation errors
- No auth: 401
- No permission: 403
- Transaction failed: 500 with rollback
```

---

## Prompt 1.2: Update Sequence Edge Function

```
OBJECTIVE: Create edge function to update a sequence and its steps.

LOCATION: supabase/functions/update-follow-up-sequence/index.ts

INPUT:
{
  sequenceId: UUID (required)
  name: string (optional)
  description: string (optional)
  triggerType: enum (optional)
  triggerConfig: object (optional)
  settings: object (optional, same as create)
  steps: array (optional) - can add, update, or remove steps
    - To update: include id and changed fields
    - To add: include all fields, no id
    - To remove: include id and action: 'delete'
}

LOGIC:
1. Authenticate user
2. Verify user owns sequence (via organization)
3. Check sequence is not archived
4. If sequence is active, some changes may require pause first
5. Update sequence fields
6. Process step changes:
   - New steps: insert
   - Updated steps: update
   - Deleted steps: soft delete or remove
7. Renumber steps if needed to maintain sequence
8. Return updated sequence

RESTRICTIONS:
- Cannot change trigger type if sequence has active enrollments
- Cannot delete steps that have executions (soft delete instead)
- Active sequences: warn about impact on existing enrollments

OUTPUT:
{
  success: boolean
  sequence: updated sequence object
  warnings: string[] (any warnings about changes)
}
```

---

## Prompt 1.3: Publish Sequence Edge Function

```
OBJECTIVE: Create edge function to validate and publish a sequence.

LOCATION: supabase/functions/publish-follow-up-sequence/index.ts

INPUT:
{
  sequenceId: UUID
}

LOGIC:
1. Get sequence with all steps and templates
2. Validate sequence is publishable:

   VALIDATION RULES:
   a. Sequence must be in draft or paused status
   b. Must have at least one active step
   c. Step numbers must be sequential (1, 2, 3...)
   d. All steps must have valid templates
   e. Templates must match step channel
   f. Send window end must be after start
   g. If has SMS steps: SMS provider must be configured
   h. If has email steps: email provider must be configured
   i. If has WhatsApp steps: WhatsApp must be approved
   j. If has voice steps: voice provider must be configured
   k. Trigger type must have required config (e.g., campaign IDs)
   l. Branch conditions must have valid targets

3. If validation fails, return detailed errors
4. If validation passes:
   - Update status to 'active'
   - Set published_at timestamp
   - Enable trigger listeners (if applicable)

OUTPUT:
{
  success: boolean
  sequence?: { id, name, status, publishedAt }
  validationErrors?: [{
    field: string
    message: string
  }]
}
```

---

## Prompt 1.4: Pause/Archive Sequence Functions

```
OBJECTIVE: Create functions to pause and archive sequences.

LOCATION: 
- supabase/functions/pause-follow-up-sequence/index.ts
- supabase/functions/archive-follow-up-sequence/index.ts

PAUSE LOGIC:
1. Get sequence, verify ownership
2. Sequence must be 'active' to pause
3. Update sequence status to 'paused'
4. Pause all active enrollments (preserve their position)
5. Return count of affected enrollments

ARCHIVE LOGIC:
1. Get sequence, verify ownership
2. Sequence must be 'draft' or 'paused' to archive
3. If has active enrollments, must pause them first
4. If has any enrollments (even completed), archive instead of delete
5. Update status to 'archived'
6. Set archived_at timestamp
7. Return archive confirmation

UNPAUSE (reactivate):
1. Update status back to 'active'
2. Resume paused enrollments
3. Recalculate next_step_due_at for each (from now)

OUTPUT (both):
{
  success: boolean
  affectedEnrollments: number
  message: string
}
```

---

## Prompt 1.5: Get Sequence Functions

```
OBJECTIVE: Create functions to retrieve sequences.

LOCATIONS:
- supabase/functions/get-follow-up-sequence/index.ts (single)
- supabase/functions/list-follow-up-sequences/index.ts (list)

GET SINGLE:
Input: { sequenceId, includeStats: boolean, includeSteps: boolean }

Logic:
1. Get sequence by ID
2. Verify user can access (organization check)
3. If includeSteps: join steps with templates
4. If includeStats: calculate enrollment/execution stats

Output:
{
  success: boolean
  sequence: {
    ...all sequence fields
    steps?: array of steps with templates
    stats?: {
      totalEnrollments, activeEnrollments, completedEnrollments,
      totalSent, totalDelivered, totalOpened, totalClicked,
      conversionRate, avgCompletionTime
    }
  }
}

LIST:
Input: { 
  clientId?: filter by client
  status?: filter by status
  triggerType?: filter by trigger
  search?: search name/description
  page: number
  pageSize: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

Logic:
1. Build query with filters
2. Apply organization filter (automatic via RLS)
3. Paginate results
4. Include basic counts (steps, enrollments)

Output:
{
  success: boolean
  sequences: array
  pagination: { page, pageSize, total, totalPages }
}
```

---

## Prompt 1.6: Enroll Recipient Edge Function

```
OBJECTIVE: Create the core enrollment function.

LOCATION: supabase/functions/enroll-in-sequence/index.ts

INPUT:
{
  sequenceId: UUID
  recipientId: UUID
  campaignId?: UUID
  recipientPhone?: string (if not on recipient record)
  recipientEmail?: string (if not on recipient record)
  triggerType: enum
  triggerEventId?: UUID
  triggerMetadata?: object
  skipConsentCheck?: boolean (for transactional)
}

LOGIC:
1. Get sequence - verify active status
2. Get recipient data - phone, email, name
3. CONSENT CHECK (unless skipped):
   a. Get sequence step channels
   b. If has SMS steps and require_sms_consent: check SMS consent
   c. If has email steps and require_email_consent: check email consent
   d. Check suppression list
   e. If any required consent missing: reject with specific code
4. DUPLICATE CHECK:
   a. Check if recipient already has active enrollment in this sequence
   b. If yes: reject with ALREADY_ENROLLED code
5. COOLDOWN CHECK:
   a. If cooldown_days > 0: check for recent enrollments
   b. If enrolled within cooldown period: reject with COOLDOWN_ACTIVE
6. MAX ENROLLMENT CHECK:
   a. If max_enrollments > 0: count previous enrollments
   b. If at max: reject with MAX_REACHED
7. CREATE ENROLLMENT:
   a. Calculate first step due time
   b. Assign A/B variant (if sequence has variants)
   c. Insert enrollment record
   d. Log 'enrolled' event
8. Return enrollment details

OUTPUT:
{
  success: boolean
  enrollment?: {
    id, sequenceId, recipientId, status,
    stepsTotal, nextStepDueAt, abVariant
  }
  code?: error code for specific rejections
  error?: string
}

ERROR CODES:
- SEQUENCE_NOT_FOUND
- SEQUENCE_INACTIVE
- NO_SMS_CONSENT
- NO_EMAIL_CONSENT
- SUPPRESSED
- ALREADY_ENROLLED
- COOLDOWN_ACTIVE
- MAX_REACHED
```

---

## Prompt 1.7: Manage Enrollment Functions

```
OBJECTIVE: Create functions to pause, resume, and cancel enrollments.

LOCATIONS:
- supabase/functions/pause-follow-up-enrollment/index.ts
- supabase/functions/resume-follow-up-enrollment/index.ts
- supabase/functions/cancel-follow-up-enrollment/index.ts

PAUSE ENROLLMENT:
Input: { enrollmentId, reason?: string }
Logic:
1. Get enrollment, verify ownership
2. Must be 'active' status
3. Update status to 'paused'
4. Set paused_at timestamp
5. Store pause reason in metadata
6. Log 'paused' event
Output: { success, message }

RESUME ENROLLMENT:
Input: { enrollmentId, resumeImmediately?: boolean }
Logic:
1. Get enrollment with sequence info
2. Must be 'paused' status
3. If resumeImmediately:
   - Set next_step_due_at to now
4. Else:
   - Recalculate next_step_due_at based on step delay
5. Update status to 'active'
6. Set resumed_at timestamp
7. Log 'resumed' event
Output: { success, nextStepDueAt }

CANCEL ENROLLMENT:
Input: { enrollmentId, reason: string }
Logic:
1. Get enrollment
2. Must be 'active' or 'paused'
3. Update status to 'cancelled'
4. Set cancelled_at timestamp
5. Cancel any scheduled executions
6. Log 'cancelled' event
Output: { success, message }
```

---

## Prompt 1.8: Process Due Steps (CRON Processor)

```
OBJECTIVE: Create the CRON job that processes due follow-up steps.

LOCATION: supabase/functions/process-due-follow-ups/index.ts

TRIGGER: CRON every minute (configure in supabase dashboard or config.toml)

INPUT (optional for manual runs):
{
  batchSize?: number (default: 100)
  dryRun?: boolean (default: false)
}

PROCESSING LOGIC:

1. FETCH DUE STEPS:
   - Call database function get_due_follow_up_steps
   - Uses FOR UPDATE SKIP LOCKED to prevent duplicate processing
   - Returns steps ready to send with all needed data

2. FOR EACH DUE STEP:
   a. VERIFY CONSENT (double-check at send time):
      - Re-check consent hasn't been revoked
      - Re-check suppression list
      - If no longer valid: skip step, log reason
   
   b. CHECK SEND WINDOW:
      - Get recipient timezone (or default to sequence timezone)
      - Check if current time is within send window
      - If outside window: reschedule to next valid time
   
   c. APPLY AI OPTIMIZATION (if enabled):
      - Get AI-calculated optimal send time
      - If different from now: reschedule
   
   d. RENDER TEMPLATE:
      - Get template content
      - Fetch recipient data for personalization
      - Fetch any external data (for real-time personalization)
      - Replace all variables
      - Validate rendered content (e.g., SMS length)
   
   e. CREATE EXECUTION RECORD:
      - Store rendered content
      - Set status to 'sending'
      - Set scheduled_at to now
   
   f. SEND MESSAGE:
      - Call appropriate send function based on channel
      - SMS: send-follow-up-sms
      - Email: send-follow-up-email
      - WhatsApp: send-follow-up-whatsapp
      - Voice: send-follow-up-voice
   
   g. UPDATE RECORDS:
      - Update execution status based on send result
      - Update enrollment progress
      - Log event
   
   h. HANDLE NEXT STEP:
      - Check if current step has branches
      - If condition step: evaluate and set branch target
      - Calculate next step due time
      - Update enrollment.next_step_due_at

3. RETURN SUMMARY:
   {
     processed: number
     sent: number
     failed: number
     skipped: number
     rescheduled: number
     details: array of step results
     executionTimeMs: number
   }

ERROR HANDLING:
- Individual step failures don't stop batch
- Log all errors with context
- Retry failed steps on next run (with backoff)
- Alert if error rate exceeds threshold
```

---

## Prompt 1.9: Trigger Evaluation System

```
OBJECTIVE: Create system to evaluate triggers and start enrollments.

CONTEXT:
When events happen (QR scan, form submit, etc.), we need to:
1. Find sequences listening for that trigger
2. Check if recipient matches sequence filters
3. Enroll recipient if all conditions met

CREATE THESE FUNCTIONS:

1. supabase/functions/evaluate-follow-up-triggers/index.ts

INPUT:
{
  triggerType: enum
  recipientId: UUID
  campaignId?: UUID
  eventId?: UUID
  eventData?: object (event-specific data)
}

LOGIC:
a. Find all active sequences with matching trigger_type
b. For each sequence:
   - Check trigger_config filters (campaign IDs, form IDs, etc.)
   - If matches: attempt enrollment
   - Enrollment function handles consent/duplicate checks
c. Return list of enrollments created

2. EXTEND EXISTING FUNCTIONS:

evaluate-conditions/index.ts (existing):
- After processing campaign condition
- Check if condition has linked sequence_id
- If yes: call evaluate-follow-up-triggers with trigger_type='campaign_condition'

submit-ace-form/index.ts (existing):
- After saving form submission
- Check if form has linked sequence_id
- If yes: call evaluate-follow-up-triggers with trigger_type='form_submit'

TRIGGER MAPPING:
| Event Source | Trigger Type | Event Data |
|--------------|--------------|------------|
| evaluate-conditions | campaign_condition | conditionNumber, campaignId |
| submit-ace-form | form_submit | formId, submissionData |
| qr-redirect | qr_scan | qrCodeId, scanLocation |
| purl handler | purl_visit | purlId, pageViews |
| call-tracking webhook | call_completed | callDuration, disposition |
| mail-delivery webhook | mail_delivered | deliveryDate |
```

---

## Prompt 1.10: Frontend Hooks (React Query)

```
OBJECTIVE: Create React Query hooks for sequence operations.

LOCATION: src/features/follow-up/hooks/useSequences.ts

CREATE HOOKS:

1. Query Keys Factory:
   const sequenceKeys = {
     all: ['sequences'] as const,
     list: (filters) => [...sequenceKeys.all, 'list', filters],
     detail: (id) => [...sequenceKeys.all, 'detail', id],
     enrollments: (id) => [...sequenceKeys.all, 'enrollments', id],
   }

2. useSequences(filters)
   - List sequences with filtering
   - Paginated
   - Auto-refetch on window focus

3. useSequence(id, options)
   - Get single sequence with steps
   - Option to include stats
   - Enabled only when id is provided

4. useCreateSequence()
   - Mutation to create sequence
   - Invalidates list on success
   - Returns new sequence

5. useUpdateSequence()
   - Mutation to update
   - Invalidates detail and list
   - Optimistic update option

6. usePublishSequence()
   - Mutation to publish
   - Handles validation errors

7. usePauseSequence()
8. useArchiveSequence()

9. useEnrollments(sequenceId)
   - List enrollments for sequence
   - Include recipient info

10. usePauseEnrollment()
11. useResumeEnrollment()
12. useCancelEnrollment()

ALSO CREATE:
- src/features/follow-up/hooks/useTemplates.ts (similar pattern)
- src/features/follow-up/hooks/index.ts (barrel export)

PATTERN:
- Use callEdgeFunction helper for API calls
- Proper error handling with typed errors
- Loading states
- Optimistic updates where appropriate
```

---

## Prompt 1.11: Verify Phase 1 Completion

```
OBJECTIVE: Verify all Phase 1 deliverables are complete.

EDGE FUNCTIONS:
□ create-follow-up-sequence
□ update-follow-up-sequence
□ publish-follow-up-sequence
□ pause-follow-up-sequence
□ archive-follow-up-sequence
□ get-follow-up-sequence
□ list-follow-up-sequences
□ enroll-in-sequence
□ pause-follow-up-enrollment
□ resume-follow-up-enrollment
□ cancel-follow-up-enrollment
□ process-due-follow-ups
□ evaluate-follow-up-triggers

FRONTEND:
□ useSequences hooks complete
□ useTemplates hooks complete

TEST SCENARIOS:
1. Create a sequence with 3 steps (SMS → Wait → Email)
2. Publish the sequence
3. Manually enroll a test recipient
4. Verify enrollment record created
5. Run process-due-follow-ups manually
6. Verify first step marked for execution
7. Pause the enrollment
8. Resume the enrollment
9. Cancel the enrollment
10. Archive the sequence

CRON SETUP:
□ process-due-follow-ups scheduled to run every minute

Run: supabase functions deploy --all

Report any issues before proceeding to Phase 2.
```

---

# PHASE 2: SMS & EMAIL DELIVERY
**Duration:** 2 Weeks  
**Goal:** Implement message delivery and tracking

---

## Prompt 2.1: Send Follow-Up SMS

```
OBJECTIVE: Create edge function to send SMS for follow-up sequences.

LOCATION: supabase/functions/send-follow-up-sms/index.ts

INPUT:
{
  executionId: UUID
  enrollmentId: UUID
  recipientId: UUID
  recipientPhone: string
  sequenceId: UUID
  stepNumber: number
  renderedBody: string
}

LOGIC:
1. FINAL CONSENT CHECK:
   - Call check_recipient_consent
   - If suppressed: skip, update execution to 'skipped'
   
2. FORMAT PHONE:
   - Convert to E.164 format
   - Validate phone is valid
   
3. SEND VIA PROVIDER:
   - Use existing _shared/sms-provider.ts
   - Try primary provider, fallback on failure
   
4. LOG DELIVERY:
   - Insert into sms_delivery_log table
   - Include execution_id in metadata
   
5. CALCULATE SEGMENTS:
   - 160 chars = 1 segment
   - 306 chars = 2 segments (concatenated)
   - >306 chars = ceil(length / 153) segments
   
6. UPDATE EXECUTION:
   - Set status: sent or failed
   - Set sent_at timestamp
   - Set provider and provider_message_id
   - Set segment_count and cost_cents
   
7. LOG EVENT:
   - Insert follow_up_event with type 'step_sent'

OUTPUT:
{
  success: boolean
  messageId?: string
  provider?: string
  segmentCount?: number
  error?: string
}
```

---

## Prompt 2.2: Send Follow-Up Email

```
OBJECTIVE: Create edge function to send email for follow-up sequences.

LOCATION: supabase/functions/send-follow-up-email/index.ts

INPUT:
{
  executionId: UUID
  enrollmentId: UUID
  recipientId: UUID
  recipientEmail: string
  recipientName?: string
  sequenceId: UUID
  stepNumber: number
  subject: string
  bodyHtml: string
  bodyText?: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
}

LOGIC:
1. FINAL CONSENT CHECK:
   - Check suppression list
   - If suppressed: skip

2. ADD TRACKING:
   a. Open Tracking:
      - Generate tracking pixel URL with execution_id
      - Insert 1x1 transparent GIF before </body>
   b. Click Tracking:
      - Find all href links in HTML
      - Wrap each with tracking redirect URL
      - Preserve original URL as parameter
      - Skip unsubscribe links (don't track those)
   c. Unsubscribe Link:
      - If no unsubscribe link present, add one
      - Link to unsubscribe handler with execution_id

3. SEND VIA PROVIDER:
   - Use _shared/email-provider.ts
   - Include tracking ID in headers
   - Add tags for filtering

4. LOG DELIVERY:
   - Insert into email_delivery_log
   - Include execution metadata

5. UPDATE EXECUTION:
   - Set status: sent or failed
   - Set provider info
   - Set cost estimate

OUTPUT:
{
  success: boolean
  messageId?: string
  provider?: string
  error?: string
}
```

---

## Prompt 2.3: Email Tracking Handler

```
OBJECTIVE: Create handler for email open/click tracking.

LOCATION: supabase/functions/track-follow-up-email/index.ts

THIS IS A GET ENDPOINT (not POST)

URL PARAMETERS:
- eid: execution ID
- t: tracking type (open, click, unsubscribe)
- url: original URL (for clicks)

LOGIC BY TYPE:

1. OPEN TRACKING (t=open):
   - Look up execution by eid
   - If found and opened_at is null:
     - Set opened_at to now
   - Increment open_count
   - Log 'opened' event
   - Return 1x1 transparent GIF with no-cache headers

2. CLICK TRACKING (t=click):
   - Look up execution
   - Set clicked_at (if not set)
   - Increment click_count
   - Add to links_clicked array: { url, timestamp }
   - Log 'clicked' event
   - Redirect (302) to original URL

3. UNSUBSCRIBE (t=unsubscribe):
   - Look up execution to get enrollment/recipient
   - Mark execution: unsubscribed_at = now
   - Add recipient to suppression list
   - Update consent record to opted_out
   - Cancel enrollment (status: opted_out)
   - Log 'unsubscribed' event
   - Return HTML confirmation page

ERROR HANDLING:
- Invalid execution ID: still return pixel/redirect (don't break email)
- Log errors but don't expose to user
- Use cache headers appropriately

RESPONSE HEADERS:
- Open: Content-Type: image/gif, Cache-Control: no-cache
- Click: 302 redirect to url parameter
- Unsubscribe: Content-Type: text/html
```

---

## Prompt 2.4: Provider Webhook Handlers

```
OBJECTIVE: Create handlers for SMS and email provider webhooks.

LOCATIONS:
- supabase/functions/webhook-sms-status/index.ts
- supabase/functions/webhook-email-status/index.ts

SMS WEBHOOK (webhook-sms-status):
Handles status updates from Twilio, Infobip, etc.

Input varies by provider, but extract:
- messageId (provider_message_id)
- status: delivered, failed, undelivered
- errorCode (if failed)
- timestamp

Logic:
1. Identify provider from headers or payload
2. Parse provider-specific format
3. Find execution by provider_message_id
4. Update execution:
   - status: delivered or failed
   - delivered_at: timestamp
   - error_message: if failed
5. Log event

Also handle INBOUND SMS:
- Parse sender phone number
- Match to recipient by phone
- Route to conversation handler (Phase 4)

EMAIL WEBHOOK (webhook-email-status):
Handles status from Resend, SendGrid

Events to handle:
- delivered: email reached inbox
- bounced: hard bounce
- complained: marked as spam
- opened: backup open tracking (some providers have this)
- clicked: backup click tracking

Logic:
1. Parse provider format
2. Find execution by message ID or tracking ID
3. Update execution status
4. For bounces/complaints:
   - Add to suppression list
   - Cancel active enrollments
5. Log event

SECURITY:
- Verify webhook signatures (each provider has different method)
- Resend: svix headers
- SendGrid: signature header
- Twilio: request signing
- Reject invalid signatures
```

---

## Prompt 2.5: Inbound SMS Handler

```
OBJECTIVE: Handle incoming SMS messages for opt-outs and replies.

LOCATION: supabase/functions/webhook-sms-inbound/index.ts

INPUT (varies by provider):
- From: sender phone number
- To: your number
- Body: message text
- MessageId: provider ID
- Timestamp

LOGIC:

1. PARSE AND NORMALIZE:
   - Extract phone number, normalize to E.164
   - Get message body, trim whitespace, uppercase for matching

2. KEYWORD DETECTION:
   OPT-OUT KEYWORDS: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT
   OPT-IN KEYWORDS: START, YES, UNSTOP, SUBSCRIBE
   HELP KEYWORDS: HELP, INFO

3. HANDLE OPT-OUT:
   - Call process_opt_out database function
   - This handles: consent update, suppression, cancel enrollments
   - Send confirmation: "You have been unsubscribed..."
   - Log event

4. HANDLE OPT-IN:
   - Create/update consent record
   - Status: opted_in
   - Send confirmation: "You are now subscribed..."
   - Log event

5. HANDLE HELP:
   - Send help message with opt-out instructions
   - Include contact info if configured

6. HANDLE REPLY (not keyword):
   - Find recipient by phone number
   - Find most recent active enrollment
   - Create/update conversation (Phase 4)
   - Route to conversation system
   - Log event

RESPONSE:
- For Twilio: TwiML response with reply message
- For others: 200 OK, send reply via API

REQUIRED MESSAGES (configurable):
- opt_out_confirmation: "You've been unsubscribed from messages..."
- opt_in_confirmation: "Thanks! You're now subscribed..."
- help_message: "Reply STOP to unsubscribe..."
```

---

## Prompt 2.6: Template Rendering Service

```
OBJECTIVE: Create service for rendering templates with personalization.

LOCATION: supabase/functions/_shared/template-renderer.ts

FUNCTION: renderTemplate(template, variables, options)

INPUT:
- template: Template object (channel-specific content)
- variables: Record<string, any> with all available data
- options: {
    validateOutput?: boolean
    maxSmsLength?: number
    channel: 'sms' | 'email' | 'whatsapp' | 'voice'
  }

LOGIC:

1. COLLECT VARIABLES:
   Standard variables (always available):
   - first_name, last_name, full_name
   - email, phone
   - campaign_name, client_name
   - unsubscribe_link, preference_link
   
   Gift card variables (if applicable):
   - gift_card_code, gift_card_value, gift_card_brand
   
   Custom variables:
   - Any custom fields from recipient data
   - Any trigger metadata

2. RENDER CONTENT:
   For each template field:
   - Find all {{variable_name}} patterns
   - Replace with value from variables
   - Handle missing values: use empty string or fallback
   - Handle nested: {{recipient.custom_field}}

3. PROCESS LINKS:
   - Shorten links if link_shortening enabled
   - Add UTM parameters if configured
   - Validate URLs are valid

4. VALIDATE OUTPUT:
   SMS:
   - Check length (warn if > 160, error if > 1600)
   - Check for non-GSM characters
   - Return segment count
   
   Email:
   - Validate HTML structure
   - Check for empty subject
   - Generate plain text if not provided
   
   WhatsApp:
   - Validate against template parameters
   - Check media URLs are accessible

5. RETURN:
   {
     success: boolean
     rendered: {
       smsBody?: string
       emailSubject?: string
       emailHtml?: string
       emailText?: string
       whatsappBody?: string
       voiceScript?: string
     }
     warnings: string[]
     errors: string[]
     metadata: {
       smsSegments?: number
       characterCount?: number
       variablesUsed: string[]
       variablesMissing: string[]
     }
   }
```

---

## Prompt 2.7: Delivery Analytics Tracking

```
OBJECTIVE: Create comprehensive delivery tracking and metrics.

CREATE:

1. Database function: record_delivery_event(params)
   - Atomic event recording
   - Update execution record
   - Update enrollment stats
   - Trigger analytics refresh if needed

2. Materialized view refresh function
   - Recalculate sequence_performance stats
   - Can be called on-demand or scheduled

3. Analytics query functions:
   
   get_sequence_analytics(sequence_id, date_range)
   Returns:
   - Enrollment counts by status
   - Messages sent by channel
   - Delivery rates by channel
   - Engagement rates (open, click, reply)
   - Conversion counts
   - Timeline data for charts
   
   get_step_analytics(sequence_id)
   Returns per step:
   - Sent count
   - Delivered count
   - Failed count
   - Engagement metrics
   - Drop-off percentage
   
   get_channel_comparison(organization_id, date_range)
   Returns:
   - Performance comparison across channels
   - Best performing channel by metric
   - Cost comparison

TRACKING EVENTS TO RECORD:
- step_sent: message sent to provider
- delivered: provider confirmed delivery
- bounced: hard bounce
- failed: send failed
- opened: email opened (pixel loaded)
- clicked: link clicked
- replied: recipient replied
- converted: conversion event occurred
- opted_out: recipient unsubscribed
```

---

## Prompt 2.8: Verify Phase 2 Completion

```
OBJECTIVE: Verify all Phase 2 deliverables are complete.

EDGE FUNCTIONS:
□ send-follow-up-sms
□ send-follow-up-email
□ track-follow-up-email
□ webhook-sms-status
□ webhook-email-status
□ webhook-sms-inbound

SHARED SERVICES:
□ _shared/template-renderer.ts
□ _shared/email-provider.ts (from Phase 0)

TEST SCENARIOS:

SMS:
1. Create sequence with SMS step
2. Enroll test recipient
3. Process due steps
4. Verify SMS sent (check provider dashboard)
5. Simulate delivery webhook
6. Verify execution updated to 'delivered'
7. Send STOP reply
8. Verify recipient suppressed and enrollment cancelled

EMAIL:
1. Create sequence with email step
2. Enroll test recipient
3. Process due steps
4. Verify email sent
5. Open email, verify tracking pixel fires
6. Click link, verify redirect and tracking
7. Click unsubscribe
8. Verify recipient suppressed

TEMPLATE RENDERING:
1. Test all variable types render correctly
2. Test missing variable handling
3. Test SMS segment calculation
4. Test link wrapping

ANALYTICS:
1. Run sequence with multiple recipients
2. Check analytics queries return correct data
3. Verify materialized view refreshes

Deploy and configure webhooks in provider dashboards.

Report issues before Phase 3.
```

---

# PHASE 3: SEQUENCE BUILDER UI
**Duration:** 3 Weeks  
**Goal:** Create visual sequence builder interface

---

## Prompt 3.1: Sequence List Page

```
OBJECTIVE: Create the main sequences list page.

LOCATION: src/features/follow-up/pages/SequenceListPage.tsx

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  Follow-Up Sequences                    [+ New Sequence]        │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Client ▼] [Status ▼] [Trigger ▼]    🔍 Search        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📋 Post-QR Scan Nurture                    [Active] ▼   │    │
│  │ Trigger: QR Scan  •  4 steps  •  1,234 enrolled         │    │
│  │ Client: Acme Corp  •  Created: Dec 1, 2025              │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📋 Form Follow-Up                          [Draft] ▼    │    │
│  │ Trigger: Form Submit  •  2 steps  •  0 enrolled         │    │
│  │ Client: None  •  Created: Dec 5, 2025                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [< Prev]  Page 1 of 5  [Next >]                                │
└─────────────────────────────────────────────────────────────────┘

FEATURES:
1. Filter by client, status, trigger type
2. Search by name/description
3. Sort by name, date, status, enrollment count
4. Pagination
5. Quick actions dropdown: Edit, Duplicate, Pause/Resume, Archive
6. Click card to open sequence editor
7. Status badges with colors
8. Loading skeleton while fetching
9. Empty state for no sequences

USE:
- useSequences hook for data
- Existing UI components (Card, Button, Input, Select, etc.)
- React Router for navigation
```

---

## Prompt 3.2: Sequence Builder - Canvas Component

```
OBJECTIVE: Create the visual canvas for building sequences.

LOCATION: src/features/follow-up/components/SequenceBuilder/Canvas.tsx

CONCEPT:
Visual flowchart-style editor where users drag-and-drop steps and connect them.

ELEMENTS:

1. TRIGGER NODE (starting point):
   - Shows selected trigger type
   - Click to configure trigger
   - Always at top of canvas

2. STEP NODES:
   - Channel icon + label
   - Brief content preview
   - Connection points (top input, bottom output)
   - Condition nodes have multiple outputs (Yes/No branches)
   - Click to edit in side panel
   - Drag to reorder

3. CONNECTORS:
   - Lines connecting nodes
   - Arrow at end showing direction
   - Animated for active sequences
   - Labels for condition branches (Yes/No)

4. ADD BUTTON:
   - Between nodes
   - Click to insert new step
   - Or drag from palette

STATE:
- steps: array of step configurations
- connections: array of {from, to, label}
- selectedStep: currently selected for editing
- zoom: canvas zoom level
- pan: canvas position

INTERACTIONS:
- Drag step from palette to canvas
- Drag existing step to reorder
- Click step to select and edit
- Click connection to insert step
- Double-click step to open editor
- Delete key to remove selected
- Undo/redo support

LIBRARIES TO CONSIDER:
- React Flow (recommended) - built for this use case
- Or custom implementation with SVG

NOTE: This is a complex component. Consider breaking into:
- Canvas.tsx (container)
- StepNode.tsx (individual step)
- Connector.tsx (connection line)
- CanvasControls.tsx (zoom, undo, etc.)
```

---

## Prompt 3.3: Sequence Builder - Step Palette

```
OBJECTIVE: Create the palette of available step types.

LOCATION: src/features/follow-up/components/SequenceBuilder/StepPalette.tsx

LAYOUT:
┌─────────────────────────┐
│ ADD STEP                │
├─────────────────────────┤
│ MESSAGING               │
│ ┌───────┐ ┌───────┐    │
│ │ 📱 SMS │ │ 📧 Mail│    │
│ └───────┘ └───────┘    │
│ ┌───────┐ ┌───────┐    │
│ │💬 WApp│ │📞 Voice│    │
│ └───────┘ └───────┘    │
├─────────────────────────┤
│ FLOW CONTROL            │
│ ┌───────┐ ┌───────┐    │
│ │ ⏱ Wait│ │🔀 If/Then│  │
│ └───────┘ └───────┘    │
├─────────────────────────┤
│ ACTIONS                 │
│ ┌───────┐ ┌───────┐    │
│ │🎁 Gift│ │🔗 Hook │    │
│ └───────┘ └───────┘    │
│ ┌───────┐ ┌───────┐    │
│ │🏷 Tag │ │🔚 End  │    │
│ └───────┘ └───────┘    │
└─────────────────────────┘

STEP TYPES:

MESSAGING:
- SMS: Send text message
- Email: Send email
- WhatsApp: Send WhatsApp message (if enabled)
- Voice: Make phone call (if enabled)

FLOW CONTROL:
- Wait: Delay for specified time
- Condition: Branch based on criteria

ACTIONS:
- Gift Card: Provision and send gift card
- Webhook: Call external URL
- Tag: Add tag to recipient
- End: Explicitly end sequence

BEHAVIOR:
- Drag from palette to canvas
- Double-click to add after selected step
- Show tooltip on hover with description
- Disable unavailable steps (e.g., WhatsApp if not configured)
```

---

## Prompt 3.4: Sequence Builder - Step Editor Panel

```
OBJECTIVE: Create the side panel for editing step configuration.

LOCATION: src/features/follow-up/components/SequenceBuilder/StepEditor.tsx

LAYOUT (slides in from right when step selected):
┌─────────────────────────────────────┐
│ Step 2: Follow-Up Email        [X]  │
├─────────────────────────────────────┤
│ TIMING                              │
│ Send after: [1] [days ▼] from       │
│             previous step           │
├─────────────────────────────────────┤
│ MESSAGE                             │
│ Template: [Select template ▼]       │
│ -- or --                            │
│ [Create Inline Message]             │
│                                     │
│ Subject: [Your exclusive offer]     │
│ Preview:                            │
│ ┌─────────────────────────────────┐ │
│ │ Hi {{first_name}},              │ │
│ │ Thanks for scanning...          │ │
│ └─────────────────────────────────┘ │
│ [Edit Template]                     │
├─────────────────────────────────────┤
│ ADVANCED                     [▼]    │
│ ☐ A/B Test this step               │
│ Condition: [Always send ▼]          │
├─────────────────────────────────────┤
│ [Delete Step]                       │
└─────────────────────────────────────┘

FIELDS BY STEP TYPE:

SMS:
- Delay (value + unit)
- Template or inline message
- Character count indicator
- Segment count
- Preview with sample data

EMAIL:
- Delay
- Template selection
- Subject line
- From name/email (optional override)
- Preview (desktop/mobile toggle)

WAIT:
- Duration value and unit
- Until specific day/time option

CONDITION:
- Condition type dropdown
- Configuration based on type:
  - If opened: which step(s) to check
  - If clicked: which link(s)
  - If replied: any reply or keyword
  - Custom: expression builder

GIFT CARD:
- Brand selection
- Denomination
- Delivery method (in-message, separate)

WEBHOOK:
- URL
- Method (GET/POST)
- Headers
- Body template

VALIDATION:
- Show errors inline
- Disable save if invalid
- Required field indicators
```

---

## Prompt 3.5: Sequence Builder - Settings Panel

```
OBJECTIVE: Create settings configuration for the sequence.

LOCATION: src/features/follow-up/components/SequenceBuilder/SettingsPanel.tsx

LAYOUT (tab or collapsible section):

GENERAL:
- Name*: [text input]
- Description: [textarea]
- Client: [client selector - optional]

TRIGGER:
- Trigger Type*: [dropdown]
  Options: QR Scan, Form Submit, Condition Met, Mail Delivered, etc.
- Configuration (based on type):
  - QR Scan: Select campaigns
  - Form Submit: Select forms
  - Condition Met: Select conditions
  - Manual: API documentation

SCHEDULING:
- Timezone*: [timezone picker]
- Send Window: [time picker] to [time picker]
- Send Days: [M T W T F S S] checkboxes
- ☐ Allow weekend sending
- ☐ Enable AI send time optimization

ENROLLMENT:
- Max enrollments per recipient: [number or "Unlimited"]
- Cooldown period: [number] days between enrollments
- ☐ Require SMS consent
- ☐ Require email consent

FEATURES:
- Real-time validation
- Defaults for new sequences
- Copy settings from another sequence
- Reset to defaults option
```

---

## Prompt 3.6: Sequence Builder - Template Editor Modal

```
OBJECTIVE: Create modal for editing/creating message templates.

LOCATION: src/features/follow-up/components/SequenceBuilder/TemplateEditor.tsx

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│ Edit Template: Welcome SMS                              [X]     │
├────────────────────────────────────┬────────────────────────────┤
│ MESSAGE                            │ PREVIEW                    │
│                                    │                            │
│ ┌────────────────────────────────┐ │ ┌────────────────────────┐ │
│ │ Hi {{first_name}}! Thanks for  │ │ │ Hi John! Thanks for    │ │
│ │ scanning. Check out your       │ │ │ scanning. Check out    │ │
│ │ exclusive offer: {{purl}}      │ │ │ your exclusive offer:  │ │
│ │                                │ │ │ example.com/j12        │ │
│ │ Reply STOP to opt out.         │ │ │                        │ │
│ └────────────────────────────────┘ │ │ Reply STOP to opt out. │ │
│                                    │ └────────────────────────┘ │
│ 142/160 characters • 1 segment     │                            │
│                                    │ Sample: [John Smith ▼]     │
│ INSERT VARIABLE:                   │                            │
│ [first_name] [last_name] [purl]    │                            │
│ [gift_card_code] [unsubscribe]     │                            │
│                                    │                            │
├────────────────────────────────────┴────────────────────────────┤
│ [Cancel]                           [Save as New] [Save Changes] │
└─────────────────────────────────────────────────────────────────┘

FOR EMAIL:
- Subject line input
- Rich text editor for HTML body
- Plain text tab
- Desktop/mobile preview toggle
- Link to full email designer (Phase 7)

FOR WHATSAPP:
- Template selector (pre-approved only)
- Parameter mapping
- Preview with actual template

FOR VOICE:
- Script text area
- Voice selection dropdown
- Audio preview button
- SSML helper (advanced)

FEATURES:
- Variable picker with categories
- Character/segment counter
- Real-time preview with sample data
- Sample data selector (pick test recipient)
- Save as new template option
- Template versioning indicator
```

---

## Prompt 3.7: Sequence Builder - Main Page Container

```
OBJECTIVE: Create the main page that combines all builder components.

LOCATION: src/features/follow-up/pages/SequenceBuilderPage.tsx

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│ ← Sequences    Edit: Post-Scan Nurture        [Test] [Publish] │
├─────────────────────────────────────────────────────────────────┤
│ [Settings] [Steps] [Analytics]                                  │
├────────────────────┬───────────────────────────┬────────────────┤
│                    │                           │                │
│  STEP PALETTE      │       CANVAS              │  STEP EDITOR   │
│                    │                           │  (conditional) │
│  [Drag steps       │   [Visual flowchart       │                │
│   from here]       │    of sequence]           │  [Edit selected│
│                    │                           │   step here]   │
│                    │                           │                │
│                    │                           │                │
├────────────────────┴───────────────────────────┴────────────────┤
│ [Step Palette collapsed to bottom bar on smaller screens]       │
└─────────────────────────────────────────────────────────────────┘

STATE MANAGEMENT:
- useSequence hook for loading/saving
- Local state for unsaved changes
- Dirty tracking for unsaved warning
- Auto-save option (debounced)

ROUTES:
- /follow-up/sequences/new - Create new
- /follow-up/sequences/:id - Edit existing
- /follow-up/sequences/:id/analytics - View analytics

ACTIONS:
- Save (explicit)
- Auto-save (if enabled)
- Test (open test modal)
- Publish (run validation, change status)
- Duplicate
- Export (as JSON)

MODES:
- Edit mode: Full editing (draft/paused sequences)
- View mode: Read-only (active/archived sequences)
- Analytics mode: Show performance data

RESPONSIVE:
- Desktop: Three-column layout
- Tablet: Collapsible panels
- Mobile: Stacked with navigation
```

---

## Prompt 3.8: Sequence Test Modal

```
OBJECTIVE: Create modal for testing sequences before publishing.

LOCATION: src/features/follow-up/components/SequenceBuilder/TestModal.tsx

PURPOSE:
Allow users to test their sequence with real or sample data
before going live.

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│ Test Sequence: Post-Scan Nurture                          [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ TEST RECIPIENT                                                   │
│ ○ Use sample data                                               │
│   Name: John Smith, Phone: 555-123-4567, Email: john@test.com   │
│ ○ Search existing recipient                                      │
│   [Search recipients...]                                        │
│ ○ Enter custom data                                             │
│   Name: [________] Phone: [________] Email: [________]          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ TEST OPTIONS                                                     │
│ ☑ Preview messages only (don't actually send)                   │
│ ☐ Send real messages to test recipient                          │
│ ☐ Skip delays (process all steps immediately)                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ PREVIEW                                                          │
│                                                                  │
│ Step 1: SMS (Immediate)                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Hi John! Thanks for scanning. Check out your exclusive      │ │
│ │ offer at example.com/john123. Reply STOP to opt out.        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Step 2: Wait 24 hours                                           │
│                                                                  │
│ Step 3: Email                                                    │
│ Subject: Your exclusive offer is waiting!                       │
│ [Preview Email Button]                                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Cancel]                                    [Run Test]          │
└─────────────────────────────────────────────────────────────────┘

LOGIC:
1. Preview Mode:
   - Render all templates with test data
   - Show what would be sent
   - No actual sending

2. Real Test Mode:
   - Create test enrollment
   - Send first message
   - Option to skip delays for faster testing
   - Track results

3. Validation:
   - Show any rendering errors
   - Warn about missing data
   - Check consent status if real test
```

---

## Prompt 3.9: Verify Phase 3 Completion

```
OBJECTIVE: Verify all Phase 3 UI components are complete.

PAGES:
□ SequenceListPage - List all sequences
□ SequenceBuilderPage - Main builder container

COMPONENTS:
□ Canvas - Visual flowchart editor
□ StepNode - Individual step display
□ StepPalette - Draggable step types
□ StepEditor - Side panel for editing
□ SettingsPanel - Sequence configuration
□ TemplateEditor - Message editor modal
□ TestModal - Testing interface

FEATURES TO TEST:
□ Create new sequence
□ Add steps of each type
□ Drag and drop reordering
□ Configure step timing
□ Edit templates
□ Preview with sample data
□ Save sequence
□ Publish sequence
□ Pause/resume
□ Archive
□ Duplicate

RESPONSIVE:
□ Works on desktop (1920px)
□ Works on laptop (1366px)
□ Works on tablet (768px)
□ Usable on mobile (375px)

ACCESSIBILITY:
□ Keyboard navigation
□ Screen reader friendly
□ Proper ARIA labels
□ Focus management

Report issues before Phase 4.
```

---

# PHASE 4: TWO-WAY CONVERSATIONS
**Duration:** 2 Weeks  
**Goal:** Enable reply handling and conversation management

---

## Prompt 4.1: Conversation Creation & Routing

```
OBJECTIVE: Create service for managing conversations from replies.

LOCATION: supabase/functions/handle-conversation-message/index.ts

INPUT:
{
  channel: 'sms' | 'email' | 'whatsapp'
  direction: 'inbound'
  senderContact: string (phone or email)
  content: string
  mediaUrls?: string[]
  providerMessageId: string
  metadata?: object
}

LOGIC:

1. IDENTIFY SENDER:
   - Find recipient by contact (phone/email)
   - If no match: create "unknown" conversation or ignore

2. FIND CONTEXT:
   - Look for active enrollment for this recipient
   - Look for recent executions (within 7 days)
   - Find existing open conversation

3. OPT-OUT CHECK:
   - If content matches opt-out keywords: route to opt-out handler
   - Do not create conversation

4. CREATE/UPDATE CONVERSATION:
   If no open conversation:
   - Create new conversation record
   - Link to enrollment if found
   - Set status: 'open'
   - Assign based on rules (or leave unassigned)
   
   If existing conversation:
   - Update last_message_at
   - Update status if was 'waiting_response'

5. CREATE MESSAGE RECORD:
   - Direction: inbound
   - Sender type: recipient
   - Content and media
   - Link to conversation

6. ROUTING DECISION:
   Check for auto-reply rules:
   - Keyword matches configured auto-responses
   - FAQ matches
   - Business hours check
   
   If auto-reply:
   - Generate and send response
   - Log as system message
   
   If agent needed:
   - Assign to agent/queue
   - Send notification
   - Update conversation status to 'waiting_agent'

7. LOG EVENT:
   - Type: 'reply_received'
   - Include context

OUTPUT:
{
  success: boolean
  conversation: conversation object
  message: message object
  action: 'auto_replied' | 'routed_to_agent' | 'queued'
}
```

---

## Prompt 4.2: Conversation Inbox Page

```
OBJECTIVE: Create unified inbox for managing conversations.

LOCATION: src/features/follow-up/pages/ConversationInboxPage.tsx

LAYOUT:
┌─────────────────────────────────────────────────────────────────────────┐
│  Conversations                                    [Filter ▼] [Search]   │
├───────────────────────┬─────────────────────────────────────────────────┤
│                       │                                                  │
│  MY INBOX (5)         │  John Smith                        📱 SMS       │
│  ─────────────        │  ─────────────────────────────────────────────  │
│  ┌─────────────────┐  │                                                  │
│  │ 🔵 John Smith   │  │  [Conversation thread here]                     │
│  │ "Yes I'm inter" │  │                                                  │
│  │ 2m • 📱 SMS     │  │                                                  │
│  └─────────────────┘  │                                                  │
│  ┌─────────────────┐  │  ─────────────────────────────────────────────  │
│  │ ○ Sarah Jones   │  │  [Reply input]                        [Send]    │
│  │ "What time..."  │  │                                                  │
│  │ 15m • 📧 Email  │  │  ─────────────────────────────────────────────  │
│  └─────────────────┘  │  Quick: [Info] [Schedule] [Transfer]            │
│                       │                                                  │
│  UNASSIGNED (12)      ├─────────────────────────────────────────────────┤
│  ─────────────        │  CONTEXT                                        │
│  ALL OPEN (23)        │  Recipient: John Smith                          │
│  ─────────────        │  Campaign: Summer Promo                         │
│  CLOSED (156)         │  Sequence: Post-Scan                            │
│  ─────────────        │  Step: 2 of 4                                   │
│                       │  [View Profile] [View Campaign]                 │
└───────────────────────┴─────────────────────────────────────────────────┘

FEATURES:

1. INBOX VIEWS:
   - My Inbox: Assigned to current user
   - Unassigned: No agent assigned
   - All Open: All open conversations
   - Closed: Historical conversations
   - Filter by channel, priority, date

2. CONVERSATION LIST:
   - Unread indicator
   - Last message preview
   - Time since last message
   - Channel icon
   - Priority indicator
   - Click to select

3. CONVERSATION THREAD:
   - Full message history
   - Message bubbles (left=recipient, right=outbound)
   - Timestamps
   - Delivery status
   - Media attachments
   - System messages (auto-replies, notes)

4. REPLY INPUT:
   - Text area
   - Channel selector (if multiple available)
   - Emoji picker
   - Attachment button
   - Send button
   - Character count (SMS)

5. QUICK REPLIES:
   - Configurable templates
   - One-click send
   - Keyboard shortcuts

6. CONTEXT PANEL:
   - Recipient info
   - Campaign/sequence context
   - Timeline of interactions
   - Notes
   - Tags
   - Actions: Transfer, Close, Mark Spam

7. REAL-TIME:
   - New message notifications
   - Typing indicators (future)
   - Auto-refresh or websocket
```

---

## Prompt 4.3: Send Conversation Reply

```
OBJECTIVE: Create function to send agent replies.

LOCATION: supabase/functions/send-conversation-reply/index.ts

INPUT:
{
  conversationId: UUID
  content: string
  channel?: 'sms' | 'email' | 'whatsapp' (default to conversation channel)
  mediaUrls?: string[]
  senderId: UUID (agent user ID)
}

LOGIC:

1. GET CONVERSATION:
   - Verify conversation exists
   - Get recipient contact info
   - Verify sender has permission

2. VALIDATE:
   - Check recipient not suppressed
   - Check consent for channel
   - Validate content length

3. SEND MESSAGE:
   Based on channel:
   - SMS: Use SMS provider
   - Email: Use email provider
   - WhatsApp: Use WhatsApp provider

4. CREATE MESSAGE RECORD:
   - Direction: outbound
   - Sender type: agent
   - Sender ID: agent user ID
   - Link to conversation

5. UPDATE CONVERSATION:
   - last_message_at: now
   - status: 'waiting_response' (waiting for recipient)

6. LOG:
   - Audit trail
   - Analytics event

OUTPUT:
{
  success: boolean
  message: message object
  error?: string
}

ALSO CREATE:
- Agent notification system
- Conversation assignment function
- Conversation close function
- Conversation transfer function
```

---

## Prompt 4.4: Auto-Reply Configuration

```
OBJECTIVE: Create system for automated conversation responses.

CREATE:

1. Database table: conversation_auto_replies
   - organization_id
   - name
   - trigger_type: 'keyword' | 'all' | 'after_hours' | 'first_message'
   - trigger_config: { keywords: [], schedule: {} }
   - response_template: string
   - channel: 'all' | 'sms' | 'email' | 'whatsapp'
   - is_active: boolean
   - priority: number (for ordering)

2. Edge function: evaluate-auto-reply

   Logic:
   a. Get all active auto-replies for organization
   b. Sort by priority
   c. For each rule:
      - Check channel matches
      - Check trigger conditions:
        * Keyword: message contains any keyword
        * All: always match
        * After hours: current time is outside business hours
        * First message: no previous messages in conversation
      - If match: render template and return
   d. Return first matching response or null

3. UI for managing auto-replies:
   - List page
   - Create/edit modal
   - Test interface
   - Priority drag-and-drop

COMMON AUTO-REPLIES:
- Out of office / after hours
- Thank you for your message
- FAQ responses
- Escalation confirmation
```

---

## Prompt 4.5: Conversation Analytics

```
OBJECTIVE: Create analytics for conversation performance.

METRICS TO TRACK:

1. Volume Metrics:
   - Total conversations
   - New conversations per day
   - Messages per conversation
   - Channel distribution

2. Response Metrics:
   - Average first response time
   - Average resolution time
   - Messages to resolution
   - Auto-reply rate

3. Agent Metrics:
   - Conversations per agent
   - Response time per agent
   - Resolution rate per agent
   - Customer satisfaction (if collected)

4. Outcome Metrics:
   - Conversations leading to conversion
   - Opt-outs from conversations
   - Escalations
   - Transfers

CREATE:

1. Database view: conversation_metrics
   - Aggregated conversation statistics
   - Filterable by date range, agent, channel

2. Dashboard component: ConversationAnalytics.tsx
   - Key metrics cards
   - Charts: volume over time, channel distribution
   - Agent leaderboard
   - Response time trends

3. Export function:
   - Conversation history export
   - Metrics export
   - Compliance reports
```

---

## Prompt 4.6: Verify Phase 4 Completion

```
OBJECTIVE: Verify all Phase 4 conversation features are complete.

EDGE FUNCTIONS:
□ handle-conversation-message
□ send-conversation-reply
□ evaluate-auto-reply
□ assign-conversation
□ close-conversation
□ transfer-conversation

UI COMPONENTS:
□ ConversationInboxPage
□ ConversationThread
□ ConversationList
□ ReplyComposer
□ ContextPanel
□ QuickReplies
□ AutoReplyManager

TEST SCENARIOS:

SMS Reply Flow:
1. Send SMS from sequence
2. Recipient replies
3. Verify conversation created
4. Reply from inbox
5. Verify recipient receives reply
6. Close conversation

Auto-Reply:
1. Configure auto-reply rule
2. Trigger with matching message
3. Verify auto-response sent
4. Verify logged correctly

Agent Assignment:
1. New conversation arrives
2. Assign to agent
3. Agent receives notification
4. Agent replies
5. Transfer to another agent
6. New agent sees history

Opt-Out via Reply:
1. Recipient replies STOP
2. Verify suppressed
3. Verify enrollments cancelled
4. Verify conversation marked appropriately

Report issues before Phase 5.
```

---

# PHASE 5: WHATSAPP CHANNEL
**Duration:** 2 Weeks  
**Goal:** Integrate WhatsApp Business API

---

## Prompt 5.1: WhatsApp Provider Setup

```
OBJECTIVE: Create WhatsApp Business API integration.

CONTEXT:
WhatsApp Business API has specific requirements:
- Must use pre-approved templates for initiating conversations
- 24-hour window for session messages after user interaction
- Templates must be approved by Meta

PROVIDER OPTIONS:
- Meta Cloud API (direct)
- Twilio for WhatsApp
- Infobip

CREATE: supabase/functions/_shared/whatsapp-provider.ts

FEATURES:

1. Configuration:
   - Fetch org WhatsApp settings
   - Phone number ID
   - Business account ID
   - Access token management

2. Template Message:
   - For initiating conversations
   - Send pre-approved template
   - Parameter substitution
   - Media attachments

3. Session Message:
   - For replies within 24-hour window
   - Free-form text
   - Media support
   - Interactive messages (buttons, lists)

4. Message Types:
   - Text
   - Image
   - Document
   - Video
   - Audio
   - Location
   - Contacts
   - Interactive (buttons, lists)
   - Template

5. Webhook Handling:
   - Message status updates
   - Incoming messages
   - Error notifications

INTERFACE:
sendWhatsAppTemplate(phoneNumber, templateName, parameters, options)
sendWhatsAppMessage(phoneNumber, content, type, options)
handleWhatsAppWebhook(payload)
```

---

## Prompt 5.2: WhatsApp Template Management

```
OBJECTIVE: Create UI for managing WhatsApp message templates.

CONTEXT:
- Templates must be submitted to Meta for approval
- Categories: Marketing, Utility, Authentication
- Can include: header, body, footer, buttons
- Parameters marked with {{1}}, {{2}}, etc.

CREATE:

1. Database table: whatsapp_templates
   - organization_id
   - template_name (unique per org)
   - category: 'marketing' | 'utility' | 'authentication'
   - language: ISO code
   - status: 'pending' | 'approved' | 'rejected'
   - components: JSONB (header, body, footer, buttons)
   - meta_template_id: string (from Meta)
   - rejection_reason: string
   - submitted_at, approved_at

2. Edge function: submit-whatsapp-template
   - Validate template structure
   - Submit to Meta via API
   - Store pending status
   - Handle response

3. Edge function: sync-whatsapp-templates
   - Fetch current templates from Meta
   - Update local status
   - Can be called manually or on schedule

4. UI: WhatsAppTemplateManager.tsx
   - List all templates with status
   - Create new template form
   - Preview template
   - Submit for approval
   - Sync status button
   - Delete template

TEMPLATE STRUCTURE:
{
  name: "order_confirmation",
  category: "utility",
  language: "en_US",
  components: [
    { type: "header", format: "text", text: "Order Confirmed" },
    { type: "body", text: "Hi {{1}}, your order {{2}} is confirmed." },
    { type: "footer", text: "Thanks for your business!" },
    { type: "buttons", buttons: [
      { type: "url", text: "Track Order", url: "https://..." }
    ]}
  ]
}
```

---

## Prompt 5.3: Send Follow-Up WhatsApp

```
OBJECTIVE: Create edge function for sending WhatsApp in sequences.

LOCATION: supabase/functions/send-follow-up-whatsapp/index.ts

INPUT:
{
  executionId: UUID
  enrollmentId: UUID
  recipientId: UUID
  recipientPhone: string
  sequenceId: UUID
  stepNumber: number
  templateName: string
  templateParameters: string[]
  mediaUrl?: string
}

LOGIC:

1. FORMAT PHONE:
   - Convert to WhatsApp format (no + prefix)
   - Validate number

2. CONSENT CHECK:
   - Verify WhatsApp consent
   - Check suppression

3. GET TEMPLATE:
   - Fetch template details
   - Verify template is approved
   - Verify parameter count matches

4. SEND MESSAGE:
   - Use whatsapp-provider
   - Include tracking metadata
   - Handle errors

5. UPDATE RECORDS:
   - Execution status
   - Delivery timestamps
   - Cost tracking

6. LOG EVENT

SPECIAL CONSIDERATIONS:
- If within 24-hour window from user message: can send session message
- Otherwise: must use template
- Template messages cost more than session messages
- Track message type for cost attribution
```

---

## Prompt 5.4: WhatsApp Webhook Handler

```
OBJECTIVE: Handle incoming WhatsApp webhooks.

LOCATION: supabase/functions/webhook-whatsapp/index.ts

WEBHOOK TYPES:

1. MESSAGE STATUS:
   - sent, delivered, read, failed
   - Update execution record
   - Log event

2. INCOMING MESSAGE:
   - User replies
   - User-initiated messages
   - Route to conversation handler
   - Check for opt-out keywords
   - Start 24-hour session window

3. TEMPLATE STATUS:
   - Template approved/rejected
   - Update template record
   - Notify admin

VERIFICATION:
- Meta requires webhook verification (GET request)
- Return hub.challenge for verification
- Verify webhook signature for POST

PAYLOAD HANDLING:
Meta sends complex nested payload:
{
  object: "whatsapp_business_account",
  entry: [{
    changes: [{
      value: {
        messages: [...],
        statuses: [...]
      }
    }]
  }]
}

Parse and route appropriately.
```

---

## Prompt 5.5: WhatsApp UI Integration

```
OBJECTIVE: Integrate WhatsApp into sequence builder and inbox.

UPDATES NEEDED:

1. Sequence Builder:
   - Add WhatsApp to step palette
   - Step configuration:
     * Template selector (only approved templates)
     * Parameter mapping to variables
     * Preview with sample data
   - Validation: template must be approved

2. Template Editor:
   - WhatsApp mode
   - Component editor (header, body, footer, buttons)
   - Parameter insertion
   - Preview in phone mockup
   - Submit for approval button
   - Status indicator

3. Conversation Inbox:
   - WhatsApp channel indicator
   - Rich message display (images, documents, etc.)
   - Interactive message rendering
   - Session window indicator (time remaining)
   - Template vs session message selector for replies

4. Analytics:
   - WhatsApp metrics
   - Delivery rates
   - Read rates
   - Cost tracking

5. Settings:
   - WhatsApp configuration page
   - Phone number setup
   - Business profile
   - Template management link
```

---

## Prompt 5.6: Verify Phase 5 Completion

```
OBJECTIVE: Verify WhatsApp integration is complete.

PREREQUISITES:
□ Meta Business Account set up
□ WhatsApp Business API access
□ Phone number verified
□ At least one template approved

EDGE FUNCTIONS:
□ _shared/whatsapp-provider.ts
□ send-follow-up-whatsapp
□ webhook-whatsapp
□ submit-whatsapp-template
□ sync-whatsapp-templates

UI COMPONENTS:
□ WhatsAppTemplateManager
□ WhatsApp step in sequence builder
□ WhatsApp in conversation inbox

TEST SCENARIOS:

Template Flow:
1. Create template in UI
2. Submit for approval
3. Wait for Meta approval (or use test template)
4. Sync status

Sequence with WhatsApp:
1. Create sequence with WhatsApp step
2. Configure template and parameters
3. Publish sequence
4. Enroll recipient
5. Verify message sent
6. Check delivery status via webhook

Reply Handling:
1. Recipient replies on WhatsApp
2. Verify conversation created
3. Reply from inbox (within 24hr)
4. Verify session message sent

Note: Full testing requires Meta approval, which can take 24-48 hours.
Use test phone numbers for development.

Report issues before Phase 6.
```

---

# PHASE 6: VOICE CHANNEL
**Duration:** 2 Weeks  
**Goal:** Add automated voice call capability

---

## Prompt 6.1: Voice Provider Setup

```
OBJECTIVE: Create voice call provider integration.

PROVIDER: Twilio Voice (primary)

CREATE: supabase/functions/_shared/voice-provider.ts

FEATURES:

1. Outbound Call:
   - Initiate call to phone number
   - Play TTS message
   - Play pre-recorded audio
   - IVR menu handling
   - Call recording (with consent)

2. TwiML Generation:
   - Generate TwiML for call flow
   - Say (TTS)
   - Play (audio file)
   - Gather (collect input)
   - Record (record caller)
   - Dial (transfer)
   - Hangup

3. Voice Options:
   - Voice selection (Polly voices)
   - Language
   - Speed
   - SSML support

4. Call Status:
   - Track: initiated, ringing, in-progress, completed, failed, busy, no-answer
   - Duration
   - Outcome

INTERFACE:
initiateCall(phoneNumber, callScript, options)
generateTwiML(steps)
handleCallStatus(payload)
handleGatherInput(payload)
```

---

## Prompt 6.2: Voice Call Script System

```
OBJECTIVE: Create system for designing voice call scripts.

CONCEPT:
Voice "scripts" define what happens during a call:
- Greetings
- Messages
- Menus (press 1 for X)
- Responses to input
- Transfers
- Recordings

CREATE:

1. Database structure for voice templates:
   - Script name
   - Steps array (ordered)
   - Each step: {
       type: 'say' | 'play' | 'gather' | 'record' | 'dial' | 'pause'
       config: type-specific configuration
     }

2. Script Step Types:

   SAY:
   - Text to speak
   - Voice selection
   - Language
   - SSML option

   PLAY:
   - Audio file URL
   - Loop count

   GATHER:
   - Prompt (say or play)
   - Number of digits expected
   - Timeout
   - Actions for each input (1, 2, 3, etc.)

   RECORD:
   - Prompt before recording
   - Max duration
   - Transcribe option

   DIAL:
   - Number to transfer to
   - Timeout
   - Caller ID

   PAUSE:
   - Duration

3. Script Execution Logic:
   - Start call with TwiML URL
   - URL serves initial TwiML
   - Gather inputs callback to new TwiML
   - Chain steps together

4. Example Script:
   "greeting" → SAY: "Hi, this is a call from Acme Corp"
   → SAY: "We have an exclusive offer for you"
   → GATHER: "Press 1 to hear more, press 2 to opt out"
     → 1: SAY: "Great! You'll receive details via text"
     → 2: SAY: "You've been removed from our list"
   → SAY: "Thank you, goodbye"
   → HANGUP
```

---

## Prompt 6.3: Send Follow-Up Voice Call

```
OBJECTIVE: Create edge function for voice calls in sequences.

LOCATION: supabase/functions/send-follow-up-voice/index.ts

INPUT:
{
  executionId: UUID
  enrollmentId: UUID
  recipientId: UUID
  recipientPhone: string
  sequenceId: UUID
  stepNumber: number
  scriptId: UUID
  scriptVariables: Record<string, string>
}

LOGIC:

1. CONSENT CHECK:
   - Verify voice consent
   - Check suppression
   - Check time of day restrictions

2. GET SCRIPT:
   - Fetch voice template
   - Render variables in script text

3. INITIATE CALL:
   - Generate callback URL with execution ID
   - Call voice provider
   - Handle immediate failures

4. CALLBACK URL:
   - Points to voice-call-handler function
   - Includes execution ID for context

5. UPDATE EXECUTION:
   - Status: calling (while in progress)
   - Will be updated by status webhook

6. SPECIAL HANDLING:
   - Voicemail detection
   - If voicemail: play alternate message
   - Retry logic for busy/no-answer
```

---

## Prompt 6.4: Voice Call Handler

```
OBJECTIVE: Handle voice call events and interactions.

LOCATION: supabase/functions/voice-call-handler/index.ts

ENDPOINTS:

1. /initial - Serve initial TwiML
   - Get execution context
   - Load script
   - Generate TwiML for first step
   - Return TwiML response

2. /gather - Handle user input
   - Get digits pressed
   - Look up script action for input
   - Generate next TwiML
   - Record input in execution

3. /status - Handle call status updates
   - Update execution status
   - Record duration
   - Handle outcomes (completed, failed, etc.)

4. /recording - Handle recording completion
   - Store recording URL
   - Transcribe if requested
   - Update execution

TWIML GENERATION:
For each script step type, generate appropriate TwiML:

SAY:
<Say voice="Polly.Amy">Hello {{first_name}}</Say>

PLAY:
<Play>https://example.com/audio.mp3</Play>

GATHER:
<Gather numDigits="1" action="/gather?eid=xxx">
  <Say>Press 1 for yes, 2 for no</Say>
</Gather>

RECORD:
<Record maxLength="60" action="/recording?eid=xxx" />
```

---

## Prompt 6.5: Voice UI Integration

```
OBJECTIVE: Integrate voice calls into sequence builder.

UPDATES:

1. Sequence Builder - Voice Step:
   - Add voice to step palette
   - Configuration panel:
     * Script selector
     * Or inline script builder
     * Variable mapping
     * Voicemail handling
     * Retry settings

2. Voice Script Editor:
   - Visual flow builder for call script
   - Step types with configuration
   - Audio file upload
   - TTS preview (play button)
   - Test call button

3. Call Preview:
   - Visual representation of call flow
   - Play TTS audio
   - Show branching paths

4. Analytics:
   - Call metrics
   - Answer rate
   - Completion rate
   - Average duration
   - Input distribution (for gathers)

5. Settings:
   - Voice configuration page
   - Twilio credentials
   - Default voice settings
   - Caller ID configuration
```

---

## Prompt 6.6: Verify Phase 6 Completion

```
OBJECTIVE: Verify voice channel is complete.

PREREQUISITES:
□ Twilio account with Voice capability
□ Phone number for outbound calls
□ Webhook URLs accessible

EDGE FUNCTIONS:
□ _shared/voice-provider.ts
□ send-follow-up-voice
□ voice-call-handler (/initial, /gather, /status, /recording)

UI COMPONENTS:
□ Voice step in sequence builder
□ Voice script editor
□ Call preview
□ Voice analytics

TEST SCENARIOS:

Basic Call:
1. Create simple voice script (greeting only)
2. Create sequence with voice step
3. Publish and enroll
4. Verify call initiated
5. Answer call, hear message
6. Verify status updated

IVR Call:
1. Create script with gather step
2. Test with different inputs
3. Verify correct branch taken
4. Verify input recorded

Voicemail:
1. Call number that goes to voicemail
2. Verify voicemail message plays
3. Verify recorded as voicemail outcome

Failed Call:
1. Call invalid number
2. Verify error handled
3. Verify retry logic (if configured)

Report issues before Phase 7.
```

---

# PHASE 7: EMAIL DESIGNER
**Duration:** 2 Weeks  
**Goal:** Create drag-and-drop email builder

---

## Prompt 7.1: Email Designer Architecture

```
OBJECTIVE: Design the drag-and-drop email builder system.

CONCEPT:
Visual email builder where users drag blocks to create emails,
similar to Mailchimp, Klaviyo, or Unlayer.

ARCHITECTURE:

1. Block System:
   - Emails composed of blocks
   - Each block is a component
   - Blocks are stacked vertically
   - Blocks have properties (editable)

2. Block Types:
   STRUCTURAL:
   - Container (wrapper)
   - Columns (1, 2, 3, 4 column layouts)
   - Divider
   - Spacer

   CONTENT:
   - Text (rich text editor)
   - Image (upload or URL)
   - Button (link button)
   - Social (social media icons)
   - Video (embedded video)
   - HTML (custom code)

   SPECIALIZED:
   - Header (logo + nav)
   - Footer (address + unsubscribe)
   - Hero (image + text overlay)
   - Product (image + title + price + button)

3. Design JSON Structure:
   {
     version: 1,
     settings: {
       backgroundColor: "#ffffff",
       width: 600,
       fontFamily: "Arial",
       defaultTextColor: "#333333"
     },
     blocks: [
       {
         id: "block-1",
         type: "header",
         props: {
           logoUrl: "...",
           backgroundColor: "#f0f0f0"
         }
       },
       {
         id: "block-2",
         type: "text",
         props: {
           content: "<p>Hello {{first_name}}</p>",
           padding: 20
         }
       }
       // ... more blocks
     ]
   }

4. Rendering:
   - Design JSON → React preview
   - Design JSON → Email HTML (for sending)
   - Must generate compatible HTML (tables, inline styles)
```

---

## Prompt 7.2: Email Designer - Block Components

```
OBJECTIVE: Create individual block components for the email designer.

LOCATION: src/features/follow-up/components/EmailDesigner/blocks/

CREATE BLOCKS:

1. TextBlock:
   Props: content (HTML), textAlign, fontSize, textColor, backgroundColor, padding
   Features: Rich text editor (bold, italic, links, lists)
   Variable support: {{first_name}}, etc.

2. ImageBlock:
   Props: src, alt, width, align, linkUrl, borderRadius
   Features: Upload or URL, responsive sizing

3. ButtonBlock:
   Props: text, url, backgroundColor, textColor, borderRadius, align, padding
   Features: Customizable styling, link tracking

4. DividerBlock:
   Props: color, thickness, style (solid, dashed, dotted), margin

5. SpacerBlock:
   Props: height

6. ColumnsBlock:
   Props: columns (2, 3, 4), columnWidths, gap, verticalAlign
   Features: Each column can contain other blocks (nested)

7. HeaderBlock:
   Props: logoUrl, logoAlt, backgroundColor, links
   Features: Pre-styled header with logo

8. FooterBlock:
   Props: companyName, address, unsubscribeText, socialLinks
   Features: Auto-includes required elements (address, unsubscribe)

9. HeroBlock:
   Props: backgroundImage, overlayColor, headline, subheadline, buttonText, buttonUrl
   Features: Eye-catching banner

10. SocialBlock:
    Props: networks (facebook, twitter, instagram, linkedin), iconStyle, align
    Features: Social media icon links

11. VideoBlock:
    Props: videoUrl (YouTube, Vimeo), thumbnailUrl, playButtonStyle
    Features: Video thumbnail with play button (links to video)

12. HtmlBlock:
    Props: html
    Features: Custom HTML for advanced users

EACH BLOCK NEEDS:
- Editor component (for builder)
- Preview component (for preview)
- Render function (to email HTML)
- Default props
- Property schema (for editor panel)
```

---

## Prompt 7.3: Email Designer - Canvas & Editor

```
OBJECTIVE: Create the main email designer interface.

LOCATION: src/features/follow-up/components/EmailDesigner/

COMPONENTS:

1. EmailDesigner.tsx (main container)
   - Manages design state (blocks array)
   - Undo/redo history
   - Save/load design
   - Export HTML

2. BlockPalette.tsx
   - List of available block types
   - Drag to canvas to add
   - Grouped by category

3. DesignCanvas.tsx
   - Visual representation of email
   - Drop zone for blocks
   - Drag to reorder
   - Click to select
   - Block toolbar (move up, down, duplicate, delete)
   - Width constrained (600px typical)

4. PropertyPanel.tsx
   - Shows when block selected
   - Dynamic form based on block type
   - Color pickers, inputs, toggles
   - Real-time preview updates

5. EmailPreview.tsx
   - Toggle desktop/mobile view
   - Render design as email HTML
   - Sample data for variables

6. DesignSettings.tsx
   - Global email settings
   - Background color
   - Default font
   - Link colors
   - Width

STATE MANAGEMENT:
- Use React context or Zustand
- Design state: { settings, blocks }
- Selection state: selectedBlockId
- History state: past, present, future (for undo/redo)

INTERACTIONS:
- Drag from palette to canvas: add block
- Drag within canvas: reorder
- Click block: select for editing
- Double-click text: inline editing
- Delete key: remove selected
- Ctrl+Z: undo
- Ctrl+Shift+Z: redo
- Ctrl+D: duplicate
```

---

## Prompt 7.4: Email HTML Renderer

```
OBJECTIVE: Convert design JSON to email-compatible HTML.

CONTEXT:
Email HTML has strict requirements:
- Table-based layout
- Inline styles only
- No external stylesheets
- No JavaScript
- Limited CSS support
- Must work in Outlook, Gmail, Apple Mail, etc.

CREATE: src/features/follow-up/utils/emailRenderer.ts

FUNCTION: renderEmailHtml(design: EmailDesign): string

LOGIC:

1. WRAPPER:
   - DOCTYPE
   - HTML with xmlns for Outlook
   - Head with meta tags
   - Body with center table

2. CONTAINER TABLE:
   - Centered table
   - Max width from settings
   - Background color

3. FOR EACH BLOCK:
   - Render to table row
   - Apply inline styles
   - Handle block-specific rendering

4. STYLES:
   - All CSS must be inline
   - Use style attribute
   - No CSS classes

5. RESPONSIVE:
   - Media queries in <style> tag (limited support)
   - Fluid images
   - Stacked columns on mobile

6. OUTLOOK HACKS:
   - Conditional comments for Outlook
   - VML for backgrounds
   - MSO-specific fixes

7. REQUIRED ELEMENTS:
   - Unsubscribe link
   - Physical address
   - View in browser link (optional)

OUTPUT:
Complete HTML string ready for email sending

ALSO CREATE:
- Plain text generator (strip HTML, format nicely)
- Preview renderer (for canvas, less strict)
```

---

## Prompt 7.5: Email Template Library

```
OBJECTIVE: Create system for email template library.

FEATURES:

1. Pre-built Templates:
   - Welcome email
   - Promotional offer
   - Event invitation
   - Newsletter
   - Transactional (order confirmation, etc.)
   - Re-engagement
   - Survey/feedback request

2. User Templates:
   - Save current design as template
   - Name and categorize
   - Share with organization
   - Duplicate and modify

3. Template Browser:
   - Grid view with previews
   - Filter by category
   - Search
   - Click to preview full size
   - "Use This Template" button

CREATE:

1. Database table: email_template_library
   - organization_id (null for system templates)
   - name
   - category
   - description
   - thumbnail_url
   - design_json
   - is_public (for org-wide sharing)
   - created_by
   - usage_count

2. UI: TemplateLibrary.tsx
   - Modal or page
   - Template grid
   - Preview modal
   - Apply template action

3. Save as Template:
   - Button in designer
   - Modal for name/category
   - Generate thumbnail
   - Save to library
```

---

## Prompt 7.6: Verify Phase 7 Completion

```
OBJECTIVE: Verify email designer is complete.

COMPONENTS:
□ EmailDesigner container
□ BlockPalette
□ DesignCanvas
□ PropertyPanel
□ EmailPreview
□ All block types (12+)

UTILITIES:
□ Email HTML renderer
□ Plain text generator
□ Design JSON schema

FEATURES:
□ Template library

TEST SCENARIOS:

Block Operations:
1. Add each block type
2. Configure block properties
3. Reorder blocks
4. Delete blocks
5. Duplicate blocks

Layout:
1. Create 2-column layout
2. Add content to each column
3. Preview at different widths

Variables:
1. Insert personalization variable
2. Preview with sample data
3. Verify renders correctly

Export:
1. Design complete email
2. Export as HTML
3. Test in Litmus or Email on Acid
4. Verify Outlook rendering
5. Verify Gmail rendering
6. Verify mobile rendering

Templates:
1. Start from template
2. Modify design
3. Save as new template
4. Find and use saved template

Integration:
1. Create email in sequence builder
2. Open in full designer
3. Save and return
4. Verify saved correctly

Report issues before Phase 8.
```

---

# PHASE 8: ADVANCED FEATURES
**Duration:** 3 Weeks  
**Goal:** A/B testing, gift cards, attribution

---

## Prompt 8.1: A/B Testing System

```
OBJECTIVE: Create A/B testing capability for sequences.

CONCEPT:
- Test message variants at any step
- Test timing variants
- Test channel variants
- Track performance and determine winner

CREATE:

1. Database updates:
   - Add ab_test_config to follow_up_steps
   - Create ab_test_results table

2. A/B Test Configuration:
   {
     enabled: true,
     testType: 'content' | 'timing' | 'channel',
     variants: [
       { id: 'A', name: 'Control', weight: 50, config: {...} },
       { id: 'B', name: 'Variant B', weight: 50, config: {...} }
     ],
     successMetric: 'open_rate' | 'click_rate' | 'conversion_rate',
     minimumSampleSize: 100,
     confidenceLevel: 0.95,
     autoSelectWinner: true
   }

3. Variant Assignment Logic (in enrollment):
   - Generate random number
   - Assign variant based on weights
   - Store variant ID in enrollment
   - Ensure consistent variant throughout sequence

4. Result Tracking:
   - Track metric per variant
   - Calculate statistical significance
   - Use chi-squared test for proportions
   - Determine winner when significant

5. Auto-Winner Selection:
   - When sample size reached AND
   - When confidence level achieved
   - Disable losing variants
   - Notify creator

6. UI Components:
   - A/B test toggle in step editor
   - Variant editor (add/edit variants)
   - Results dashboard
   - Winner selection UI
```

---

## Prompt 8.2: A/B Testing Analytics

```
OBJECTIVE: Create analytics and reporting for A/B tests.

METRICS TO TRACK:

Per Variant:
- Sample size (enrollments)
- Messages sent
- Deliveries
- Opens (email)
- Clicks
- Replies
- Conversions

Calculated:
- Open rate
- Click rate
- Conversion rate
- Statistical significance
- Confidence interval

CREATE:

1. Database view: ab_test_performance
   - Aggregate metrics per variant
   - Calculate rates
   - Include confidence intervals

2. Statistical Functions:
   - Chi-squared test for significance
   - Calculate p-value
   - Determine winner

3. UI: ABTestResults.tsx
   Layout:
   ┌──────────────────────────────────────────┐
   │ A/B Test: Step 2 - Email Subject         │
   ├──────────────────────────────────────────┤
   │                                          │
   │  VARIANT A (Control)    VARIANT B        │
   │  "Exclusive offer"      "Your deal"      │
   │                                          │
   │  Sent: 534              Sent: 521        │
   │  Opens: 187 (35%)       Opens: 224 (43%) │
   │  Clicks: 45 (8.4%)      Clicks: 67 (13%) │
   │                                          │
   │  📊 Variant B is winning                 │
   │  Confidence: 94.2%                       │
   │  Need ~50 more samples for significance  │
   │                                          │
   │  [View Details] [Declare Winner]         │
   └──────────────────────────────────────────┘

4. Actions:
   - Declare winner manually
   - Pause test
   - Extend test
   - Export results
```

---

## Prompt 8.3: Gift Card Integration

```
OBJECTIVE: Integrate gift card provisioning into sequences.

CONTEXT:
- Existing system: provision-gift-card-unified function
- Can provision cards from various brands
- Need to trigger from sequence step

CREATE:

1. Gift Card Step Type:
   Configuration:
   - Brand selection (from available brands)
   - Denomination (fixed or dynamic)
   - Delivery method:
     * Include in next message (populate variable)
     * Send separately (immediate SMS/email)
   - Budget limit per sequence
   - Fallback if provisioning fails

2. Step Execution Logic:
   When gift card step executes:
   a. Check budget limit not exceeded
   b. Call provision-gift-card-unified
   c. If success:
      - Store card details in execution metadata
      - Populate template variables:
        * {{gift_card_code}}
        * {{gift_card_value}}
        * {{gift_card_brand}}
        * {{gift_card_expiration}}
      - If immediate delivery: send now
      - If next message: store for template rendering
   d. If failure:
      - Log error
      - Execute fallback (skip, retry, notify)

3. Budget Tracking:
   - Track cards provisioned per sequence
   - Track total value
   - Alert when approaching limit
   - Pause sequence if exceeded

4. UI Updates:
   - Gift card step in palette
   - Configuration panel:
     * Brand dropdown
     * Denomination input
     * Delivery method selector
     * Budget settings
   - Preview shows card details placeholder
```

---

## Prompt 8.4: Revenue Attribution System

```
OBJECTIVE: Create multi-touch attribution for revenue tracking.

CONCEPT:
Track all touchpoints in customer journey and attribute
conversions/revenue to the appropriate sources.

CREATE:

1. Touchpoint Tracking:
   Record every interaction:
   - Mail piece sent/delivered
   - QR code scanned
   - PURL visited
   - Form viewed/submitted
   - SMS sent/clicked
   - Email sent/opened/clicked
   - WhatsApp sent/read
   - Voice call completed
   - Gift card sent/redeemed

2. Conversion Events:
   Define what counts as conversion:
   - Form submission
   - Gift card redemption
   - Purchase (via webhook)
   - Custom event (via API)

3. Attribution Models:
   
   FIRST TOUCH:
   - 100% credit to first interaction
   - Good for: awareness campaigns
   
   LAST TOUCH:
   - 100% credit to final interaction
   - Good for: conversion focus
   
   LINEAR:
   - Equal credit to all touchpoints
   - Good for: complex journeys
   
   TIME DECAY:
   - More credit to recent touchpoints
   - Decay formula: exponential
   
   POSITION BASED (U-shaped):
   - 40% first, 40% last, 20% middle
   - Good for: balanced view
   
   CUSTOM:
   - Configurable weights per touchpoint type

4. Database Tables:
   
   attribution_touchpoints:
   - recipient_id
   - touchpoint_type
   - source (campaign, sequence, etc.)
   - timestamp
   - metadata
   
   conversion_events:
   - recipient_id
   - conversion_type
   - value
   - timestamp
   - attributed (boolean)
   
   revenue_attribution:
   - conversion_id
   - touchpoint_id
   - model_used
   - attributed_value
   - percentage

5. Attribution Calculation:
   - Triggered on conversion event
   - Find all touchpoints within attribution window
   - Apply selected model
   - Store attribution records

6. Reporting:
   - Revenue by channel
   - Revenue by sequence
   - Revenue by campaign
   - ROI calculations
   - Comparison of attribution models
```

---

## Prompt 8.5: Attribution Dashboard

```
OBJECTIVE: Create dashboard for viewing attribution data.

LOCATION: src/features/follow-up/pages/AttributionDashboard.tsx

LAYOUT:
┌─────────────────────────────────────────────────────────────────┐
│  Revenue Attribution                        [Date Range] [Model]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TOTAL ATTRIBUTED REVENUE          CONVERSIONS                  │
│  $128,456                          1,234                        │
│  +23% vs previous period           +18% vs previous period      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BY CHANNEL                        BY SEQUENCE                  │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │ Email      $45,234   │         │ Post-Scan    $52,345 │     │
│  │ SMS        $38,123   │         │ Form Follow  $34,567 │     │
│  │ Direct Mail$28,567   │         │ Re-engage    $21,234 │     │
│  │ WhatsApp   $12,345   │         │ Welcome      $12,345 │     │
│  │ Voice      $ 4,187   │         │ Other        $ 7,965 │     │
│  └──────────────────────┘         └──────────────────────┘     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ATTRIBUTION PATH ANALYSIS                                       │
│                                                                  │
│  Most Common Paths:                                              │
│  1. Mail → QR Scan → SMS → Email → Convert (34%)                │
│  2. Mail → PURL → Form → Convert (28%)                          │
│  3. Mail → QR Scan → SMS → Convert (18%)                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  MODEL COMPARISON                                                │
│                                                                  │
│  Touchpoint       First    Last    Linear   Time     Position   │
│  ─────────────────────────────────────────────────────────────  │
│  Direct Mail      $45K     $12K    $28K     $18K     $35K       │
│  SMS              $32K     $48K    $35K     $42K     $38K       │
│  Email            $28K     $35K    $30K     $33K     $32K       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

FEATURES:
- Date range selector
- Attribution model selector
- Drill-down by clicking charts
- Export to CSV
- Compare periods
- Filter by client/campaign
```

---

## Prompt 8.6: Verify Phase 8 Completion

```
OBJECTIVE: Verify advanced features are complete.

A/B TESTING:
□ A/B configuration in step editor
□ Variant assignment in enrollment
□ Metric tracking per variant
□ Statistical significance calculation
□ Winner detection
□ Results dashboard
□ Manual winner selection

GIFT CARD INTEGRATION:
□ Gift card step type
□ Brand and denomination config
□ Provisioning integration
□ Template variable population
□ Budget tracking
□ Fallback handling

REVENUE ATTRIBUTION:
□ Touchpoint tracking
□ Conversion event handling
□ Attribution models (5 types)
□ Attribution calculation
□ Attribution dashboard
□ Model comparison

TEST SCENARIOS:

A/B Test:
1. Create step with A/B test
2. Run sequence with test recipients
3. Generate engagement
4. View results dashboard
5. Verify statistical calculations
6. Declare winner

Gift Card:
1. Create sequence with gift card step
2. Run sequence
3. Verify card provisioned
4. Verify card details in message
5. Test budget limit

Attribution:
1. Create multi-touch journey
2. Generate conversion
3. View attribution
4. Compare models
5. Export report

Report issues before Phase 9.
```

---

# PHASE 9: AI & OPTIMIZATION
**Duration:** 3 Weeks  
**Goal:** AI-powered send time and personalization

---

## Prompt 9.1: Send Time Optimization Model

```
OBJECTIVE: Create AI-powered send time optimization.

CONCEPT:
Analyze historical engagement data to determine optimal send
time for each recipient, maximizing open/click rates.

DATA COLLECTION:

1. Engagement Events:
   - Message sent timestamp
   - Open timestamp (email)
   - Click timestamp
   - Reply timestamp
   - Recipient ID
   - Channel
   - Day of week
   - Hour of day
   - Timezone

2. Recipient Attributes:
   - Timezone
   - Historical engagement times
   - Engagement frequency
   - Preferred channel

MODEL APPROACH:

Option A: Rule-Based (simpler):
1. Aggregate engagement by hour for each recipient
2. Find hours with highest engagement rate
3. Cluster recipients with similar patterns
4. For new recipients, use cluster default

Option B: ML-Based (advanced):
1. Train model on engagement data
2. Features: hour, day, recipient attributes
3. Predict engagement probability
4. Select hour with highest prediction

IMPLEMENTATION:

1. Database table: recipient_engagement_patterns
   - recipient_id
   - hour_of_day
   - day_of_week
   - engagement_count
   - total_messages
   - engagement_rate
   - last_updated

2. Function: calculate_optimal_send_time
   Input: recipient_id, channel, sequence_settings
   Logic:
   a. Get recipient's engagement pattern
   b. If not enough data: use aggregate pattern
   c. Find highest engagement hours within send window
   d. Return optimal timestamp
   Output: suggested_send_time

3. Integration:
   - When scheduling step, if AI enabled:
   - Calculate optimal time
   - Adjust scheduled time within send window
   - Log AI decision

4. Learning:
   - After each engagement, update patterns
   - Recalculate periodically
   - Improve predictions over time
```

---

## Prompt 9.2: Send Time Optimization UI

```
OBJECTIVE: Create UI for configuring and viewing send time optimization.

COMPONENTS:

1. Sequence Settings:
   - Toggle: Enable AI send time optimization
   - Scope: Per step or whole sequence
   - Fallback: What to use if no data

2. Step Preview:
   - Show predicted optimal time
   - Show confidence level
   - Compare to scheduled time

3. Analytics:
   - Engagement by hour chart
   - AI vs non-AI comparison
   - Lift from optimization

4. Recipient Profile:
   - Show individual's engagement pattern
   - Heat map: day × hour
   - Trend over time

CREATE:

1. SendTimeSettings.tsx
   - Toggle and configuration
   - Explanation of how it works

2. OptimalTimePreview.tsx
   - Shows in step editor
   - Predicted time for sample recipient
   - "The AI suggests sending at 10:30 AM based on..."

3. SendTimeAnalytics.tsx
   - Performance comparison
   - Engagement heat maps
   - Recommendations

4. RecipientEngagementHeatmap.tsx
   - 7×24 grid (days × hours)
   - Color intensity = engagement rate
   - Tooltip with details
```

---

## Prompt 9.3: Real-Time Personalization

```
OBJECTIVE: Enable dynamic content based on external data sources.

CONCEPT:
Fetch data from external APIs at send time to personalize
messages with current information.

USE CASES:
- Weather-based content
- Inventory/stock status
- Location-based offers
- Real-time pricing
- Personalized recommendations
- Live event data

CREATE:

1. Database table: external_data_sources
   - organization_id
   - name
   - endpoint_url
   - authentication (credentials, headers)
   - cache_duration (seconds)
   - variable_mapping (JSON path → variable name)
   - is_active
   - last_used, last_error

2. Template variables format:
   {{external.weather.current}}
   {{external.inventory.product_123.status}}
   {{external.recommendation.top_product}}

3. Function: resolve_external_variables
   Input: variables_used, recipient_data
   Logic:
   a. Parse variable names
   b. For each external variable:
      - Get data source config
      - Check cache (by recipient + source)
      - If cached and valid: return cached
      - If not: fetch from API
      - Parse response with JSON path
      - Cache result
      - Return value
   c. Return resolved variables

4. Error handling:
   - API timeout: use fallback value
   - API error: use fallback or skip
   - Missing data: use fallback
   - Log all errors

5. Performance:
   - Aggressive caching
   - Parallel fetches
   - Timeout limits (2 sec max)
   - Circuit breaker for failing APIs
```

---

## Prompt 9.4: External Data Source Manager

```
OBJECTIVE: Create UI for managing external data sources.

LOCATION: src/features/follow-up/pages/ExternalDataSourcesPage.tsx

FEATURES:

1. Data Source List:
   - Name
   - Endpoint
   - Status (active, error, disabled)
   - Last used
   - Cache duration
   - Actions: Edit, Test, Disable

2. Create/Edit Modal:
   Fields:
   - Name
   - API Endpoint URL
   - Method (GET/POST)
   - Authentication type (None, API Key, Bearer, Basic)
   - Credentials
   - Headers
   - Request body template (for POST)
   - Variable mapping:
     * Variable name: "weather.current"
     * JSON path: "$.current.condition"
     * Fallback value: "nice day"
   - Cache duration (seconds)
   - Timeout (ms)

3. Test Panel:
   - Test with sample recipient
   - Show API response
   - Show extracted values
   - Show performance (latency)

4. Usage Analytics:
   - Calls per day
   - Cache hit rate
   - Error rate
   - Average latency

EXAMPLE SOURCES:

Weather:
- Endpoint: https://api.weather.com/v1/current?lat={{lat}}&lon={{lon}}
- Variable: weather.current → $.current.condition.text
- Fallback: "today"

Inventory:
- Endpoint: https://api.yourstore.com/inventory/{{product_id}}
- Variable: inventory.status → $.in_stock
- Fallback: "available soon"
```

---

## Prompt 9.5: AI Content Suggestions (Future)

```
OBJECTIVE: Plan for AI-assisted content creation.

NOTE: This is a future enhancement, documenting the vision.

CAPABILITIES:

1. Subject Line Generation:
   - Input: email body, target audience, tone
   - Output: 5 subject line suggestions
   - A/B test top performers

2. SMS Copy Optimization:
   - Input: message goal, character limit
   - Output: optimized SMS text
   - Suggests emoji usage

3. Call-to-Action Suggestions:
   - Analyze content
   - Suggest effective CTAs
   - Based on industry best practices

4. Tone Adjustment:
   - Input: draft content, desired tone
   - Output: rewritten in target tone
   - Options: professional, friendly, urgent, casual

5. Personalization Suggestions:
   - Analyze template
   - Suggest where to add personalization
   - Recommend which variables to use

IMPLEMENTATION NOTES:
- Use OpenAI or Anthropic API
- Cache suggestions
- Allow user editing
- Track which suggestions perform best
- Learn from successful content

NOT IMPLEMENTING IN V1, but design system to allow future addition.
```

---

## Prompt 9.6: Verify Phase 9 Completion

```
OBJECTIVE: Verify AI and optimization features are complete.

SEND TIME OPTIMIZATION:
□ Engagement pattern tracking
□ Optimal time calculation
□ Integration with scheduling
□ UI toggle and preview
□ Analytics comparison

REAL-TIME PERSONALIZATION:
□ External data source management
□ Variable resolution at send time
□ Caching system
□ Error handling with fallbacks
□ Test interface

TEST SCENARIOS:

Send Time Optimization:
1. Run campaign without AI
2. Collect engagement data
3. Enable AI optimization
4. Run same campaign
5. Compare engagement rates
6. View analytics

External Data:
1. Configure weather API
2. Create template with {{external.weather.current}}
3. Send test message
4. Verify weather data included
5. Test fallback when API fails
6. Verify caching works

Performance:
1. Send 100 messages with external data
2. Verify latency is acceptable
3. Check cache hit rate
4. Verify no timeouts block sending

Report issues before Phase 10.
```

---

# PHASE 10: POLISH & LAUNCH
**Duration:** 2 Weeks  
**Goal:** Testing, optimization, documentation, launch

---

## Prompt 10.1: Comprehensive Testing Plan

```
OBJECTIVE: Create and execute comprehensive testing plan.

TEST CATEGORIES:

1. UNIT TESTS:
   Location: tests/unit/
   
   Test all:
   - Template rendering
   - Consent checking
   - Attribution calculation
   - Time zone handling
   - Phone/email validation
   - A/B variant assignment
   - Statistical calculations

2. INTEGRATION TESTS:
   Location: tests/integration/
   
   Test flows:
   - Create sequence → Publish → Enroll → Send
   - SMS opt-out flow
   - Email open/click tracking
   - WhatsApp template send
   - Voice call with IVR
   - Gift card provisioning
   - Conversation reply flow

3. END-TO-END TESTS:
   Location: tests/e2e/
   
   Test user journeys:
   - Create complete sequence in builder
   - Configure all step types
   - Test sequence with real messages
   - View analytics
   - Manage conversations

4. LOAD TESTS:
   Tools: k6 or Artillery
   
   Test:
   - Enrollment at scale (1000/minute)
   - CRON processing (1000 due steps)
   - Concurrent API calls
   - Database query performance

5. COMPLIANCE TESTS:
   
   Verify:
   - Opt-out processed immediately
   - Consent checked before every send
   - Suppression list honored
   - Time restrictions respected
   - Required elements in emails

EXECUTION:
- Create test scripts
- Set up test data fixtures
- Run tests in CI/CD
- Fix all failures
- Document coverage
```

---

## Prompt 10.2: Performance Optimization

```
OBJECTIVE: Optimize system performance for production.

AREAS TO OPTIMIZE:

1. DATABASE:
   - Analyze slow queries (pg_stat_statements)
   - Add missing indexes
   - Optimize complex queries
   - Review explain plans
   - Implement connection pooling
   - Configure statement timeout

2. CRON PROCESSOR:
   - Batch size tuning
   - Parallel processing
   - Skip locked optimization
   - Minimize database round trips
   - Async where possible

3. API RESPONSE TIME:
   - Add caching layer (Redis)
   - Optimize common queries
   - Implement pagination
   - Use database views for complex aggregations

4. FRONTEND:
   - Code splitting
   - Lazy loading
   - Memoization
   - Virtual scrolling for lists
   - Image optimization

5. EMAIL/SMS SENDING:
   - Batch similar messages
   - Use provider batch APIs
   - Implement rate limiting
   - Queue management

METRICS TO TARGET:
- API response: < 200ms (p95)
- CRON batch: < 30 seconds for 100 steps
- Builder load: < 2 seconds
- Inbox load: < 1 second
- Search: < 500ms

MONITORING:
- Set up performance dashboards
- Configure alerts for degradation
- Log slow operations
- Track trends over time
```

---

## Prompt 10.3: Documentation

```
OBJECTIVE: Create comprehensive documentation.

DOCUMENTATION TYPES:

1. USER GUIDE:
   Location: docs/user-guide/
   
   Contents:
   - Getting started
   - Creating your first sequence
   - Understanding triggers
   - Building sequences
   - Designing emails
   - Managing templates
   - Handling conversations
   - Viewing analytics
   - Compliance best practices
   - Troubleshooting FAQ

2. ADMIN GUIDE:
   Location: docs/admin-guide/
   
   Contents:
   - System configuration
   - Provider setup (SMS, Email, WhatsApp, Voice)
   - User management
   - Compliance settings
   - Monitoring and alerts
   - Backup and recovery

3. API DOCUMENTATION:
   Location: docs/api/
   
   Contents:
   - Authentication
   - Endpoint reference
   - Request/response examples
   - Error codes
   - Rate limits
   - Webhooks

4. DEVELOPER GUIDE:
   Location: docs/developer/
   
   Contents:
   - Architecture overview
   - Code structure
   - Database schema
   - Adding new features
   - Testing guide
   - Deployment process

5. CHANGELOG:
   Location: CHANGELOG.md
   
   Track:
   - Version history
   - New features
   - Bug fixes
   - Breaking changes

FORMAT:
- Markdown files
- Screenshots where helpful
- Code examples
- Video tutorials (future)
```

---

## Prompt 10.4: Monitoring & Alerts

```
OBJECTIVE: Set up production monitoring and alerting.

MONITORING AREAS:

1. APPLICATION METRICS:
   - Edge function execution time
   - Error rates by function
   - Request volume
   - Database query time

2. BUSINESS METRICS:
   - Enrollments per hour
   - Messages sent per hour
   - Delivery rates
   - Engagement rates
   - Conversion rates

3. INFRASTRUCTURE:
   - Database connections
   - CPU/memory usage
   - Disk space
   - Queue depth

4. COMPLIANCE METRICS:
   - Opt-outs per day
   - Complaints
   - Bounce rate
   - Suppression list size

ALERTS:

CRITICAL (page immediately):
- Error rate > 5%
- CRON not running
- Database connection failed
- Provider API down

HIGH (notify within 1 hour):
- Error rate > 1%
- Queue backlog > 1000
- Delivery rate < 95%
- Response time > 1 second

MEDIUM (daily digest):
- Opt-out rate > 2%
- Bounce rate > 5%
- New compliance issues

IMPLEMENTATION:
- Use Supabase logging
- Set up external monitoring (Datadog, etc.)
- Create Slack/email alerts
- Build status dashboard
- Document runbooks
```

---

## Prompt 10.5: Launch Checklist

```
OBJECTIVE: Final checklist before going live.

PRE-LAUNCH CHECKLIST:

FUNCTIONALITY:
□ All Phase 0-9 prompts completed
□ All features tested
□ No critical bugs
□ Performance targets met

SECURITY:
□ RLS policies verified
□ Auth working correctly
□ Secrets properly stored
□ Audit logging enabled
□ Penetration testing (optional)

COMPLIANCE:
□ TCPA requirements met
□ CAN-SPAM requirements met
□ GDPR requirements met (if applicable)
□ Privacy policy updated
□ Terms of service updated
□ Consent language reviewed by legal

PROVIDERS:
□ SMS provider production credentials
□ Email provider production credentials
□ WhatsApp Business approved
□ Voice provider production credentials
□ Webhook URLs configured
□ Provider error handling tested

INFRASTRUCTURE:
□ Production environment configured
□ Database backups enabled
□ Monitoring dashboards live
□ Alerts configured
□ Runbooks documented
□ On-call rotation set

DOCUMENTATION:
□ User guide complete
□ Admin guide complete
□ API documentation complete
□ Training materials ready
□ Support processes defined

ROLLOUT PLAN:
□ Beta users identified
□ Phased rollout schedule
□ Rollback plan documented
□ Success metrics defined
□ Feedback collection method

COMMUNICATION:
□ Internal announcement ready
□ External announcement ready
□ Support team trained
□ Sales team trained

GO/NO-GO MEETING:
□ Stakeholder sign-off
□ Final demo
□ Launch date confirmed
```

---

## Prompt 10.6: Post-Launch Monitoring

```
OBJECTIVE: Monitor system after launch and iterate.

FIRST 24 HOURS:
- Monitor all metrics closely
- Be available for immediate fixes
- Watch error logs
- Check delivery rates
- Respond to user issues quickly

FIRST WEEK:
- Daily metric reviews
- Collect user feedback
- Prioritize bug fixes
- Small improvements based on feedback
- Update documentation based on questions

FIRST MONTH:
- Weekly metric reviews
- Feature usage analysis
- Performance trending
- Compliance audit
- Plan next improvements

METRICS TO WATCH:

Volume:
- Sequences created
- Enrollments per day
- Messages sent per day

Quality:
- Delivery rate
- Error rate
- User complaints

Engagement:
- Open rates
- Click rates
- Conversion rates

Performance:
- API response time
- CRON processing time
- Page load times

ITERATE:
- Gather feedback systematically
- Prioritize improvements
- Release regular updates
- Communicate changes to users
```

---

# APPENDIX: QUICK REFERENCE

## Edge Functions Summary

| Function | Purpose |
|----------|---------|
| create-follow-up-sequence | Create new sequence |
| update-follow-up-sequence | Modify sequence |
| publish-follow-up-sequence | Validate and publish |
| pause-follow-up-sequence | Pause active sequence |
| archive-follow-up-sequence | Archive sequence |
| get-follow-up-sequence | Get single sequence |
| list-follow-up-sequences | List sequences |
| enroll-in-sequence | Enroll recipient |
| pause-follow-up-enrollment | Pause enrollment |
| resume-follow-up-enrollment | Resume enrollment |
| cancel-follow-up-enrollment | Cancel enrollment |
| process-due-follow-ups | CRON processor |
| evaluate-follow-up-triggers | Trigger evaluation |
| send-follow-up-sms | Send SMS |
| send-follow-up-email | Send email |
| send-follow-up-whatsapp | Send WhatsApp |
| send-follow-up-voice | Initiate voice call |
| track-follow-up-email | Email tracking handler |
| webhook-sms-status | SMS status webhook |
| webhook-sms-inbound | SMS inbound webhook |
| webhook-email-status | Email status webhook |
| webhook-whatsapp | WhatsApp webhook |
| voice-call-handler | Voice call events |
| handle-conversation-message | Conversation handler |
| send-conversation-reply | Send agent reply |

## Database Tables Summary

| Table | Purpose |
|-------|---------|
| follow_up_sequences | Sequence definitions |
| follow_up_steps | Steps within sequences |
| follow_up_templates | Message templates |
| follow_up_enrollments | Recipient enrollments |
| follow_up_executions | Send attempts |
| follow_up_events | Event stream |
| follow_up_conversations | Conversation threads |
| follow_up_messages | Conversation messages |
| sms_consent_records | SMS consent |
| email_consent_records | Email consent |
| whatsapp_consent_records | WhatsApp consent |
| voice_consent_records | Voice consent |
| suppression_list | Do not contact |
| consent_audit_log | Consent changes |
| attribution_touchpoints | Touchpoint tracking |
| conversion_events | Conversion tracking |
| revenue_attribution | Attribution data |
| external_data_sources | External APIs |
| email_template_library | Email templates |
| whatsapp_templates | WhatsApp templates |
| conversation_auto_replies | Auto-reply rules |

---

**End of Implementation Prompts**

**Total Prompts:** 59
**Estimated Implementation Time:** 26 weeks
