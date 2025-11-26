# System Architecture

Comprehensive overview of the Mobul ACE Platform architecture, including system components, technology stack, and design principles.

## Architecture Principles

### 1. API-First Design
All functionality exposed via RESTful API endpoints, enabling:
- External integrations
- Mobile app development
- Third-party tool connectivity
- Automated workflows

### 2. Multi-Tenancy
Complete data isolation using Row-Level Security (RLS):
- Organizations and clients fully isolated
- No cross-tenant data leakage
- Scalable to thousands of tenants

### 3. Event-Driven
Actions trigger events for real-time processing:
- Landing page visits create attribution events
- Call completions trigger gift card provisioning
- Form submissions fire webhooks
- Analytics update in real-time

### 4. Modular Design
Features organized into independent modules:
- Campaigns
- Contacts/Audiences
- Landing Pages
- Gift Cards
- Call Tracking
- Analytics

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React SPA)                     │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌─────────────┐│
│  │Dashboard │ │ Campaigns │ │  Contacts  │ │  Analytics  ││
│  └──────────┘ └───────────┘ └────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTPS / REST API
                            │
┌─────────────────────────────────────────────────────────────┐
│                Backend (Lovable Cloud / Supabase)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  PostgreSQL  │  │ Edge Funcs   │  │   File Storage   │ │
│  │   Database   │  │  (Serverless)│  │   (S3-compat)    │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │     Auth     │  │   Realtime   │  │   Secrets Vault  │ │
│  │  (Supabase)  │  │   (WebSock)  │  │                  │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
              External Integrations (APIs)
                            │
┌────────────┬──────────────┬────────────────┬───────────────┐
│  PostGrid  │    Twilio    │   Tillo API    │  CRM Webhooks │
│  (Print)   │  (SMS/Voice) │  (Gift Cards)  │  (Zapier...)  │
└────────────┴──────────────┴────────────────┴───────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast dev server, optimized builds)
- **Routing**: React Router v6 (client-side routing)
- **State Management**: TanStack Query for server state, React Context for UI state
- **UI Components**: Shadcn UI (Radix primitives) + Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table
- **Design Tools**: GrapesJS (visual editors)

### Module Structure

```
src/
├── components/
│   ├── campaigns/      # Campaign-related components
│   ├── contacts/       # Contact management
│   ├── mail/          # Mail template components
│   ├── landing-pages/ # Landing page builder
│   ├── gift-cards/    # Gift card management
│   ├── call-center/   # Call tracking UI
│   ├── analytics/     # Charts and dashboards
│   └── ui/            # Reusable UI components
├── pages/             # Route-level page components
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
├── contexts/          # React context providers
├── types/             # TypeScript type definitions
└── integrations/      # API client libraries
    └── supabase/      # Supabase client & types
```

### State Management Strategy

**Server State (TanStack Query)**
- Campaign data
- Contact lists
- Gift card inventory
- Analytics metrics
- User permissions

**Local UI State (React useState/useReducer)**
- Form inputs
- Modal open/close
- Sidebar collapse
- Table filters

**Global State (React Context)**
- Authentication state
- User profile
- Current client selection
- Theme (dark/light)

### Authentication Flow

```
1. User visits app → Check for existing session
2. If no session → Redirect to /login
3. User enters credentials → POST /auth/v1/token
4. Backend validates → Returns JWT + refresh token
5. Store JWT in memory, refresh token in httpOnly cookie
6. Fetch user profile + permissions
7. Redirect to dashboard with role-based navigation
```

## Backend Architecture

### Database (PostgreSQL 15)

**Row-Level Security (RLS)**
Every table implements RLS policies ensuring:
- Users see only their organization's data
- Clients see only their data
- Admins can see all data
- Call center sees only active campaigns

**Key Tables** (30+ total)
- `organizations`, `clients`, `users`
- `campaigns`, `recipients`, `campaign_conditions`
- `contacts`, `contact_lists`, `contact_list_members`
- `templates`, `landing_pages`, `ace_forms`
- `gift_cards`, `gift_card_pools`, `gift_card_brands`
- `call_sessions`, `tracked_phone_numbers`
- `events` (attribution tracking)
- `documentation_pages`, `user_roles`, `role_permissions`

**Indexing Strategy**
- Primary keys (UUID): B-tree indexes
- Foreign keys: Indexed for join performance
- Search fields: GIN indexes on JSONB columns
- Full-text search: `search_keywords` arrays with GIN indexes

### Edge Functions (Serverless)

**Purpose**: Business logic that can't run in browser
- Gift card provisioning
- PURL handling
- Webhook receivers
- SMS/email sending
- Data transformations
- External API calls

**Runtime**: Deno (TypeScript/JavaScript)

**Key Functions**
- `handle-purl`: Process PURL visits, log events
- `redeem-customer-code`: Validate and redeem gift cards
- `handle-incoming-call`: Twilio webhook for call tracking
- `provision-twilio-number`: Purchase tracking numbers
- `send-gift-card-sms`: Send codes via Twilio
- `crm-webhook-receiver`: Receive CRM events
- `generate-recipient-tokens`: Create unique tokens for campaigns

**Authentication**
- Public endpoints: No auth required (e.g., PURL handling)
- Authenticated endpoints: JWT verification
- API key endpoints: API key validation

### File Storage

**Supabase Storage** (S3-compatible)
- Template uploads (mail piece designs)
- Landing page assets (images, videos)
- User avatars and logos
- Call recordings
- Export files (CSV, PDF reports)

**Buckets**
- `templates`: Mail template artwork
- `landing-pages`: Landing page media
- `avatars`: User profile images
- `recordings`: Call audio files
- `exports`: Generated reports

### Realtime

**Use Cases**
- Live campaign status updates
- Real-time analytics refreshes
- Call center queue updates
- Gift card inventory changes

**Implementation**
```typescript
supabase
  .channel('campaigns')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'campaigns'
  }, (payload) => {
    // Update UI in real-time
  })
  .subscribe()
```

## External Integrations

### Print Vendors

**PostGrid API**
- Submit print jobs programmatically
- Track delivery status via webhooks
- Retrieve IMb tracking data
- Manage templates and artwork

**Custom Mailhouses**
- Webhook-based integration
- Submit orders via REST API
- Receive status updates
- FTP or API-based file transfer

### SMS & Voice (Twilio)

**Capabilities**
- Send SMS messages (gift card codes)
- Provision tracking phone numbers
- Receive inbound call webhooks
- Record calls
- Transcribe calls (optional)

**Webhook Endpoints**
- `/handle-incoming-call`: Call initiated
- `/update-call-status`: Call status changed
- `/handle-sms-delivery`: SMS delivery status

### Gift Cards (Tillo API)

**Operations**
- Purchase gift card codes in bulk
- Check real-time card balance
- Retrieve available brands
- Order physical cards (optional)

**Integration Pattern**
1. Pre-purchase codes → Store in database
2. Campaign launched → Reserve codes
3. Condition met → Provision code to recipient
4. Send via SMS/email → Mark as delivered

### CRM Systems

**Webhook-Based Integration**
- Zapier integration
- Custom CRM webhooks
- Bidirectional data sync
- Event-triggered actions

**Example Flow**
1. Lead captured in ACE → Webhook to CRM
2. CRM updates deal stage → Webhook to ACE
3. ACE triggers follow-up campaign

## Security Architecture

### Authentication
- **Method**: Email + password (Supabase Auth)
- **Token**: JWT with 1-hour expiration
- **Refresh**: Automatic token refresh
- **MFA**: Optional (future)

### Authorization
- **Roles**: 6 primary roles (admin, agency_owner, etc.)
- **Permissions**: Granular feature permissions
- **Enforcement**: RLS at database + API checks

### Data Encryption
- **At Rest**: PostgreSQL encryption
- **In Transit**: TLS 1.3 (HTTPS only)
- **Secrets**: Stored in encrypted vault
- **API Keys**: Hashed (bcrypt) before storage

### RLS Policies

**Example: campaigns table**
```sql
-- Users see campaigns for their client
CREATE POLICY "Users can view own client campaigns"
ON campaigns FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users 
    WHERE user_id = auth.uid()
  )
);

-- Admins see all campaigns
CREATE POLICY "Admins can view all campaigns"
ON campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

## Performance Considerations

### Database Optimization
- **Indexes**: All foreign keys indexed
- **Partitioning**: Events table partitioned by date
- **Archiving**: Old data moved to archive tables
- **Query Optimization**: SELECT only needed columns

### Caching Strategy
- **React Query**: Client-side caching (5-minute stale time)
- **Database**: No application-level caching (rely on Postgres cache)
- **CDN**: Static assets served from CDN

### Pagination
- **Server-Side**: All list views paginated
- **Page Size**: 50 items default, 100 max
- **Cursor-Based**: For real-time feeds

### Batch Operations
- **Bulk Imports**: Process in batches of 1000
- **Token Generation**: Generate in parallel
- **Email Sending**: Queue-based processing

## Deployment Architecture

### Frontend
- **Hosting**: Lovable Cloud (static SPA)
- **CDN**: Global edge locations
- **Deployments**: Automatic on git push
- **Environments**: Preview, Staging, Production

### Backend
- **Database**: Managed PostgreSQL (Supabase)
- **Edge Functions**: Auto-deploy on push
- **Scaling**: Automatic horizontal scaling
- **Backups**: Daily automated backups

### Monitoring
- **APM**: Application performance monitoring
- **Logs**: Centralized logging (Edge Function logs)
- **Alerts**: Error rate, latency, database load
- **Uptime**: External monitoring (pingdom-style)

## Disaster Recovery

### Backup Strategy
- **Database**: Daily full backups, retained 30 days
- **Point-in-Time Recovery**: 7-day window
- **File Storage**: Versioned with 90-day retention

### Recovery Time Objectives
- **RTO** (Recovery Time Objective): <1 hour
- **RPO** (Recovery Point Objective): <1 hour

## Scalability

### Current Capacity
- **Tenants**: Supports 1,000+ organizations
- **Users**: 10,000+ concurrent users
- **Campaigns**: 100,000+ active campaigns
- **Events**: 10M+ events/day

### Scaling Strategy
- **Database**: Vertical scaling (increase instance size)
- **Edge Functions**: Automatic horizontal scaling
- **Storage**: Unlimited (S3-backed)

## Related Documentation

- [Data Model →](/admin/docs/architecture/data-model)
- [Security Model →](/admin/docs/architecture/security)
- [Tech Stack →](/admin/docs/architecture/tech-stack)
- [Scalability →](/admin/docs/architecture/scalability)
