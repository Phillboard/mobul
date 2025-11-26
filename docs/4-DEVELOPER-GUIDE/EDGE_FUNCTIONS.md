# Edge Functions

## Overview

Edge Functions are serverless functions that run on Deno Deploy, providing backend logic for the Mobul ACE Platform. They handle API endpoints, webhooks, scheduled tasks, and integrations with external services.

---

## Edge Function Basics

### Function Structure

Standard edge function template:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) throw authError

    // Parse request body
    const body = await req.json()

    // Your business logic here
    const result = await processRequest(body, user)

    // Return response
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
```

### CORS Headers

Shared CORS configuration (`supabase/functions/_shared/cors.ts`):

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

---

## Authentication

### User Authentication

Validate JWT tokens:

```typescript
// Get user from authorization header
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')

const { data: { user }, error } = await supabase.auth.getUser(token)

if (error || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: corsHeaders }
  )
}

// User is authenticated
console.log('User ID:', user.id)
console.log('Email:', user.email)
```

### Service Role Authentication

For admin operations, use service role key:

```typescript
// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// This can access all data regardless of RLS policies
const { data } = await supabaseAdmin
  .from('campaigns')
  .select('*')
```

**Warning:** Use service role carefully! It bypasses all security policies.

### API Key Authentication

For external integrations:

```typescript
// Validate API key
const apiKey = req.headers.get('X-API-Key')

const { data: key, error } = await supabase
  .from('api_keys')
  .select('*, client:clients(*)')
  .eq('key_hash', hashApiKey(apiKey))
  .eq('revoked', false)
  .single()

if (error || !key) {
  return new Response(
    JSON.stringify({ error: 'Invalid API key' }),
    { status: 401 }
  )
}

// API key is valid
const clientId = key.client_id
```

---

## Database Operations

### Querying Data

```typescript
// Simple select
const { data: campaigns, error } = await supabase
  .from('campaigns')
  .select('*')
  .eq('client_id', clientId)
  .order('created_at', { ascending: false })

// Join with related tables
const { data: recipients, error } = await supabase
  .from('recipients')
  .select(`
    *,
    campaign:campaigns(*),
    contact:contacts(*)
  `)
  .eq('campaign_id', campaignId)

// Complex query
const { data, error } = await supabase
  .from('gift_cards')
  .select('*, pool:gift_card_pools(*, brand:gift_card_brands(*))')
  .eq('status', 'available')
  .gte('created_at', startDate)
  .limit(100)
```

### Inserting Data

```typescript
// Single insert
const { data, error } = await supabase
  .from('call_sessions')
  .insert({
    campaign_id: campaignId,
    caller_phone: phone,
    call_status: 'ringing',
  })
  .select()
  .single()

// Bulk insert
const recipients = contacts.map(c => ({
  campaign_id: campaignId,
  redemption_token: generateToken(),
  email: c.email,
  phone: c.phone,
}))

const { data, error } = await supabase
  .from('recipients')
  .insert(recipients)
  .select()
```

### Updating Data

```typescript
// Update single record
const { data, error } = await supabase
  .from('gift_cards')
  .update({
    status: 'delivered',
    delivered_at: new Date().toISOString(),
  })
  .eq('id', giftCardId)
  .select()
  .single()

// Update multiple records
const { data, error } = await supabase
  .from('recipients')
  .update({ status: 'delivered' })
  .eq('campaign_id', campaignId)
  .in('id', recipientIds)
```

### Calling RPC Functions

```typescript
// Call database function
const { data, error } = await supabase
  .rpc('calculate_campaign_metrics', {
    p_campaign_id: campaignId
  })

// Function with multiple parameters
const { data, error } = await supabase
  .rpc('assign_gift_cards_to_recipients', {
    p_campaign_id: campaignId,
    p_pool_id: poolId,
    p_quantity: 100
  })
```

---

## External API Integrations

### Twilio (SMS & Calls)

Send SMS:

```typescript
async function sendSMS(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')

  const auth = btoa(`${accountSid}:${authToken}`)

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: body,
      }),
    }
  )

  return response.json()
}
```

Make phone call:

```typescript
async function makeCall(to: string, twimlUrl: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')

  const auth = btoa(`${accountSid}:${authToken}`)

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Url: twimlUrl,
      }),
    }
  )

  return response.json()
}
```

### PostGrid (Mail Vendor)

Submit mail order:

```typescript
async function submitMailOrder(campaign: Campaign, recipients: Recipient[]) {
  const apiKey = Deno.env.get('POSTGRID_API_KEY')

  const response = await fetch('https://api.postgrid.com/v1/letters', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template: campaign.template_id,
      to: recipients.map(r => ({
        firstName: r.first_name,
        lastName: r.last_name,
        addressLine1: r.address,
        city: r.city,
        provinceOrState: r.state,
        postalOrZip: r.zip,
      })),
      mergeVariables: {
        campaign_name: campaign.name,
        offer_url: `${campaign.base_lp_url}/r/{{redemption_token}}`,
      },
    }),
  })

  return response.json()
}
```

### Tillo (Gift Cards)

Provision gift card:

```typescript
async function provisionGiftCard(brandId: string, amount: number) {
  const apiKey = Deno.env.get('TILLO_API_KEY')

  const response = await fetch('https://api.tillo.io/v2/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      brand_id: brandId,
      amount: amount,
      currency: 'USD',
    }),
  })

  const data = await response.json()

  return {
    code: data.code,
    pin: data.pin,
    expirationDate: data.expiration_date,
  }
}
```

---

## Webhook Handlers

### CRM Webhook

Receive events from external CRM:

```typescript
serve(async (req) => {
  try {
    // Verify webhook signature
    const signature = req.headers.get('X-Webhook-Signature')
    const body = await req.text()
    
    if (!verifyWebhookSignature(body, signature)) {
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(body)

    // Find recipient by CRM contact ID
    const { data: recipient } = await supabase
      .from('recipients')
      .select('*, campaign:campaigns(*)')
      .eq('external_crm_id', event.contact_id)
      .single()

    if (!recipient) {
      return new Response('Recipient not found', { status: 404 })
    }

    // Check if event meets campaign condition
    const { data: condition } = await supabase
      .from('campaign_conditions')
      .select('*')
      .eq('campaign_id', recipient.campaign_id)
      .eq('crm_event_name', event.event_type)
      .single()

    if (condition) {
      // Trigger gift card provisioning
      await provisionGiftCard(recipient.campaign_id, condition.condition_number, recipient.id)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(error.message, { status: 500 })
  }
})
```

### Mail Vendor Webhook

Receive delivery status updates:

```typescript
serve(async (req) => {
  const { letter_id, status, delivered_at } = await req.json()

  // Find recipient by vendor letter ID
  const { data: recipient } = await supabase
    .from('recipients')
    .select('*')
    .eq('vendor_letter_id', letter_id)
    .single()

  if (!recipient) {
    return new Response('Recipient not found', { status: 404 })
  }

  // Update recipient status
  if (status === 'delivered') {
    await supabase
      .from('recipients')
      .update({
        status: 'delivered',
        delivered_at: new Date(delivered_at).toISOString(),
      })
      .eq('id', recipient.id)
  }

  return new Response('OK', { status: 200 })
})
```

---

## Scheduled Functions

### Cron Jobs

Run tasks on schedule:

```typescript
// Deploy with cron schedule
// supabase functions deploy cleanup-stuck-cards --cron="*/10 * * * *"

serve(async () => {
  try {
    // Find cards stuck in 'claimed' for >10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { data: stuckCards } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('status', 'claimed')
      .lt('claimed_at', tenMinutesAgo)

    console.log(`Found ${stuckCards?.length || 0} stuck cards`)

    // Release stuck cards
    if (stuckCards && stuckCards.length > 0) {
      await supabase
        .from('gift_cards')
        .update({
          status: 'available',
          recipient_id: null,
          claimed_at: null,
        })
        .in('id', stuckCards.map(c => c.id))

      console.log(`Released ${stuckCards.length} stuck cards`)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(error.message, { status: 500 })
  }
})
```

Common cron schedules:
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Daily at midnight
- `0 2 * * *` - Daily at 2 AM
- `0 0 * * 0` - Weekly on Sunday

---

## Error Handling

### Try-Catch Patterns

```typescript
serve(async (req) => {
  try {
    // Attempt operation
    const result = await riskyOperation()
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Log error for debugging
    console.error('Error:', error)

    // Return user-friendly error
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Validation Errors

```typescript
// Validate input
if (!body.campaignId) {
  return new Response(
    JSON.stringify({ error: 'campaignId is required' }),
    { status: 400 }
  )
}

if (!body.email || !isValidEmail(body.email)) {
  return new Response(
    JSON.stringify({ error: 'Valid email is required' }),
    { status: 400 }
  )
}
```

### Retry Logic

```typescript
async function retryOperation(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      
      // Exponential backoff
      const delay = Math.pow(2, i) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Usage
const result = await retryOperation(() => sendSMS(phone, message))
```

---

## Testing Edge Functions

### Local Testing

```bash
# Start function locally
supabase functions serve send-gift-card-sms --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/send-gift-card-sms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"giftCardId": "123", "recipientPhone": "+1234567890"}'
```

### Unit Tests

```typescript
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"

Deno.test("generateRedemptionToken returns 8 characters", () => {
  const token = generateRedemptionToken()
  assertEquals(token.length, 8)
})

Deno.test("validateEmail rejects invalid emails", () => {
  assertEquals(validateEmail("invalid"), false)
  assertEquals(validateEmail("test@example.com"), true)
})
```

---

## Best Practices

1. **Handle CORS** - Always include CORS headers
2. **Validate input** - Check all inputs before processing
3. **Use try-catch** - Wrap risky operations
4. **Log errors** - Use console.error for debugging
5. **Return proper status codes** - 200, 400, 401, 500
6. **Use service role sparingly** - Only when necessary
7. **Implement retries** - For external API calls
8. **Set timeouts** - Prevent hanging requests
9. **Keep functions focused** - One function, one purpose
10. **Document thoroughly** - Comment complex logic

---

## Related Documentation

- [Development Setup](/admin/docs/developer-guide/setup)
- [Database Operations](/admin/docs/developer-guide/database)
- [REST API](/admin/docs/api-reference/rest-api)
- [Webhooks](/admin/docs/api-reference/webhooks)
