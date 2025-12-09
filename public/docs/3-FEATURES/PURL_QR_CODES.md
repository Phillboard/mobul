# PURLs & QR Codes

## Overview

Personalized URLs (PURLs) and QR codes enable trackable, recipient-specific landing page experiences. Each recipient receives a unique token that identifies them throughout the campaign journey.

---

## Token Generation

### Redemption Token Format

Unique identifier assigned to each recipient:

```typescript
function generateRedemptionToken(): string {
  // Format: 8 alphanumeric characters
  // Example: A7K9M2P5
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return token;
}
```

**Token Characteristics:**
- **8 characters** - Easy to read over phone
- **Alphanumeric** - No ambiguous characters (0/O, 1/I/l)
- **Unique per recipient** - Database uniqueness constraint
- **Case insensitive** - Stored uppercase, accepts any case

### Token Usage

Tokens serve multiple purposes:
- **PURL identifier** - `https://example.com/r/A7K9M2P5`
- **Redemption code** - Phone verification or web form entry
- **QR code payload** - Encoded in mail piece QR code
- **Attribution tracking** - Links engagement to specific recipient

---

## PURL Structure

### URL Format

**Bridge Mode:**
```
https://yourdomain.com/r/{token}
```

Example: `https://roofingpromo.com/r/A7K9M2P5`

**Redirect Mode:**
```
https://yourdomain.com/external?token={token}
```

Example: `https://roofingpromo.com/external?token=A7K9M2P5`

### PURL Configuration

Set at campaign level:

```typescript
interface PURLConfig {
  base_lp_url: string;           // Base domain
  lp_mode: 'bridge' | 'redirect'; // Landing page mode
  landing_page_id?: string;       // Bridge page design
  utm_source?: string;            // UTM tracking
  utm_medium?: string;
  utm_campaign?: string;
}
```

**Bridge Mode:**
- Platform-hosted landing page
- Personalized content with recipient data
- Lead capture forms
- Gift card reveal on submission

**Redirect Mode:**
- External URL with token parameter
- Useful for existing client websites
- Tracking via token parameter
- No platform-hosted page

---

## QR Code Generation

### QR Code Encoding

Encode PURL in scannable QR code:

```typescript
import QRCode from 'qrcode';

async function generateQRCode(token: string, baseLpUrl: string): Promise<string> {
  const url = `${baseLpUrl}/r/${token}`;
  
  const qrCodeDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H', // High error correction
    width: 300,                 // 300x300 pixels
    margin: 2,                  // Quiet zone
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
  
  return qrCodeDataUrl;
}
```

### QR Code Placement

**Mail Piece Integration:**
- **Front** - Primary call-to-action
- **Back** - Secondary placement
- **Both sides** - Maximum visibility

**Size Guidelines:**
- **Minimum:** 1" x 1" (scannable at arm's length)
- **Recommended:** 1.5" x 1.5" (optimal scanning)
- **Maximum:** 2" x 2" (oversized, wastes space)

### QR Code Best Practices

1. **High contrast** - Black on white for best scanning
2. **Adequate quiet zone** - 2-4 modules border
3. **Error correction** - Level H for 30% damage tolerance
4. **Test scanning** - Verify with multiple devices
5. **Include text** - "Scan to redeem" instruction
6. **Fallback URL** - Print URL below QR code for manual entry

---

## Landing Page Tracking

### Page Visit Tracking

Log each PURL visit:

```typescript
// Edge Function: Log landing page visit
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const token = url.pathname.split('/').pop();
  
  // Find recipient by token
  const { data: recipient } = await supabase
    .from('recipients')
    .select('*, campaign:campaigns(*)')
    .eq('redemption_token', token)
    .single();
  
  if (!recipient) {
    return new Response('Invalid token', { status: 404 });
  }
  
  // Log event
  await supabase.from('events').insert({
    event_type: 'landing_page_visit',
    campaign_id: recipient.campaign_id,
    recipient_id: recipient.id,
    event_data: {
      user_agent: req.headers.get('user-agent'),
      ip_address: req.headers.get('x-forwarded-for'),
      referrer: req.headers.get('referer'),
    },
  });
  
  // Update recipient status
  await supabase
    .from('recipients')
    .update({ status: 'landed', landed_at: new Date() })
    .eq('id', recipient.id);
  
  // Render landing page
  return renderLandingPage(recipient);
}
```

### Attribution Data Captured

Each visit logs:
- **Timestamp** - When visit occurred
- **IP Address** - Geographic location
- **User Agent** - Device and browser
- **Referrer** - Source of traffic
- **UTM Parameters** - Campaign tracking
- **Session Duration** - Time on page
- **Form Submission** - Lead capture data

---

## Personalization

### Dynamic Content

Merge recipient data into landing page:

```typescript
interface RecipientData {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  custom_fields: Record<string, any>;
}

function personalizeLandingPage(
  template: string,
  recipient: RecipientData
): string {
  return template
    .replace(/\{\{first_name\}\}/g, recipient.first_name)
    .replace(/\{\{last_name\}\}/g, recipient.last_name)
    .replace(/\{\{address\}\}/g, recipient.address)
    .replace(/\{\{city\}\}/g, recipient.city)
    .replace(/\{\{state\}\}/g, recipient.state)
    .replace(/\{\{zip\}\}/g, recipient.zip);
}
```

**Personalization Examples:**
- **Greeting:** "Welcome back, {{first_name}}!"
- **Location:** "We serve {{city}}, {{state}}"
- **Offer:** "Exclusive offer for {{zip}} residents"
- **Custom:** "Your {{custom_field}} information"

### Pre-filled Forms

Auto-populate lead forms with recipient data:

```html
<form id="lead-form">
  <input type="text" name="first_name" value="{{first_name}}" readonly />
  <input type="text" name="last_name" value="{{last_name}}" readonly />
  <input type="email" name="email" placeholder="Enter your email" required />
  <input type="tel" name="phone" placeholder="Enter your phone" required />
  <button type="submit">Claim Your Reward</button>
</form>
```

Benefits:
- **Reduced friction** - Less typing required
- **Higher conversion** - Pre-filled = faster submission
- **Data validation** - Confirm recipient identity
- **Better UX** - Personalized experience

---

## UTM Tracking

### UTM Parameter Structure

Standard Google Analytics tracking:

```
https://example.com/r/A7K9M2P5?utm_source=direct_mail&utm_medium=postcard&utm_campaign=spring_2024_roofing
```

**Parameters:**
- `utm_source` - Traffic source (e.g., `direct_mail`)
- `utm_medium` - Marketing medium (e.g., `postcard`, `letter`)
- `utm_campaign` - Campaign name (e.g., `spring_2024_roofing`)
- `utm_content` - A/B test variant (optional)
- `utm_term` - Keywords (optional)

### UTM Configuration

Set at campaign level:

```typescript
const campaign = {
  utm_source: 'direct_mail',
  utm_medium: '6x9_postcard',
  utm_campaign: 'q1_2024_hvac_promo',
};

// Generate PURL with UTM
const purl = `${baseLpUrl}/r/${token}?utm_source=${campaign.utm_source}&utm_medium=${campaign.utm_medium}&utm_campaign=${campaign.utm_campaign}`;
```

### Analytics Integration

UTM parameters flow to Google Analytics:

1. **Recipient scans QR code** → UTM parameters included
2. **Landing page loads** → GA tracks source/medium/campaign
3. **Form submitted** → Conversion attributed to direct mail
4. **Revenue tracked** → ROI calculated by campaign

---

## Token Security

### Token Validation

Prevent token abuse:

```typescript
async function validateToken(token: string): Promise<ValidationResult> {
  // Check format
  if (!/^[A-Z0-9]{8}$/.test(token)) {
    return { valid: false, reason: 'Invalid format' };
  }
  
  // Find recipient
  const { data: recipient } = await supabase
    .from('recipients')
    .select('*, campaign:campaigns(*)')
    .eq('redemption_token', token)
    .maybeSingle();
  
  if (!recipient) {
    return { valid: false, reason: 'Token not found' };
  }
  
  // Check campaign status
  if (!['mailed', 'delivered', 'active'].includes(recipient.campaign.status)) {
    return { valid: false, reason: 'Campaign not active' };
  }
  
  // Check expiration (if applicable)
  if (recipient.campaign.expiration_date && 
      new Date() > new Date(recipient.campaign.expiration_date)) {
    return { valid: false, reason: 'Token expired' };
  }
  
  return { valid: true, recipient };
}
```

### Rate Limiting

Prevent brute force token guessing:

```typescript
// Max 10 invalid token attempts per IP per hour
const RATE_LIMIT = {
  max_attempts: 10,
  window: 60 * 60 * 1000, // 1 hour
};

async function checkRateLimit(ipAddress: string): Promise<boolean> {
  const { count } = await supabase
    .from('token_validation_attempts')
    .select('*', { count: 'exact' })
    .eq('ip_address', ipAddress)
    .gte('created_at', new Date(Date.now() - RATE_LIMIT.window));
  
  return count < RATE_LIMIT.max_attempts;
}
```

### Token Deactivation

Invalidate tokens when needed:

```typescript
// Deactivate token after form submission
await supabase
  .from('recipients')
  .update({ token_used: true, token_used_at: new Date() })
  .eq('redemption_token', token);

// Prevent reuse
if (recipient.token_used) {
  return { error: 'Token already used' };
}
```

---

## QR Code Analytics

### Scan Tracking

Differentiate QR scans from manual URL entry:

```typescript
// QR codes append ?source=qr parameter
const url = `${baseLpUrl}/r/${token}?source=qr`;

// Track scan vs manual
await supabase.from('events').insert({
  event_type: url.includes('source=qr') ? 'qr_scan' : 'manual_url_entry',
  campaign_id: recipient.campaign_id,
  recipient_id: recipient.id,
});
```

### Scan Analytics

Metrics tracked:
- **QR scan rate** - Scans / mail pieces
- **Device breakdown** - iOS vs Android
- **Time to scan** - Days from mail date to scan
- **Scan location** - IP-based geolocation
- **Repeat scans** - Multiple scans by same recipient

---

## Redirect Mode Implementation

### External Website Integration

For clients with existing websites:

```typescript
// Edge Function: Redirect with token
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  // Validate and track
  const { valid, recipient } = await validateToken(token);
  
  if (!valid) {
    return new Response('Invalid token', { status: 404 });
  }
  
  // Log redirect
  await supabase.from('events').insert({
    event_type: 'purl_redirect',
    campaign_id: recipient.campaign_id,
    recipient_id: recipient.id,
  });
  
  // Redirect to client website with token
  const redirectUrl = `${recipient.campaign.external_url}?token=${token}`;
  
  return Response.redirect(redirectUrl, 302);
}
```

### Client-Side Token Handling

JavaScript for client websites:

```html
<script>
  // Extract token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    // Store token in session
    sessionStorage.setItem('redemption_token', token);
    
    // Personalize page
    fetch(`/api/recipient?token=${token}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById('welcome').textContent = 
          `Welcome, ${data.first_name}!`;
      });
  }
</script>
```

---

## Best Practices

1. **Use both PURL and QR** - Provide multiple redemption paths
2. **Test QR codes** - Verify scanning with multiple devices
3. **Keep URLs short** - Easier to type if QR fails
4. **Personalize landing pages** - Use recipient data
5. **Track everything** - Log all interactions
6. **Validate tokens** - Prevent abuse and fraud
7. **Set expiration dates** - Time-limited campaigns
8. **Mobile-optimize** - Most scans happen on phones
9. **Include fallback** - Print URL below QR code
10. **Monitor analytics** - Track scan rates and conversions

---

## Related Documentation

- [Landing Pages](/docs/features/landing-pages)
- [Campaign Tracking](/docs/features/analytics)
- [Event Tracking](/docs/developer-guide/event-tracking)
- [Campaign Management](/docs/features/campaigns)
