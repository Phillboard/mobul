# Landing Pages

## Overview

Landing pages are personalized web experiences that recipients reach via PURL or QR code scan. They serve as lead capture forms, gift card reveal pages, and engagement tracking endpoints.

---

## Landing Page Modes

### Bridge Mode

Platform-hosted landing page with full personalization:

**Characteristics:**
- Hosted on your domain (e.g., `roofingpromo.com/r/{token}`)
- Fully customizable HTML/CSS design
- Recipient data merged into template
- Lead capture forms integrated
- Gift card reveal on submission

**Use Cases:**
- Lead generation campaigns
- Gift card incentive programs
- Event registrations
- Survey/feedback collection
- A/B testing landing page variants

**Example URL:**
```
https://yourdomain.com/r/A7K9M2P5
```

### Redirect Mode

External URL with token parameter:

**Characteristics:**
- Redirects to client's existing website
- Token passed as URL parameter
- Client handles personalization
- Platform tracks redirect event
- No platform-hosted page

**Use Cases:**
- Clients with existing lead capture systems
- Complex website integrations
- Custom tracking requirements
- Third-party form builders

**Example URL:**
```
https://clientwebsite.com/promo?token=A7K9M2P5
```

---

## Landing Page Builder

### Visual Editor

Drag-and-drop builder powered by GrapesJS:

**Components Available:**
- **Text blocks** - Headlines, paragraphs, formatted text
- **Images** - Logos, hero images, icons
- **Buttons** - CTAs, form submit buttons
- **Forms** - Lead capture, surveys
- **Videos** - Embedded YouTube/Vimeo
- **Social proof** - Testimonials, reviews
- **Countdown timers** - Urgency elements
- **Gift card reveal** - Animated card display

### Template Library

Pre-built templates for common use cases:

**Lead Generation:**
- Simple form with headline/image
- Multi-step form with progress bar
- Survey with conditional logic
- Event registration with calendar

**Gift Card Campaigns:**
- Form + instant reveal
- Two-step verification
- Gamified scratch-off
- Branded reward display

**Informational:**
- Product showcase
- Service overview
- Before/after gallery
- Testimonial collection

### Design Customization

**Brand Kit Integration:**
- Import client logos
- Apply brand colors
- Use custom fonts
- Maintain style consistency

**Responsive Design:**
- Mobile-first layout
- Tablet breakpoints
- Desktop optimization
- Test on all devices

---

## Lead Capture Forms

### Form Fields

Standard fields available:

**Contact Information:**
- First name
- Last name
- Email address
- Phone number
- Company name
- Job title

**Address Fields:**
- Street address
- Apartment/Suite
- City
- State/Province
- Zip/Postal code
- Country

**Custom Fields:**
- Text input
- Number input
- Date picker
- Dropdown select
- Multi-select checkboxes
- Radio buttons
- Text area

### Form Validation

Client-side and server-side validation:

```typescript
const formValidation = {
  first_name: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  phone: {
    required: true,
    pattern: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
    message: 'Please enter a valid 10-digit phone number',
  },
};
```

### Conditional Logic

Show/hide fields based on responses:

```typescript
const conditionalLogic = {
  field_id: 'interested_in_service',
  conditions: [
    {
      if: 'value_equals',
      value: 'roofing',
      then: 'show_field',
      target_field: 'roof_age',
    },
    {
      if: 'value_equals',
      value: 'hvac',
      then: 'show_field',
      target_field: 'system_age',
    },
  ],
};
```

---

## Form Submission Handling

### Submission Flow

1. **User submits form**
2. **Validate data** - Client and server-side
3. **Create/update contact** - Add to contacts database
4. **Log form submission** - Track event
5. **Trigger gift card provisioning** - If applicable
6. **Redirect to thank you page** - Or show inline success

### Submission Processing

```typescript
// Edge Function: Handle form submission
export default async function handler(req: Request) {
  const formData = await req.json();
  const { token, ...fields } = formData;
  
  // Validate token
  const { data: recipient } = await supabase
    .from('recipients')
    .select('*, campaign:campaigns(*)')
    .eq('redemption_token', token)
    .single();
  
  if (!recipient) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }
  
  // Create or update contact
  const { data: contact } = await supabase
    .from('contacts')
    .upsert({
      client_id: recipient.campaign.client_id,
      email: fields.email,
      first_name: fields.first_name,
      last_name: fields.last_name,
      phone: fields.phone,
      lifecycle_stage: 'lead',
      lead_source: 'direct_mail',
    }, { onConflict: 'email' })
    .select()
    .single();
  
  // Log submission
  await supabase.from('form_submissions').insert({
    form_id: recipient.campaign.landing_page_id,
    recipient_id: recipient.id,
    contact_id: contact.id,
    submission_data: fields,
  });
  
  // Update recipient
  await supabase
    .from('recipients')
    .update({ 
      status: 'converted',
      converted_at: new Date(),
    })
    .eq('id', recipient.id);
  
  // Trigger gift card provisioning
  if (recipient.campaign.has_gift_card_rewards) {
    const giftCard = await provisionGiftCard(recipient);
    return Response.json({ 
      success: true,
      gift_card: giftCard,
    });
  }
  
  return Response.json({ success: true });
}
```

---

## Gift Card Reveal

### Reveal Animations

Visual effects for card presentation:

**Animation Styles:**
- **Fade In** - Smooth opacity transition
- **Slide Up** - Card slides from bottom
- **Flip** - 3D card flip effect
- **Confetti** - Celebration with confetti burst
- **None** - Instant display

### Card Display Components

```typescript
interface GiftCardDisplayProps {
  brand: string;
  amount: number;
  code: string;
  pin?: string;
  expirationDate?: string;
  redemptionUrl: string;
  animationStyle: 'fade' | 'slide' | 'flip' | 'confetti' | 'none';
}
```

### Redemption Options

Multiple ways to redeem:

**QR Code:**
- Generate QR code from redemption URL
- Cashier scans at point of sale
- Supports in-store redemption

**Deep Links:**
- Platform-aware app links
- iOS: Opens Apple Wallet or brand app
- Android: Opens Google Wallet or brand app
- Desktop: Opens brand website

**Wallet Integration:**
- Add to Apple Wallet (iOS)
- Add to Google Wallet (Android)
- Digital pass with card details
- Push notifications for reminders

**Manual Copy:**
- Copy code to clipboard
- Email code to recipient
- SMS code to phone
- Print code

---

## Personalization Tokens

### Available Tokens

Merge recipient data into landing page:

**Recipient Fields:**
- `{{first_name}}` - First name
- `{{last_name}}` - Last name
- `{{full_name}}` - Full name
- `{{email}}` - Email address
- `{{phone}}` - Phone number
- `{{address}}` - Street address
- `{{city}}` - City
- `{{state}}` - State
- `{{zip}}` - Zip code

**Campaign Fields:**
- `{{campaign_name}}` - Campaign name
- `{{offer_description}}` - Campaign offer
- `{{expiration_date}}` - Offer expiration
- `{{brand_name}}` - Client brand name

**Gift Card Fields:**
- `{{card_brand}}` - Gift card brand
- `{{card_amount}}` - Card value
- `{{card_code}}` - Redemption code
- `{{card_pin}}` - PIN (if applicable)
- `{{redemption_url}}` - Brand URL

### Dynamic Content Example

```html
<div class="hero">
  <h1>Welcome, {{first_name}}!</h1>
  <p>We have an exclusive offer for homeowners in {{city}}, {{state}}.</p>
  
  <div class="offer-card">
    <h2>{{campaign_name}}</h2>
    <p class="offer-description">{{offer_description}}</p>
    <p class="expiration">Offer expires {{expiration_date}}</p>
  </div>
  
  <form id="lead-form">
    <input type="text" name="first_name" value="{{first_name}}" readonly />
    <input type="text" name="last_name" value="{{last_name}}" readonly />
    <input type="email" name="email" placeholder="Your email" required />
    <input type="tel" name="phone" placeholder="Your phone" required />
    <button type="submit">Claim Your {{card_brand}} Gift Card</button>
  </form>
</div>
```

---

## A/B Testing

### Test Variants

Create multiple landing page versions:

```typescript
const variants = [
  {
    name: 'Control',
    traffic_split: 50, // 50% of traffic
    headline: 'Get Your Free Roof Inspection',
    cta_text: 'Schedule Now',
    image_url: '/images/variant-a.jpg',
  },
  {
    name: 'Variant B',
    traffic_split: 50,
    headline: 'Save $500 on Roof Replacement',
    cta_text: 'Claim Offer',
    image_url: '/images/variant-b.jpg',
  },
];
```

### Traffic Splitting

Assign recipients to variants:

```typescript
function assignVariant(recipientId: string, variants: Variant[]): Variant {
  // Deterministic assignment based on recipient ID
  const hash = hashString(recipientId);
  const percentage = hash % 100;
  
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.traffic_split;
    if (percentage < cumulative) {
      return variant;
    }
  }
  
  return variants[0]; // Fallback
}
```

### Performance Tracking

Compare variant metrics:

- **Conversion rate** - Form submissions / page views
- **Time on page** - Average engagement duration
- **Bounce rate** - Single-page sessions
- **Gift card redemption** - Ultimate conversion
- **Statistical significance** - Confidence in winner

---

## Analytics & Tracking

### Page View Analytics

Track every landing page visit:

- **Total views** - Unique PURL visits
- **Unique visitors** - De-duplicated recipients
- **Repeat visits** - Multiple visits by same recipient
- **Traffic source** - QR scan vs manual URL entry
- **Device breakdown** - Mobile, tablet, desktop
- **Geographic data** - City/state from IP address
- **Referrer** - Source of traffic
- **Session duration** - Time spent on page

### Form Analytics

Track form engagement:

- **Form views** - Page views with form visible
- **Form starts** - At least one field filled
- **Form submissions** - Completed submissions
- **Abandonment rate** - Started but not completed
- **Field analytics** - Which fields cause drop-off
- **Validation errors** - Common error messages
- **Time to complete** - Average form completion time

### Conversion Funnel

```
1000 Mail Pieces Sent
  ↓ 95% delivered
950 Delivered
  ↓ 12% scan QR / visit PURL
114 Landing Page Views
  ↓ 75% start form
86 Form Starts
  ↓ 70% complete form
60 Form Submissions
  ↓ 90% redeem gift card
54 Gift Cards Redeemed
```

---

## Mobile Optimization

### Responsive Design

Landing pages must work flawlessly on mobile:

**Mobile Best Practices:**
- **Single column layout** - No horizontal scrolling
- **Large tap targets** - Min 44x44px buttons
- **Readable font sizes** - Min 16px body text
- **Fast loading** - Under 3 seconds
- **Auto-zoom disabled** - Proper viewport settings
- **Sticky CTAs** - Fixed submit button
- **Minimal form fields** - Only ask for essentials

### Mobile-Specific Features

- **Click-to-call** - Tap phone numbers to dial
- **Tap-to-SMS** - Open SMS app with pre-filled message
- **GPS location** - Pre-fill address based on location
- **Camera access** - Upload photos in forms
- **Autofill** - Use device autocomplete
- **App deep links** - Open brand apps directly

---

## Security & Privacy

### HTTPS Encryption

All landing pages served over HTTPS:
- TLS 1.3 encryption
- Valid SSL certificates
- Secure form submissions
- No mixed content warnings

### Data Privacy

- **GDPR compliance** - Consent checkboxes
- **Privacy policy** - Link to privacy policy
- **Data retention** - Clearly state data usage
- **Opt-in marketing** - Explicit consent for emails/SMS

### Spam Prevention

- **reCAPTCHA** - Bot detection
- **Rate limiting** - Prevent form spam
- **Honeypot fields** - Hidden bot traps
- **IP blocking** - Block abusive IPs

---

## Best Practices

1. **Keep forms short** - Only ask for essential information
2. **Pre-fill when possible** - Use recipient data from mail piece
3. **Mobile-first design** - Most traffic comes from phones
4. **Clear value proposition** - State offer upfront
5. **Strong CTAs** - Action-oriented button text
6. **Fast loading** - Optimize images, minimize scripts
7. **Test on devices** - Verify on iOS and Android
8. **A/B test variants** - Continuously improve conversion
9. **Track everything** - Measure what matters
10. **Follow up** - Email/SMS confirmation after submission

---

## Related Documentation

- [PURLs & QR Codes](/docs/features/purl-qr-codes)
- [Campaign Management](/docs/features/campaigns)
- [Gift Card Rewards](/docs/features/gift-cards)
- [Analytics](/docs/features/analytics)
