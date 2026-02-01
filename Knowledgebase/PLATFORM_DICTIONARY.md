# MOBUL - PLATFORM DICTIONARY

## Purpose
This document defines ALL terminology used across the Mobul platform. Every developer, designer, and AI agent MUST use these terms consistently.

---

## Organization Hierarchy

### Platform
- **Definition**: The top-level entity. Mobul itself.
- **Role**: Platform Admin
- **Permissions**: Full system access, manages all agencies
- **In Code**: `organization_type: 'platform'`

### Agency
- **Definition**: A marketing agency or reseller that uses Mobul to serve their clients
- **Role**: Agency Owner
- **Permissions**: Manage their clients, campaigns, users, credits
- **In Code**: `organization_type: 'agency'`
- **Example**: "ABC Marketing Agency"
- **NOT**: A government agency, real estate agency

### Client
- **Definition**: A business that the Agency serves. The end customer of the Agency.
- **Role**: Client Owner / Company Owner
- **Permissions**: Manage their own campaigns, contacts, view their data
- **In Code**: `organization_type: 'client'` or `company`
- **Example**: "Joe's Auto Dealership" (client of ABC Marketing Agency)
- **NOT**: An API client, software client

### Customer
- **Definition**: The recipient of direct mail campaigns. The person who receives the postcard/letter.
- **In Code**: `contact`, `recipient`
- **Example**: "John Smith who received a postcard from Joe's Auto Dealership"
- **NOT**: The Client (Client pays for the service, Customer receives the mail)

---

## User Roles

### Platform Admin
- **Definition**: Mobul staff with full system access
- **In Code**: `role: 'admin'`
- **Can**: Everything

### Tech Support
- **Definition**: Mobul support staff
- **In Code**: `role: 'tech_support'`
- **Can**: View all data, assist users, cannot delete

### Agency Owner
- **Definition**: Owner/admin of an Agency account
- **In Code**: `role: 'agency_owner'`
- **Can**: Manage all clients under their agency

### Client Owner / Company Owner
- **Definition**: Owner/admin of a Client account
- **In Code**: `role: 'company_owner'`
- **Can**: Manage their company's campaigns, contacts, users

### Agent
- **Definition**: A user who works in a call center, processes redemptions
- **In Code**: `role: 'call_center'` or `agent`
- **Can**: View assigned campaigns, process gift card redemptions
- **NOT**: An AI agent, software agent

### Developer
- **Definition**: API user with programmatic access
- **In Code**: `role: 'developer'`
- **Can**: Use API endpoints, manage integrations

---

## Campaign Concepts

### Campaign
- **Definition**: A single direct mail marketing initiative with defined audience, design, and rewards
- **Contains**: Recipients, mail design, gift card configuration, conditions
- **Lifecycle**: Draft → Active → Completed

### Recipient
- **Definition**: A Customer who is part of a specific Campaign
- **In Code**: `campaign_recipients`, `recipient`
- **Has**: Unique code, contact info, participation status

### Unique Code / Customer Code / Redemption Code
- **Definition**: A unique identifier assigned to each Recipient for tracking and redemption
- **Format**: Alphanumeric, typically 8-12 characters
- **Purpose**: Track mail response, enable gift card redemption
- **In Code**: `unique_code`, `customer_code`, `redemption_code`
- **PREFERRED TERM**: `unique_code`

### PURL (Personal URL)
- **Definition**: A personalized landing page URL for each Recipient
- **Format**: `https://domain.com/p/{unique_code}`
- **Purpose**: Track who visited, capture form data

### Condition
- **Definition**: A trigger rule that determines when rewards are given
- **Types**: Form submission, QR scan, call completed, time delay
- **In Code**: `campaign_conditions`

---

## Gift Card Concepts

### Gift Card Brand
- **Definition**: The merchant brand (Amazon, Visa, Target, etc.)
- **In Code**: `gift_card_brands`
- **Example**: "Amazon", "Visa Reward Card"

### Denomination
- **Definition**: The dollar value of a gift card
- **In Code**: `denomination_value`
- **Example**: $25, $50, $100

### Brand-Denomination
- **Definition**: A specific combination of brand and value
- **In Code**: `brand_denomination_id`
- **Example**: "Amazon $25", "Visa $50"

### Gift Card Pool
- **Definition**: Inventory of gift cards available for a Client
- **In Code**: `gift_card_pools`
- **Contains**: Cards from one or more brands/denominations

### Provisioning
- **Definition**: The process of allocating and delivering a gift card to a Recipient
- **Waterfall**: CSV inventory → API (Tillo) → Buffer pool

---

## Credit System

### Credits
- **Definition**: The currency used to pay for gift cards and services
- **Flow**: Platform → Agency → Client → Campaign
- **In Code**: `credit_accounts`, `credit_transactions`

### Credit Account
- **Definition**: A balance holder at any level of the hierarchy
- **Types**: Platform account, Agency account, Client account

### Allocation
- **Definition**: Moving credits down the hierarchy (Platform → Agency → Client)
- **In Code**: `allocate-credit` edge function

---

## Design Concepts

### Mail Design / Mail Piece
- **Definition**: The visual design of the physical mail (postcard, letter, etc.)
- **Types**: Postcard (4x6, 6x9, 6x11), Letter, Trifold
- **In Code**: `mail_designs`, `mail_pieces`

### Landing Page Design
- **Definition**: The web page design that Recipients visit
- **In Code**: `landing_pages`

### Email Design
- **Definition**: Email template design for notifications
- **In Code**: `email_templates`

### Template Token / Personalization Token / Merge Field
- **Definition**: Placeholder variables replaced with recipient data
- **STANDARD TOKENS**:
  - `{{first_name}}` - Recipient's first name
  - `{{last_name}}` - Recipient's last name
  - `{{full_name}}` - Recipient's full name
  - `{{unique_code}}` - Recipient's unique code
  - `{{company_name}}` - Client's company name
  - `{{purl}}` - Personal URL
  - `{{qr_code}}` - QR code image
  - `{{gift_card_amount}}` - Gift card value
- **PREFERRED TERM**: `template_token`

### Canvas
- **Definition**: The design editing area in the designer
- **Contains**: Background layer, design elements, text, images

### Background
- **Definition**: The base layer of a design (uploaded image or color)
- **Purpose**: Represents the mail piece template to design on top of

---

## Contact Concepts

### Contact
- **Definition**: A person in the CRM database
- **In Code**: `contacts`
- **Has**: Name, email, phone, address, custom fields

### Contact List / Audience
- **Definition**: A saved group of contacts for targeting
- **In Code**: `contact_lists`, `audiences`
- **PREFERRED TERM**: `audience`

### Enrichment
- **Definition**: Adding data to a contact from form submissions or external sources
- **In Code**: Contact fields updated from form data

---

## Communication Concepts

### SMS Opt-In
- **Definition**: Customer consent to receive text messages
- **Required**: Before sending gift card via SMS
- **Flow**: Send opt-in request → Customer replies YES → Send gift card

### Call Tracking
- **Definition**: Tracking phone calls from campaigns using unique numbers
- **Provider**: Twilio

---

## Code Naming Conventions

### Database Tables (snake_case)
- `organizations`
- `user_roles`
- `campaigns`
- `campaign_recipients`
- `gift_card_pools`
- `credit_accounts`

### TypeScript Types (PascalCase)
- `Organization`
- `UserRole`
- `Campaign`
- `Recipient`
- `GiftCardPool`

### React Components (PascalCase)
- `CampaignCard`
- `RecipientTable`
- `GiftCardSelector`

### Hooks (camelCase with use prefix)
- `useCampaigns`
- `useRecipients`
- `useGiftCards`

### Edge Functions (kebab-case)
- `provision-gift-card`
- `send-gift-card-sms`
- `validate-redemption-code`

---

## Terms to AVOID (Ambiguous)

| Avoid | Use Instead |
|-------|-------------|
| "user" (alone) | Specify role: "agent", "client owner", etc. |
| "customer" for Client | "client" for business, "customer" for mail recipient |
| "code" (alone) | "unique_code", "redemption_code", "api_key" |
| "template" (alone) | "mail_template", "email_template", "landing_page_template" |
| "card" (alone) | "gift_card", "credit_card" |
| "pool" (alone) | "gift_card_pool", "credit_pool" |
| "account" (alone) | "user_account", "credit_account", "organization" |

---

## Hierarchy Visualization

```
Platform (Mobul)
├── Agency A
│   ├── Client A1
│   │   ├── Campaign 1
│   │   │   ├── Recipient (Customer) with unique_code
│   │   │   └── Recipient (Customer) with unique_code
│   │   └── Campaign 2
│   └── Client A2
└── Agency B
    └── Client B1
```

---

**This dictionary is the source of truth. Update code and documentation to match these definitions.**

$END$
