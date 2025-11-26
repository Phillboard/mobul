# Platform Overview

Mobul ACE Platform is a comprehensive direct mail marketing automation platform designed for agencies and businesses to execute, track, and optimize direct mail campaigns with digital integration.

## What is Mobul ACE?

Mobul ACE (Automated Campaign Engagement) combines traditional direct mail with modern digital tracking and attribution. Send personalized postcards and letters that drive recipients to custom landing pages, track every interaction, and measure ROI with precision.

## Core Capabilities

### 1. Campaign Management
Create and manage direct mail campaigns from a single interface:
- Visual template designer for mail pieces
- Audience targeting and segmentation
- Automated PURL and QR code generation
- Print vendor integration
- Real-time status tracking

### 2. Audience & Contact Management
Comprehensive CRM-lite system for contact management:
- Import contacts from CSV or CRM integrations
- Dynamic segmentation with filters
- Lifecycle stage tracking
- Engagement scoring
- Reusable contact lists

### 3. Landing Pages & Lead Capture
Convert mail recipients to digital leads:
- Personalized bridge pages for each recipient
- Customizable lead capture forms
- Mobile-responsive design
- A/B testing capabilities
- Instant lead notifications

### 4. Gift Card Rewards
Incentivize engagement with automated rewards:
- Multi-brand gift card inventory
- Conditional reward triggers (call completion, form submission)
- SMS/email delivery
- Real-time redemption tracking
- ROI measurement

### 5. Call Tracking & Recording
Track phone responses to campaigns:
- Dedicated tracking numbers per campaign
- Call recording and transcription
- Agent dashboard for call management
- Disposition tracking
- Call-to-redemption workflow

### 6. Analytics & Reporting
Measure campaign performance with precision:
- Response rate tracking
- Multi-touch attribution
- Geographic heat maps
- Funnel analysis
- ROI calculations
- Exportable reports

## Who Uses Mobul ACE?

### Agencies
Marketing agencies managing campaigns for multiple clients:
- Multi-client management
- White-label capabilities
- Client user provisioning
- Consolidated reporting
- Revenue tracking

### Direct Businesses
Companies running their own direct mail:
- Roofing companies
- Real estate investors
- Auto service providers
- Home services
- Professional services

### Call Centers
Inbound call centers handling campaign responses:
- Call disposition interface
- Gift card provisioning tools
- Real-time inventory visibility
- Performance dashboards

## Multi-Tenancy Model

Mobul ACE supports a hierarchical organizational structure:

```
Organizations (Agencies)
  └── Clients (Business Units)
       └── Users (Team Members)
```

### Organization Types
1. **Internal Org**: Platform administrators and staff
2. **Agency Org**: Marketing agencies with multiple clients
3. **Direct Org**: Single businesses managing their own campaigns

## Key Workflows

### Campaign Creation Workflow
1. Define campaign details (name, goals)
2. Select target audience (contacts/lists)
3. Choose or design mail template
4. Configure landing page
5. Set up tracking (PURL, QR, calls)
6. Add gift card rewards (optional)
7. Review and submit to print vendor
8. Monitor results in real-time

### Redemption Workflow
1. Recipient receives mail with PURL/QR code
2. Visits personalized landing page
3. Completes desired action (form, call, visit)
4. Qualifies for gift card reward
5. Receives code via SMS or email
6. Redeems at brand website or in-store

## Platform Architecture

### Frontend
- Modern React-based SPA
- Role-specific navigation and views
- Real-time updates
- Mobile-responsive design

### Backend
- PostgreSQL database with RLS (Row-Level Security)
- Serverless Edge Functions
- RESTful API
- Webhook integrations

### External Integrations
- Print vendors (PostGrid, custom mailhouses)
- Gift card providers (Tillo API)
- SMS services (Twilio)
- CRM systems (webhook-based)
- Email providers

## Security & Access Control

### Role-Based Permissions
Six primary roles with granular permissions:
- **Admin**: Full platform access
- **Tech Support**: Support and troubleshooting
- **Agency Owner**: Agency management
- **Company Owner**: Client-level management
- **Developer**: API and integration access
- **Call Center**: Call handling and redemption

### Data Isolation
- Row-Level Security (RLS) on all tables
- Client data completely isolated
- Audit logging for sensitive operations
- Secure secrets management

## Data Model

### Core Entities
- **Organizations**: Top-level tenant
- **Clients**: Business units within organizations
- **Users**: Individual user accounts with roles
- **Campaigns**: Mail campaigns with tracking
- **Recipients**: Individual mail pieces with unique tokens
- **Contacts**: Master contact database
- **Gift Cards**: Reward inventory and redemption
- **Events**: Attribution and analytics data

## Getting Started

New to Mobul ACE? Follow this learning path:

1. [Quick Start Guide →](/admin/docs/getting-started/quickstart)
2. [Create Your First Campaign →](/admin/docs/getting-started/first-campaign)
3. [Key Terminology →](/admin/docs/getting-started/terminology)
4. [Campaign Lifecycle →](/admin/docs/features/campaign-lifecycle)
5. [Analytics Overview →](/admin/docs/features/analytics)

## Platform Strengths

✅ **All-in-One Solution**: Campaign creation, execution, tracking, and analytics in one platform  
✅ **Precise Attribution**: Track every interaction from mail to conversion  
✅ **Automated Rewards**: Gift card incentives with automated delivery  
✅ **Multi-Client Support**: Perfect for agencies managing multiple clients  
✅ **API-First**: Comprehensive API for custom integrations  
✅ **Real-Time Analytics**: Monitor campaign performance as it happens  

## Use Cases

### Roofing Companies
Target homeowners with roof damage after storms, drive to personalized landing pages with instant estimates, incentivize inspections with gift cards.

### Real Estate Investors
Target property owners in specific neighborhoods, drive calls with unique tracking numbers, reward seller leads with gift cards.

### Auto Service
Target vehicle owners by make/model, drive to booking pages, reward first-time customers with gift cards.

### Home Services
Target homeowners by service area, drive phone inquiries, track call outcomes, reward qualified leads.

## Next Steps

- [Architecture Overview →](/admin/docs/architecture/overview)
- [Database Schema →](/admin/docs/architecture/data-model)
- [Feature Documentation →](/admin/docs/features/campaigns)
- [API Reference →](/admin/docs/api-reference/rest-api)
