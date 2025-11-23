# System Architecture

## Overview

This is a multi-tenant direct mail marketing platform that enables businesses to create, manage, and track personalized direct mail campaigns with integrated digital experiences. The system combines physical mail with digital landing pages, gift card rewards, call tracking, and CRM integration.

**Last Updated**: 2025-01-23  
**Version**: 2.0  
**Performance Optimizations**: Phase 1 & 2 completed (Jan 2025)

## Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query v5)
  - Optimized caching: 5min stale time, 10min gc time
  - Reduced refetching on window focus
- **UI Framework**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS with semantic design tokens
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Testing Library

### Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL 15
  - 13 performance indexes added (Jan 2025)
  - RLS policies enforced on all tables
- **Auth**: Supabase Auth with password strength validation
- **Storage**: Supabase Storage (client-logos, templates, qr-codes)
- **Functions**: 56 Edge Functions (Deno runtime)
- **Real-time**: Supabase Realtime (campaigns, call sessions)

### External Services
- **SMS**: Twilio (call tracking, gift card delivery)
- **Gift Cards**: Tillo API (balance checks, provisioning)
- **AI**: Gemini 2.5 Pro, GPT-5 (via Lovable AI integration)

## Architecture Patterns

### Multi-Tenancy

The system uses **organization-level multi-tenancy** with row-level security (RLS):

```
organizations (agencies)
  └── clients (individual businesses)
      ├── users (via client_users)
      ├── campaigns
      ├── templates
      ├── audiences
      └── contacts
```

**Data Isolation**: RLS policies ensure users only access data for clients they're assigned to.

### Role-Based Access Control (RBAC)

Roles are stored in `user_roles` table (NOT on profiles):
- **admin**: Platform administrators
- **agency_owner**: Agency account owners
- **company_owner**: Business owners
- **call_center**: Call center agents
- **user**: Regular users

Permission checks use the `has_role()` database function.

### Authentication Flow

1. User signs up / signs in via Supabase Auth
2. Email auto-confirmation enabled (for development)
3. User assigned default "user" role
4. Admin can assign users to clients via `client_users`
5. Frontend checks permissions with `useUserRole()` and `useCanAccessClient()` hooks

## Module Breakdown

### 1. Campaigns Module

**Purpose**: Create and manage direct mail campaigns

**Key Features**:
- Multi-step campaign creation wizard
- Template selection and customization
- Audience targeting
- PURL (Personalized URL) generation
- QR code generation
- Call tracking integration
- Condition-based gift card rewards

**Components**:
- `CreateCampaignWizard` - Multi-step form
- `CampaignDetail` - Campaign dashboard
- `CampaignCard` - List view item
- Various wizard steps in `/components/campaigns/wizard/`

**Database Tables**:
- `campaigns` - Core campaign data
- `campaign_conditions` - Trigger conditions
- `campaign_reward_configs` - Gift card reward settings
- `campaign_drafts` - Saved wizard progress
- `campaign_versions` - Version history
- `campaign_approvals` - Approval workflow
- `campaign_comments` - Collaboration comments

### 2. Gift Cards Module

**Purpose**: Manage gift card inventory and distribution

**Key Features**:
- Master pool management (admin)
- Client pool management
- Purchase pools from admin
- CSV upload/export
- Balance checking
- SMS delivery
- Redemption tracking

**Components**:
- `GiftCards` page - Main dashboard
- `AdminGiftCardMarketplace` - Admin pool management
- `PoolDetailDialog` - Pool details and operations
- `BrandPoolsView` - Available pools
- `ClientMarketplace` - Client purchase interface

**Database Tables**:
- `gift_card_pools` - Card inventory pools
- `gift_cards` - Individual cards
- `gift_card_brands` - Brand catalog
- `gift_card_deliveries` - Delivery tracking
- `gift_card_redemptions` - Redemption verification
- `admin_card_sales` - Transfer records

**Edge Functions**:
- `transfer-admin-cards` - Transfer cards to client
- `check-gift-card-balance` - Check card balances
- `export-pool-cards` - Export CSV
- `send-gift-card-sms` - Send via SMS
- `validate-gift-card-code` - Validate redemption

### 3. Templates Module

**Purpose**: Design mail templates with drag-and-drop builder

**Key Features**:
- Canvas-based visual editor (V2)
- Layer management
- Merge fields
- QR code placement
- Image uploads
- Shape and text tools

**Components**:
- `TemplateBuilderV2` - Main editor
- `Canvas` - Drawing surface
- `VerticalToolbar` - Tool selection
- `TopActionBar` - Save, preview, etc.
- Various tool dialogs

**Database Tables**:
- `templates` - Template metadata
- `design_versions` - Version history

**Data Structure**:
Templates store JSON in `json_layers` column:
```typescript
{
  version: "1.0",
  canvasSize: { width: 1800, height: 1200 },
  layers: [
    { type: "text", text: "{{first_name}}", ... },
    { type: "qr_code", data: "{{purl}}", ... }
  ]
}
```

### 4. Audiences Module

**Purpose**: Import and manage recipient lists

**Key Features**:
- CSV import with field mapping
- Data hygiene validation
- Duplicate detection
- Suppression lists
- Manual recipient entry

**Components**:
- `Audiences` page - List view
- `AudienceDetail` - Detail view with recipients
- `AudienceImportTab` - CSV upload
- `FileUploadZone` - Drag-and-drop upload
- `ManualRecipientEntry` - Single entry form

**Database Tables**:
- `audiences` - Audience metadata
- `recipients` - Individual recipients

**Edge Functions**:
- `import-audience` - Process CSV upload
- `export-audience` - Export to CSV

### 5. Contacts/CRM Module

**Purpose**: Manage contacts, companies, deals, and activities

**Key Features**:
- Contact management
- Company management
- Deal pipeline (Kanban)
- Activity logging
- Task management
- CRM integrations (webhooks)

**Components**:
- `Contacts` / `ContactDetail` pages
- `Companies` / `CompanyDetail` pages
- `Deals` / `DealDetail` pages
- `DealKanban` - Pipeline view
- `Activities` / `Tasks` pages

**Database Tables**:
- `contacts` - Individual contacts
- `companies` - Organizations
- `deals` - Sales opportunities
- `pipelines` / `pipeline_stages` - Deal stages
- `activities` - Logged interactions
- `tasks` - To-do items
- `crm_integrations` - External CRM connections
- `crm_events` - Incoming webhook events

### 6. Landing Pages Module

**Purpose**: Create landing pages for campaigns

**Key Features**:
- Multiple editor options:
  - Simple form editor
  - GrapesJS visual editor
  - AI-generated pages
- PURL support
- Form submission tracking

**Components**:
- `LandingPages` - List view
- `SimpleLandingPageEditor` - Form-based editor
- `GrapesJSLandingPageEditor` - Visual builder
- `AILandingPageEditor` - AI-assisted editor
- `PURLLandingPage` - Public PURL handler

**Database Tables**:
- `landing_pages` - Page content and config

**Edge Functions**:
- `handle-purl` - Personalized URL handler
- `submit-lead-form` - Form submission handler
- `generate-landing-page` - AI generation

### 7. Call Tracking Module

**Purpose**: Track and manage inbound calls from campaigns

**Key Features**:
- Twilio integration
- Call forwarding
- Recording
- Disposition tracking
- Condition evaluation (triggers rewards)

**Components**:
- `AgentCallDashboard` - Agent interface
- `CallCenterDashboard` - Manager view
- `CallerInfoPanel` - Recipient matching
- `CompleteCallDialog` - Disposition form

**Database Tables**:
- `tracked_phone_numbers` - Provisioned numbers
- `call_sessions` - Call records
- `call_conditions_met` - Triggered conditions

**Edge Functions**:
- `handle-incoming-call` - Twilio webhook
- `update-call-status` - Status updates
- `complete-call-disposition` - Save disposition
- `provision-twilio-number` - Provision numbers
- `assign-tracked-numbers` - Assign to campaigns

### 8. Analytics & Events

**Purpose**: Track campaign engagement

**Event Types**:
- `mail_delivered` - Mail piece delivered
- `landing_page_visit` - PURL accessed
- `form_submitted` - Lead form submitted
- `call_received` - Inbound call
- `gift_card_delivered` - Reward sent
- `prototype_viewed` - Prototype previewed

**Database Tables**:
- `events` - Event log

**Edge Functions**:
- `track-mail-delivery` - Log delivery events

### 9. API & Integrations

**Purpose**: External API access and integrations

**Key Features**:
- REST API for external systems
- API key management
- Webhooks
- Zapier integration
- CRM webhooks (bidirectional)

**Components**:
- `API` page - API dashboard
- `APIDocumentation` - API docs
- `ZapierIntegrationTab` - Zapier setup

**Database Tables**:
- `api_keys` - API credentials
- `zapier_connections` - Zapier instances
- `webhooks` - Outgoing webhook configs

**Edge Functions**:
- `generate-api-key` - Create API keys
- `trigger-webhook` - Fire webhooks
- `zapier-incoming-webhook` - Zapier endpoint
- `dispatch-zapier-event` - Send to Zapier

### 10. User Management

**Purpose**: Manage users, roles, and permissions

**Key Features**:
- User invitation
- Role assignment
- Permission templates
- Client assignment
- Admin impersonation

**Components**:
- `UserManagement` page - User list
- `InviteUserDialog` - Send invitations
- `PermissionTemplateSelector` - Role templates

**Database Tables**:
- `user_roles` - Role assignments
- `user_permissions` - Granular permissions
- `user_invitations` - Pending invites
- `client_users` - Client assignments
- `admin_impersonations` - Impersonation log

**Edge Functions**:
- `send-user-invitation` - Send invite email
- `accept-invitation` - Complete signup

## Data Flow Examples

### Example 1: Campaign Launch Flow

1. User creates campaign via wizard → `campaigns` table
2. User selects template → foreign key to `templates`
3. User selects audience → foreign key to `audiences`
4. User sets conditions → `campaign_conditions` table
5. User launches campaign → status = 'in_progress'
6. System generates PURLs → `generate-recipient-tokens` edge function
7. System provisions tracking numbers → `assign-tracked-numbers` edge function
8. Mail vendor pulls data via API
9. Vendor reports delivery → `track-mail-delivery` edge function → `events` table

### Example 2: Gift Card Reward Flow

1. Admin uploads cards to master pool → `gift_card_pools` (is_master_pool=true)
2. Admin sets pricing → sale_price_per_card
3. Client purchases pool → `transfer-admin-cards` edge function
4. Cards transferred to client pool → `gift_card_pools` (client_id set)
5. Campaign set up with condition → `campaign_conditions` + `campaign_reward_configs`
6. Call received → `call_sessions` table
7. Agent marks condition met → `complete-call-disposition` edge function
8. System provisions card → `claim-and-provision-card` edge function
9. SMS sent → `send-gift-card-sms` edge function
10. Recipient redeems → `GiftCardReveal` page → `redeem-gift-card-embed` edge function

### Example 3: PURL Landing Page Visit

1. Recipient receives mail with QR code → scans code
2. URL format: `/c/:campaignId/:token`
3. `PURLLandingPage` component renders
4. `handle-purl` edge function called:
   - Validates token
   - Logs event to `events` table
   - Returns recipient data and landing page content
5. Form submitted → `submit-lead-form` edge function
6. Triggers webhooks / CRM integration

## Security Architecture

### Row-Level Security (RLS)

Every table with client-specific data has RLS policies:

```sql
-- Example: campaigns table
CREATE POLICY "Users can view campaigns for accessible clients"
  ON campaigns
  FOR SELECT
  USING (user_can_access_client(auth.uid(), client_id));
```

### Helper Functions

```sql
-- Check if user has specific role
has_role(user_id UUID, role app_role) RETURNS BOOLEAN

-- Check if user can access client
user_can_access_client(user_id UUID, client_id UUID) RETURNS BOOLEAN
```

### Edge Function Security

Edge functions verify JWT tokens where needed (configured in `supabase/config.toml`):

```toml
[functions.generate-template-design]
verify_jwt = true  # Requires authentication

[functions.handle-purl]
verify_jwt = false  # Public endpoint
```

## Performance Considerations

### Database Indexes

Key indexes on frequently queried columns:
- `campaigns(client_id, status)`
- `recipients(audience_id)`
- `events(campaign_id, recipient_id, event_type)`
- `gift_cards(pool_id, status)`

### Query Optimization

- Use `.select()` to fetch only needed columns
- Use `.single()` for single-record queries
- Implement pagination for large lists
- Use RPC functions for complex queries

### Caching Strategy

- TanStack Query handles client-side caching
- `staleTime: 5 minutes` for user/role data
- `staleTime: 1 minute` for dynamic lists
- Invalidate cache on mutations

## Deployment & DevOps

### Frontend Deployment
- Hosted on Lovable infrastructure
- Automatic deployments on git push

### Backend Deployment
- Edge functions auto-deploy from `supabase/functions/`
- Database migrations run automatically
- Secrets managed via Lovable Cloud

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public anon key
- Edge function secrets (Twilio, Tillo, AI APIs) stored securely

## Future Enhancements

### Planned Features
- [ ] A/B testing for templates
- [ ] Advanced analytics dashboards
- [ ] SMS campaigns (separate from gift cards)
- [ ] Email campaigns
- [ ] Social media integrations
- [ ] Advanced reporting (custom reports)
- [ ] White-label agency features

### Technical Debt
- [ ] Consolidate landing page editors
- [ ] Migrate remaining components to V2 patterns
- [ ] Add comprehensive unit tests
- [ ] Implement E2E testing
- [ ] Performance profiling for large audiences
