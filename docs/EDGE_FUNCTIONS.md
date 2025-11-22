# Edge Functions Reference

Complete reference for all edge functions in the system. Edge functions are serverless functions powered by Deno that handle backend logic, external API calls, and complex operations.

## Configuration

Edge function authentication is configured in `supabase/config.toml`:
- `verify_jwt = true`: Requires authenticated user
- `verify_jwt = false`: Public endpoint

## Function Categories

### Campaign & Mail Operations

#### generate-recipient-tokens
**Purpose**: Generate unique PURL tokens for campaign recipients

**Authentication**: Yes (`verify_jwt = true`)

**Called by**: Campaign launch process

**Request Body**:
```json
{
  "campaignId": "uuid",
  "audienceId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "tokens_generated": 1000
}
```

**Database Operations**:
- Updates `recipients.purl_token` with unique tokens
- Ensures tokens are unique across all campaigns

**Error Handling**:
- Returns 400 if campaign/audience not found
- Returns 500 on database error

---

#### track-mail-delivery
**Purpose**: Log mail delivery events from vendor

**Authentication**: No (webhook endpoint)

**Called by**: Mail vendor webhook

**Request Body**:
```json
{
  "campaign_id": "uuid",
  "recipient_id": "uuid",
  "delivered_at": "2025-01-15T10:00:00Z",
  "tracking_id": "USPS123456"
}
```

**Response**:
```json
{
  "success": true,
  "event_id": "uuid"
}
```

**Database Operations**:
- Inserts record into `events` table with type `mail_delivered`
- Triggers time-delayed conditions if configured

---

### Landing Pages & PURLs

#### handle-purl
**Purpose**: Handle personalized URL (PURL) visits

**Authentication**: No (public endpoint)

**Called by**: `PURLLandingPage` component

**Request Body**:
```json
{
  "token": "unique-token-string",
  "campaignId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "recipient": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    ...
  },
  "landing_page": {
    "html_content": "<html>...</html>",
    "form_fields": [...]
  }
}
```

**Database Operations**:
- Validates token against `recipients` table
- Logs `landing_page_visit` event to `events`
- Fetches landing page content from `landing_pages`

**Error Handling**:
- Returns 404 if token invalid
- Returns 410 if campaign expired

---

#### submit-lead-form
**Purpose**: Process landing page form submissions

**Authentication**: No (public endpoint)

**Called by**: Landing page form submit

**Request Body**:
```json
{
  "campaignId": "uuid",
  "recipientId": "uuid",
  "formData": {
    "email": "user@example.com",
    "phone": "+15551234567",
    "custom_field": "value"
  }
}
```

**Response**:
```json
{
  "success": true,
  "submission_id": "uuid"
}
```

**Database Operations**:
- Logs `form_submitted` event to `events`
- Stores form data in `event_data_json`
- Triggers webhooks if configured
- Triggers CRM integration

**External APIs**:
- Webhook destinations (if configured)
- Zapier (if connected)

---

#### generate-landing-page
**Purpose**: Generate landing page using AI

**Authentication**: Yes

**Called by**: Landing page AI editor

**Request Body**:
```json
{
  "prompt": "Create a landing page for a dental practice offering teeth whitening",
  "clientId": "uuid",
  "brandKit": {
    "colors": {...},
    "fonts": {...}
  }
}
```

**Response**:
```json
{
  "success": true,
  "html": "<html>...</html>",
  "css": "...",
  "js": "..."
}
```

**External APIs**:
- Gemini API for content generation

---

### Gift Cards

#### transfer-admin-cards
**Purpose**: Transfer gift cards from master pool to client pool

**Authentication**: Yes (admin only)

**Called by**: `PurchasePoolDialog` component

**Request Body**:
```json
{
  "masterPoolId": "uuid",
  "clientId": "uuid",
  "quantity": 100,
  "pricePerCard": 24.50,
  "notes": "Q1 2025 purchase"
}
```

**Response**:
```json
{
  "success": true,
  "client_pool_id": "uuid",
  "cards_transferred": 100,
  "total_cost": 2450.00
}
```

**Database Operations**:
- Creates new `gift_card_pools` record for client
- Updates `gift_cards.pool_id` to new client pool
- Inserts `admin_card_sales` record for tracking
- Updates master pool `available_cards` count

**Business Logic**:
- Calculates profit margin
- Validates sufficient cards available
- Ensures price covers cost

---

#### check-gift-card-balance
**Purpose**: Check current balance of gift card via API

**Authentication**: Yes

**Called by**: `PoolDetailDialog` balance check button

**Request Body**:
```json
{
  "cardId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "card_number": "****1234",
  "current_balance": 25.00,
  "original_balance": 25.00,
  "status": "active"
}
```

**Database Operations**:
- Updates `gift_cards.current_balance`
- Inserts `gift_card_balance_history` record
- Updates `gift_cards.last_balance_check`

**External APIs**:
- Tillo balance check API
- Provider-specific balance APIs

**Error Handling**:
- Logs error to `gift_card_balance_history` if API fails
- Updates `balance_check_status` to 'failed'

---

#### export-pool-cards
**Purpose**: Export gift card pool to CSV

**Authentication**: Yes

**Called by**: `PoolDetailDialog` export button

**Request Body**:
```json
{
  "poolId": "uuid",
  "includeRedeemed": false
}
```

**Response**: CSV file download
```csv
Brand,Card Number,PIN,Value,Status,Delivered To
Amazon,****1234,****5678,$25,available,
Starbucks,****2345,****6789,$25,delivered,+15551234567
```

**Database Operations**:
- Queries `gift_cards` for pool
- Masks sensitive data for non-admins
- Logs export in audit log

**Security**:
- Admins see full card codes
- Clients see masked codes (last 4 digits)

---

#### send-gift-card-sms
**Purpose**: Send gift card via SMS using Twilio

**Authentication**: No (called by system)

**Called by**: Condition trigger system

**Request Body**:
```json
{
  "deliveryId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "message_sid": "SM1234567890",
  "status": "sent"
}
```

**Database Operations**:
- Updates `gift_card_deliveries` with Twilio SID
- Updates delivery status
- Updates gift card status to 'delivered'

**External APIs**:
- Twilio SMS API

**Error Handling**:
- Retries up to 3 times on failure
- Logs error details to `gift_card_deliveries.sms_error_message`

---

#### validate-gift-card-code
**Purpose**: Validate gift card code for redemption

**Authentication**: No (public endpoint)

**Called by**: `GiftCardReveal` page

**Request Body**:
```json
{
  "code": "ABC123DEF456",
  "campaignId": "uuid",
  "recipientId": "uuid"
}
```

**Response**:
```json
{
  "valid": true,
  "card_details": {
    "brand": "Amazon",
    "value": 25.00,
    "balance": 25.00
  }
}
```

**Database Operations**:
- Validates code against `gift_cards`
- Checks if card belongs to campaign
- Logs redemption attempt

---

#### claim-and-provision-card
**Purpose**: Claim available card from pool and prepare for delivery

**Authentication**: No (called by system)

**Called by**: Condition completion workflow

**Request Body**:
```json
{
  "poolId": "uuid",
  "recipientId": "uuid",
  "callSessionId": "uuid",
  "conditionNumber": 1
}
```

**Response**:
```json
{
  "success": true,
  "card_id": "uuid",
  "delivery_id": "uuid"
}
```

**Database Operations**:
- Selects available card from pool (status='available')
- Updates card status to 'claimed'
- Creates `gift_card_deliveries` record
- Updates pool counts

**Business Logic**:
- Atomic transaction to prevent race conditions
- Returns error if no cards available

---

### Call Tracking

#### handle-incoming-call
**Purpose**: Handle Twilio incoming call webhook

**Authentication**: No (webhook endpoint)

**Called by**: Twilio

**Request Body**: Twilio webhook POST data
```
From=+15551234567
To=+15559876543
CallSid=CA1234567890abcdef
```

**Response**: TwiML
```xml
<Response>
  <Say>Please hold while we connect you</Say>
  <Dial>+15551111111</Dial>
</Response>
```

**Database Operations**:
- Creates `call_sessions` record
- Looks up `tracked_phone_numbers` to find campaign
- Attempts to match caller to recipient

**Matching Logic**:
1. Exact phone match → status='matched'
2. Multiple matches → status='multiple'
3. No match → status='unmatched'

---

#### update-call-status
**Purpose**: Update call status from Twilio webhooks

**Authentication**: No (webhook endpoint)

**Called by**: Twilio status callback

**Request Body**: Twilio webhook POST data
```
CallSid=CA1234567890abcdef
CallStatus=completed
CallDuration=120
RecordingUrl=https://...
```

**Response**:
```json
{
  "success": true
}
```

**Database Operations**:
- Updates `call_sessions` with duration, status, recording URL

---

#### complete-call-disposition
**Purpose**: Agent marks call disposition and condition met

**Authentication**: Yes

**Called by**: `CompleteCallDialog` component

**Request Body**:
```json
{
  "callSessionId": "uuid",
  "disposition": "qualified",
  "notes": "Customer interested in teeth whitening",
  "conditionsMet": [1, 2]
}
```

**Response**:
```json
{
  "success": true,
  "gift_cards_triggered": 2
}
```

**Database Operations**:
- Updates `call_sessions` with notes
- Creates `call_conditions_met` records
- Triggers `claim-and-provision-card` for each condition
- Triggers `send-gift-card-sms`

---

### CRM & Integrations

#### crm-webhook-receiver
**Purpose**: Receive webhooks from external CRMs

**Authentication**: No (webhook endpoint, validates webhook secret)

**Called by**: External CRM systems

**Request Body**: Variable based on CRM
```json
{
  "event_type": "deal_closed",
  "contact_email": "john@example.com",
  "deal_value": 5000,
  ...
}
```

**Response**:
```json
{
  "success": true,
  "processed": true
}
```

**Database Operations**:
- Inserts `crm_events` record
- Looks up matching recipient by email/phone
- Checks if event matches `campaign_conditions.crm_event_name`
- Triggers condition if match found

**Security**:
- Validates webhook secret from `crm_integrations` table

---

#### trigger-webhook
**Purpose**: Send outgoing webhook to configured endpoints

**Authentication**: No (called by system)

**Called by**: Event triggers (form submission, condition met, etc.)

**Request Body**:
```json
{
  "webhook_id": "uuid",
  "event_type": "form_submitted",
  "payload": {...}
}
```

**Response**:
```json
{
  "success": true,
  "response_status": 200
}
```

**External APIs**:
- Customer-configured webhook URLs

**Error Handling**:
- Retries 3 times with exponential backoff
- Logs failures to `webhook_deliveries` table

---

#### dispatch-zapier-event
**Purpose**: Send event to Zapier

**Authentication**: No (called by system)

**Called by**: Event triggers

**Request Body**:
```json
{
  "connection_id": "uuid",
  "event_type": "lead_captured",
  "data": {...}
}
```

**Response**:
```json
{
  "success": true
}
```

**External APIs**:
- Zapier webhook URL (from `zapier_connections` table)

---

#### zapier-incoming-webhook
**Purpose**: Receive data from Zapier zaps

**Authentication**: No (webhook endpoint, validates connection)

**Called by**: Zapier

**Request Body**: Variable based on Zap
```json
{
  "connection_id": "uuid",
  "action": "create_contact",
  "data": {...}
}
```

**Response**:
```json
{
  "success": true,
  "record_id": "uuid"
}
```

**Database Operations**:
- Creates records in appropriate tables based on action
- Validates connection exists in `zapier_connections`

---

### Templates & Design

#### generate-template-design
**Purpose**: Generate mail template design using AI

**Authentication**: Yes

**Called by**: `AITemplateDialog` component

**Request Body**:
```json
{
  "prompt": "Create a 4x6 postcard for a dental practice promoting teeth whitening special",
  "size": "4x6",
  "clientId": "uuid",
  "templateId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "layers": [...],
  "thumbnail_url": "https://..."
}
```

**External APIs**:
- Gemini API for design generation
- DALL-E API for image generation (if needed)

**Database Operations**:
- Updates `templates.json_layers`
- Creates `design_versions` record

---

#### regenerate-template-element
**Purpose**: Regenerate specific element in template using AI

**Authentication**: Yes

**Called by**: `RegenerateElementDialog` component

**Request Body**:
```json
{
  "templateId": "uuid",
  "layerId": "layer-123",
  "prompt": "Make this headline more compelling"
}
```

**Response**:
```json
{
  "success": true,
  "updated_layer": {
    "id": "layer-123",
    "text": "Transform Your Smile in Just One Visit!",
    ...
  }
}
```

**External APIs**:
- Gemini API for content regeneration

---

### User Management

#### send-user-invitation
**Purpose**: Send email invitation to new user

**Authentication**: Yes (admin/agency_owner only)

**Called by**: `InviteUserDialog` component

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "role": "user",
  "clientIds": ["uuid1", "uuid2"],
  "invitedBy": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "invitation_id": "uuid"
}
```

**Database Operations**:
- Creates `user_invitations` record
- Generates unique invitation token

**External APIs**:
- Email service (Resend/SendGrid)

---

#### accept-invitation
**Purpose**: Complete user signup from invitation

**Authentication**: No (public endpoint, validates token)

**Called by**: `AcceptInvite` page

**Request Body**:
```json
{
  "token": "invite-token-string",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "user_id": "uuid"
}
```

**Database Operations**:
- Creates auth user
- Assigns role from invitation
- Creates `client_users` assignments
- Marks invitation as accepted

---

### API & Keys

#### generate-api-key
**Purpose**: Generate API key for client

**Authentication**: Yes

**Called by**: `CreateAPIKeyDialog` component

**Request Body**:
```json
{
  "clientId": "uuid",
  "name": "Production API Key",
  "expiresInDays": 365
}
```

**Response**:
```json
{
  "success": true,
  "api_key": "pk_live_abc123...",
  "key_id": "uuid"
}
```

**Database Operations**:
- Generates secure random key
- Hashes key with bcrypt
- Stores hash in `api_keys` table
- Returns plain key (shown once)

**Security**:
- Key format: `pk_{env}_{random}`
- Only hash stored in database
- User must save key immediately

---

### Twilio Management

#### provision-twilio-number
**Purpose**: Purchase phone number from Twilio

**Authentication**: Yes

**Called by**: `ProvisionNumberDialog` component

**Request Body**:
```json
{
  "clientId": "uuid",
  "areaCode": "555",
  "friendlyName": "Main Campaign Line"
}
```

**Response**:
```json
{
  "success": true,
  "phone_number": "+15551234567",
  "number_id": "uuid"
}
```

**Database Operations**:
- Creates `twilio_phone_numbers` record
- Configures webhook URLs in Twilio

**External APIs**:
- Twilio Phone Numbers API

---

#### assign-tracked-numbers
**Purpose**: Assign tracking numbers to campaign

**Authentication**: No (called by system)

**Called by**: Campaign launch process

**Request Body**:
```json
{
  "campaignId": "uuid",
  "quantity": 5
}
```

**Response**:
```json
{
  "success": true,
  "numbers_assigned": [
    "+15551234567",
    "+15552345678"
  ]
}
```

**Database Operations**:
- Creates `tracked_phone_numbers` records
- Associates numbers with campaign

---

## Error Handling Patterns

All functions follow this error handling pattern:

```typescript
try {
  // Validate input
  if (!input.required_field) {
    return new Response(
      JSON.stringify({ error: "Missing required field" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // Process request
  const result = await doSomething();

  // Success response
  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
} catch (error) {
  console.error('Function error:', error);
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Testing Edge Functions

### Local Testing
```bash
# Start local Supabase
supabase start

# Test function
curl -i --location --request POST 'http://localhost:54321/functions/v1/function-name' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"key":"value"}'
```

### Production Testing
Use `supabase--curl_edge_functions` tool or test from frontend.

## Common Issues & Solutions

### Issue: Function timeout
**Solution**: Optimize database queries, use indexes, break into smaller operations

### Issue: CORS errors
**Solution**: Ensure `corsHeaders` included in all responses, including errors

### Issue: JWT verification fails
**Solution**: Check `config.toml`, ensure frontend passes auth header

### Issue: External API rate limits
**Solution**: Implement caching, queue system, or retry logic
