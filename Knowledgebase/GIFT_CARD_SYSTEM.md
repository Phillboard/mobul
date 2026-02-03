# Gift Card System - Complete Lifecycle Documentation

## 1. Overview

The gift card system is an incentive provisioning platform that enables organizations to distribute gift cards to recipients through campaigns. It supports both pre-loaded CSV-imported cards and on-demand Tillo API-provisioned cards, with Stripe payment processing for purchases.

### Glossary

| Term | Definition |
|------|-----------|
| **Brand** | A gift card merchant (e.g., Amazon, Starbucks). Stored in `gift_card_brands`. |
| **Denomination** | A dollar value for a brand (e.g., $25 Starbucks). Stored in `gift_card_denominations`. |
| **Pool** | A collection of gift cards grouped for management. Stored in `gift_card_pools`. |
| **Master Pool** | Admin-owned pool that cards can be sold/transferred from to clients. |
| **Inventory** | Individual card records with codes and balances. Stored in `gift_card_inventory`. |
| **Provisioning** | The process of assigning a card to a recipient (12-step flow). |
| **Redemption** | End-user entering their code to reveal/claim a gift card. |
| **Billing Entity** | The agency or client charged when a card is provisioned. |
| **Tillo** | Third-party gift card API for on-demand card provisioning and balance checks. |
| **Credit** | Wallet balance (in dollars) held by a client or agency. |

### Actors

| Actor | Role |
|-------|------|
| **Platform Admin** | Manages brands, denominations, master pools, monitors system health. Has full access. |
| **Client Admin** | Enables brands for their campaigns, purchases from marketplace, manages their pools. |
| **End User (Recipient)** | Receives a redemption code, enters it on embed/landing page, gets card details. |

---

## 2. System Architecture

```
Frontend (React/Vite + TanStack Query)
  |
  ├── src/core/api/client.ts           → HTTP client (retries, auth, tracing)
  ├── src/core/api/hooks/useGiftCardAPI.ts  → 18 React Query hooks
  └── src/core/api/endpoints.ts        → Endpoint registry
  |
  ▼
Supabase Edge Functions (Deno)
  |
  ├── Provisioning: provision-gift-card-unified (3 entry points)
  ├── Redemption:   validate-gift-card-code, validate-redemption-code,
  │                 redeem-gift-card-embed
  ├── Purchasing:   purchase-gift-cards, stripe-webhook
  ├── Inventory:    import-gift-cards, export-pool-cards, transfer-admin-cards
  ├── Balance:      check-gift-card-balance, check-inventory-card-balance
  ├── Admin:        cleanup-stuck-gift-cards, monitor-gift-card-system,
  │                 lookup-tillo-brand, diagnose-provisioning-setup
  └── Lifecycle:    revoke-gift-card, provision-gift-card-from-api
  |
  ▼
External Services
  ├── Tillo API     → On-demand card provisioning + balance checks (HMAC-SHA256 auth)
  ├── Stripe API    → Payment processing for card purchases
  └── Zapier        → Webhook events on card redemption
```

---

## 3. Admin Workflow

### 3.1 Brand Setup
1. Navigate to Admin Gift Cards dashboard
2. Click "Add Brand" → `AddBrandDialog`
3. Enter brand name, optionally sync with Tillo API to pull metadata (`lookup-tillo-brand`)
4. Configure balance check method: `tillo_api`, `other_api`, or `manual`
5. Set brand logo, category, provider
6. Enable the brand (`is_enabled_by_admin = true`)

### 3.2 Denomination Management
1. Click "Manage Denominations" → `ManageDenominationsDialog`
2. Add denomination values (e.g., $10, $25, $50)
3. Optionally set custom pricing: `cost_basis`, `client_price`, `agency_price`
4. Default cost basis: 95% of face value

### 3.3 Inventory Management

**Option A: CSV Import**
1. Click "Upload Cards" → `GiftCardUploadTab`
2. Select target pool (or create new)
3. Upload CSV with columns: `card_code` (required), `card_number`, `expiration_date`, `provider`
4. Edge function `import-gift-cards` validates, deduplicates, and inserts
5. Cards enter system with `status = 'available'`

**Option B: Purchase from Tillo via Stripe**
1. Click "Purchase" → `PurchaseGiftCardsDialog`
2. Select: quantity (10-1000), card value ($10-$500), pool name, provider
3. System creates Stripe checkout session (`purchase-gift-cards`)
4. On payment success, `stripe-webhook` creates a new `gift_card_pools` record
5. Cards provisioned on-demand from Tillo when assigned to recipients

### 3.4 Pool Management
- **Master Pools** (`is_master_pool = true`): Admin-owned card inventory
- **Client Pools** (`is_master_pool = false`): Cards allocated to specific clients
- **Transfer/Sell**: `SellGiftCardsDialog` → `transfer-admin-cards` edge function
  - Moves N cards from master pool to client pool
  - Deducts from client wallet (`clients.credits`)
  - Records in `admin_card_sales` with profit calculation

### 3.5 Monitoring
- **Balance Checks**: `PoolDetailDialog` → calls `check-gift-card-balance` or `check-inventory-card-balance`
- **System Health**: `monitor-gift-card-system` checks inventory levels, credit balances, provisioning failures
- **Stuck Cards**: `cleanup-stuck-gift-cards` releases cards stuck in intermediate states (default: 60 min timeout)
- **Export**: `export-pool-cards` generates CSV (admin sees full codes, non-admins see masked)

### 3.6 Revocation
1. Admin selects a provisioned card → `revoke-gift-card`
2. Must provide reason (min 10 characters)
3. Card returned to inventory (`status = 'available'`) if applicable
4. Full audit trail in `gift_card_revoke_log`

---

## 4. Client Workflow

### 4.1 Enable Gift Cards
1. Navigate to Client Gift Cards settings (`ClientGiftCards` page)
2. View all admin-enabled brands grouped by category
3. Toggle individual denominations on/off
4. Each toggle creates/updates `client_available_gift_cards` record
5. Enabled cards become available for campaigns

### 4.2 Marketplace Purchase
1. Browse `ClientMarketplace` → shows available master pools
2. Pools displayed with: brand, card value, sale price, markup %, available quantity
3. Click "Purchase" → `PurchaseGiftCard` page
4. Enter quantity (between minimum and available)
5. System checks wallet balance, shows "after purchase" projection
6. Calls `transfer-admin-cards` → deducts from `clients.credits`
7. Cards assigned to client's pool

### 4.3 Campaign Usage
1. Configure campaign conditions with gift card brand and denomination
2. When conditions are met, system auto-provisions via `provision-gift-card-unified`
3. Card assigned to recipient, delivery via SMS or email

---

## 5. End-User (Recipient) Workflow

### 5.1 Receiving a Code
- Recipient receives a redemption code via SMS or email after campaign provisioning
- Code format: 4-50 alphanumeric characters with optional hyphens

### 5.2 Redemption via Embed Widget
1. User visits embed page: `/gift-cards/redeem/:campaignId` (`EmbedGiftCard.tsx`)
2. Enters their redemption code
3. Frontend calls `redeem-gift-card-embed` (public, no auth)
4. Backend: validates format → rate limit check (10/5min) → searches both `gift_cards` and `gift_card_inventory` tables → checks status → marks as claimed/delivered
5. On success: card details revealed (card code, card number, value, provider)
6. Zapier event dispatched for automation

### 5.3 Redemption via Call Center
1. Call center agent validates code via `validate-redemption-code` (20 attempts/min rate limit)
2. Returns: recipient info, existing cards, available conditions, SMS opt-in status
3. Agent provisions card via `provision-gift-card-unified` with `entryPoint: 'call_center'`
4. Automatic SMS delivery of card details

### 5.4 Security Measures
- Rate limiting on all public endpoints (5-20 attempts per window)
- Code sanitization (uppercase, alphanumeric only)
- Approval status checking (pending, rejected, approved)
- SMS opt-in compliance (TCPA: 180-day recency requirement)

---

## 6. Provisioning Lifecycle (12-Step Flow)

Source: `supabase/functions/_shared/business-rules/gift-card-provisioning.ts`

```
Step 1:  Validate Input Parameters
         → campaignId, recipientId, brandId, denomination required
         → Error: GC-012 if missing

Step 2:  Get Billing Entity
         → RPC call 'get_billing_entity_for_campaign'
         → Returns: entity_type (agency|client), entity_id, entity_name
         → Error: GC-008 if not found

Step 3:  Check Entity Credits
         → Query agencies/clients table for credits
         → Warns if insufficient (non-blocking)
         → Error: GC-006 if critically insufficient

Step 4:  Get Brand Details
         → Query gift_card_brands by brandId
         → Verify is_enabled_by_admin = true
         → Error: GC-002 if not found or disabled

Step 5:  Check Inventory Availability
         → RPC call 'get_inventory_count' for brand+denomination
         → Returns count of available cards

Step 6:  Claim from Inventory
         → Find available card: status='available', unassigned
         → Optimistic locking: UPDATE WHERE status='available'
         → Set status='assigned', assigned_to_recipient_id, assigned_at
         → Error: GC-003 if no cards available

Step 7:  Check Tillo Configuration (skipped if inventory claimed)
         → Verify TILLO_API_KEY and TILLO_SECRET_KEY set
         → Error: GC-004 if not configured

Step 8:  Provision from Tillo API (skipped if inventory claimed)
         → HMAC-SHA256 authenticated POST to /orders
         → Error: GC-005 if API call fails

Step 9:  Save Tillo Card to Inventory (skipped if inventory claimed)
         → Insert Tillo response into gift_card_inventory

Step 10: Get Pricing Configuration
         → Query gift_card_denominations for custom pricing
         → Calculate: amountBilled (face value or custom)
         → Cost basis defaults to 95% of denomination

Step 11: Record Billing Transaction
         → Insert into gift_card_billing_ledger
         → Non-blocking: billing failure doesn't stop provisioning
         → Profit = amountBilled - costBasis

Step 12: Finalize and Return Result
         → Return: card details, billing info, source (inventory|tillo)
```

---

## 7. Database Schema Reference

### Core Tables

**`gift_card_inventory`** (primary card model)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| card_code | text | The actual gift card code |
| card_number | text | Optional card number |
| brand_id | uuid | FK to gift_card_brands |
| denomination | numeric | Face value in dollars |
| status | text | available, assigned, delivered, expired, revoked |
| assigned_to_recipient_id | uuid | FK to recipients |
| assigned_to_campaign_id | uuid | FK to campaigns |
| assigned_at | timestamptz | When card was claimed |
| current_balance | numeric | Last known balance |
| last_balance_check | timestamptz | When balance was last checked |
| balance_check_status | text | success, error, pending |
| expiration_date | date | Card expiry |

**`gift_card_brands`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| brand_name | text | Display name |
| brand_code | text | Internal code |
| tillo_brand_code | text | Tillo API brand identifier |
| provider | text | Card provider name |
| logo_url | text | Brand logo |
| is_enabled_by_admin | boolean | Whether brand is active |
| balance_check_method | text | tillo_api, other_api, manual |
| balance_check_api_endpoint | text | Custom API endpoint |
| balance_check_config | jsonb | API configuration |

**`gift_card_denominations`**
| Column | Type | Description |
|--------|------|-------------|
| brand_id | uuid | FK to gift_card_brands |
| denomination | numeric | Face value |
| cost_basis | numeric | Wholesale cost (default: 95% of face) |
| use_custom_pricing | boolean | Whether to use custom pricing |
| client_price | numeric | Custom price for clients |
| agency_price | numeric | Custom price for agencies |

**`gift_card_pools`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to clients |
| brand_id | uuid | FK to gift_card_brands |
| pool_name | text | Display name |
| card_value | numeric | Face value per card |
| provider | text | Card provider |
| is_master_pool | boolean | Admin-owned master pool |
| available_cards | integer | Count of available cards |
| total_cards | integer | Total cards in pool |
| claimed_cards | integer | Cards that have been claimed |
| low_stock_threshold | integer | Alert threshold |
| pool_type | text | csv, api, etc. |
| is_active | boolean | Whether pool is active |

**`gift_cards`** (legacy model - pool-based)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| pool_id | uuid | FK to gift_card_pools |
| card_code | text | The actual gift card code |
| card_number | text | Optional card number |
| status | text | available, assigned, claimed, redeemed, delivered |
| current_balance | numeric | Last known balance |
| claimed_at | timestamptz | When claimed |
| delivered_at | timestamptz | When delivered |
| expires_at | timestamptz | Expiration |

### Junction Tables

**`recipient_gift_cards`**
| Column | Type | Description |
|--------|------|-------------|
| recipient_id | uuid | FK to recipients |
| campaign_id | uuid | FK to campaigns |
| inventory_card_id | uuid | FK to gift_card_inventory |
| gift_card_id | uuid | FK to gift_cards (legacy) |
| condition_id | uuid | FK to campaign_conditions |
| delivery_status | text | pending, sent, delivered, revoked |
| delivery_method | text | sms, email |
| delivered_at | timestamptz | Delivery timestamp |
| revoked_at | timestamptz | Revocation timestamp |
| revoked_by | uuid | FK to auth.users |
| revoke_reason | text | Reason for revocation |

**`client_available_gift_cards`**
| Column | Type | Description |
|--------|------|-------------|
| client_id | uuid | FK to clients |
| brand_id | uuid | FK to gift_card_brands |
| denomination | numeric | Enabled denomination |

### Financial Tables

**`gift_card_billing_ledger`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| transaction_type | text | purchase_from_inventory, tillo_provision, etc. |
| billed_entity_type | text | agency or client |
| billed_entity_id | uuid | FK to agencies/clients |
| campaign_id | uuid | FK to campaigns |
| recipient_id | uuid | FK to recipients |
| brand_id | uuid | FK to gift_card_brands |
| denomination | numeric | Card face value |
| amount_billed | numeric | Amount charged |
| cost_basis | numeric | Wholesale cost |
| inventory_card_id | uuid | FK to gift_card_inventory |
| billed_at | timestamptz | Transaction time |
| metadata | jsonb | Additional context |

**`admin_card_sales`** - Records admin-to-client transfers with pricing

### Audit Tables

**`gift_card_audit_log`** - General audit trail for all mutations
**`gift_card_revoke_log`** - Revocation-specific audit with full snapshot
**`gift_card_redemptions`** - Tracks all code validation/redemption attempts
**`gift_card_balance_history`** - Legacy card balance changes
**`gift_card_inventory_balance_history`** - Inventory card balance changes
**`system_alerts`** - Generated by monitoring function

---

## 8. Edge Function Reference

| Function | Purpose | Auth | Tables | External |
|----------|---------|------|--------|----------|
| `provision-gift-card-unified` | Core provisioning (standard, call_center, api_test) | Auth required | gift_card_inventory, gift_card_brands, gift_card_billing_ledger | Tillo API |
| `provision-gift-card-from-api` | API-triggered provisioning | Auth required | gift_card_inventory | Tillo API |
| `purchase-gift-cards` | Create Stripe checkout session | Auth + client access | gift_card_pools | Stripe |
| `stripe-webhook` | Handle Stripe payment events | Signature verification | gift_card_pools | Stripe |
| `import-gift-cards` | Bulk CSV import | Admin | gift_cards, gift_card_pools | - |
| `export-pool-cards` | CSV export with masking | Auth (scoped) | gift_cards, gift_card_pools | - |
| `transfer-admin-cards` | Master pool → client transfer | Admin | gift_cards, gift_card_pools, clients, admin_card_sales | - |
| `check-gift-card-balance` | Legacy card balance check | Platform admin | gift_cards, gift_card_balance_history | Tillo API |
| `check-inventory-card-balance` | Inventory card balance check | Platform admin | gift_card_inventory, gift_card_inventory_balance_history | Tillo API, Generic API |
| `validate-gift-card-code` | Landing page code validation | Public (rate-limited) | recipients, campaigns, gift_card_deliveries, gift_card_redemptions | - |
| `validate-redemption-code` | Call center code validation | Public (rate-limited) | recipients, campaigns, recipient_gift_cards, campaign_conditions | - |
| `redeem-gift-card-embed` | Embedded widget redemption | Public (rate-limited) | gift_cards, gift_card_inventory, gift_card_brands | Zapier |
| `revoke-gift-card` | Admin card revocation | Admin | recipient_gift_cards, gift_card_inventory, gift_card_revoke_log | - |
| `cleanup-stuck-gift-cards` | Release stuck cards | Service (no auth) | gift_card_inventory | - |
| `monitor-gift-card-system` | System health monitoring | Service (no auth) | gift_card_pools, credit_accounts, gift_card_redemptions, system_alerts | - |
| `lookup-tillo-brand` | Tillo brand search | Platform admin | - | Tillo API |
| `diagnose-provisioning-setup` | Diagnose campaign config | Auth required | campaigns, gift_card_brands, gift_card_inventory | - |

---

## 9. Integration Points

### 9.1 Tillo API
- **Base URL**: `https://api.tillo.tech/v2`
- **Authentication**: HMAC-SHA256 signature with timestamp
  - Headers: `API-Key`, `Signature`, `Timestamp`
- **Endpoints Used**:
  - `POST /orders` - Provision a new card (returns card code, number, transaction ID)
  - `POST /balance` - Check card balance
- **Environment Variables**: `TILLO_API_KEY`, `TILLO_SECRET_KEY`, `TILLO_BASE_URL`
- **Client**: `supabase/functions/_shared/tillo-client.ts` (singleton pattern)

### 9.2 Stripe
- **SDK Version**: v14.21.0
- **Flow**: Create checkout session → user pays → webhook callback
- **Webhook Events**:
  - `checkout.session.completed` → Create pool record
  - `payment_intent.succeeded` → Mark as processed
  - `payment_intent.payment_failed` → Log error
- **Metadata Passed**: clientId, quantity, cardValue, poolName, provider, userId, type
- **Security**: Webhook signature verification via `stripe.webhooks.constructEvent()`

### 9.3 Zapier
- **Trigger**: Gift card redeemed via embed widget
- **Event Type**: `gift_card.redeemed`
- **Payload**: gift_card_id, card_code, value, provider, redeemed_at
- **Invoked Via**: `supabase.functions.invoke('dispatch-zapier-event')`

---

## 10. Error Codes & Troubleshooting

### Provisioning Error Codes

| Code | Description | Severity | Resolution |
|------|-------------|----------|------------|
| GC-001 | Missing campaign condition configuration (brand_id or card_value is NULL) | Critical | Edit campaign conditions to set brand and denomination |
| GC-002 | Gift card brand not found in database | Error | Verify brand exists and is enabled |
| GC-003 | No gift card inventory available for this brand and denomination | Error | Upload more cards or check denomination availability |
| GC-004 | Tillo API credentials not configured | Critical | Set TILLO_API_KEY and TILLO_SECRET_KEY environment variables |
| GC-005 | Tillo API call failed | Error | Check Tillo API status and credentials |
| GC-006 | Insufficient client/agency credits for this purchase | Critical | Add credits to the billing entity |
| GC-007 | Billing transaction recording failed | Error | Check gift_card_billing_ledger table permissions |
| GC-008 | Campaign not found or no billing entity configured | Error | Verify campaign has a client or agency assigned |
| GC-009 | Recipient verification required | Warning | Recipient needs SMS opt-in or email verification |
| GC-010 | Gift card already provisioned for this recipient | Warning | Expected for duplicate prevention |
| GC-011 | Invalid redemption code | Warning | User entered wrong code |
| GC-012 | Missing required parameters | Error | Ensure campaignId, recipientId, brandId, denomination provided |
| GC-013 | Database function call failed | Error | Check RPC function exists and has correct permissions |
| GC-014 | SMS/Email delivery failed | Error | Check SMS/email provider configuration |
| GC-015 | Unknown provisioning error | Error | Check server logs for details |

### Monitoring Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| CSV pool cards | 0 | Critical |
| CSV pool cards | < 10 | Warning |
| CSV pool cards | < 50 | Info |
| Agency credits | $0 | Critical |
| Agency credits | < $1,000 | Warning |
| Client credits | $0 | Critical |
| Client credits | < $500 | Info |
| Campaign credits | $0 | Critical |
| Campaign credits | < $100 | Info |

---

## 11. Known Issues & Technical Debt

### Dual Card Model
The system has two parallel card storage models:
- **`gift_cards`** (legacy): Pool-based, used by import/export/transfer functions
- **`gift_card_inventory`** (new): Brand/denomination-based, used by provisioning

This causes duplicate queries, separate balance check functions, and potential confusion. A migration to unify on `gift_card_inventory` is recommended.

### Tillo Brand Lookup Mock Data
`lookup-tillo-brand/index.ts` returns hardcoded mock data (Starbucks, Amazon, Target) instead of querying the real Tillo API. The real API integration code exists but is commented out.

### Key Frontend Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/core/api/hooks/useGiftCardAPI.ts` | 765 | All API hooks (13 mutations, 5 queries) |
| `src/features/gift-cards/hooks/useIndividualCardInventory.ts` | 607 | Card CRUD + balance operations |
| `src/pages/PurchaseGiftCard.tsx` | 412 | Client marketplace checkout |
| `src/features/gift-cards/components/GiftCardTesting.tsx` | 345 | Testing harness |
| `src/features/gift-cards/components/PoolDetailDialog.tsx` | 299 | Pool management dialog |
| `src/features/gift-cards/components/SellGiftCardsDialog.tsx` | 261 | Admin sell-to-client flow |
| `src/features/gift-cards/components/GiftCardUploadTab.tsx` | 233 | CSV upload interface |
| `src/features/gift-cards/components/ClientMarketplace.tsx` | 230 | Client shopping view |
| `src/pages/ClientGiftCards.tsx` | 216 | Client brand enablement |
| `src/features/gift-cards/components/PurchaseGiftCardsDialog.tsx` | 195 | Tillo purchase dialog |
| `src/pages/EmbedGiftCard.tsx` | 162 | Public redemption embed |

### Key Backend Files

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/business-rules/gift-card-provisioning.ts` | 12-step provisioning core logic |
| `supabase/functions/_shared/business-rules/gift-card-rules.ts` | Validation rules, eligibility checks, monitoring thresholds |
| `supabase/functions/_shared/tillo-client.ts` | Tillo API client with HMAC auth |
| `supabase/functions/_shared/error-logger.ts` | GC-001 to GC-015 error code definitions |
| `supabase/functions/provision-gift-card-unified/index.ts` | Unified provisioning entry point |
| `supabase/functions/redeem-gift-card-embed/index.ts` | Public embed redemption (queries both card models) |
| `supabase/functions/transfer-admin-cards/index.ts` | Admin-to-client card transfers |
| `supabase/functions/monitor-gift-card-system/index.ts` | System health and alerts |
