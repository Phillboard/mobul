# Event Tracking

## Overview

Comprehensive event tracking system for attribution, analytics, and campaign performance monitoring.

---

## Event Types

- `landing_page_visit` - PURL/QR code scan
- `form_submission` - Lead capture form submitted
- `call_initiated` - Inbound call started
- `call_completed` - Call ended
- `condition_met` - Campaign condition qualified
- `gift_card_claimed` - Card assigned to recipient
- `gift_card_delivered` - SMS/email sent
- `gift_card_redeemed` - Recipient confirmed use

---

## Event Schema

```typescript
interface Event {
  id: string;
  event_type: string;
  campaign_id: string;
  recipient_id?: string;
  contact_id?: string;
  event_data: Record<string, any>;
  created_at: string;
}
```

---

## Logging Events

```typescript
await supabase.from('events').insert({
  event_type: 'landing_page_visit',
  campaign_id: campaign.id,
  recipient_id: recipient.id,
  event_data: {
    ip_address: req.headers.get('x-forwarded-for'),
    user_agent: req.headers.get('user-agent'),
    source: 'qr_scan',
  },
});
```

---

## Best Practices

1. **Log all interactions** - Complete audit trail
2. **Include context** - IP, user agent, timestamp
3. **Use event_data** - Store additional metadata
4. **Aggregate for analytics** - Query events for reports
5. **Archive old events** - Partition by date

---

## Related Documentation

- [Analytics](/admin/docs/features/analytics)
- [Campaign Lifecycle](/admin/docs/features/campaign-lifecycle)
