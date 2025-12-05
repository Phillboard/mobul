# Database Operations

## Overview

Comprehensive guide to database operations, migrations, RLS policies, and PostgreSQL best practices for the Mobul ACE Platform.

---

## Schema Management

### Core Tables

**Organizations & Clients:**
- `organizations` - Top-level tenant entities
- `clients` - Client accounts under organizations
- `org_members` - Organization membership
- `client_users` - Client user assignments

**Campaigns:**
- `campaigns` - Campaign records
- `recipients` - Mail recipients per campaign
- `audiences` - Contact groups
- `campaign_conditions` - Reward qualification rules

**Contacts:**
- `contacts` - Master contact database
- `contact_lists` - Static contact lists
- `contact_list_members` - List membership
- `contact_tags` - Contact tagging

**Gift Cards:**
- `gift_card_brands` - Available brands
- `gift_card_denominations` - Denomination amounts per brand
- `gift_card_inventory` - Available card inventory
- `gift_card_provisioning_trace` - Provisioning audit log

**Tracking:**
- `call_sessions` - Inbound call tracking
- `events` - Attribution events
- `form_submissions` - Lead capture data

---

## Row-Level Security (RLS)

### Enabling RLS

```sql
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
```

### Policy Examples

**Client-scoped access:**
```sql
CREATE POLICY "Users can view their client's campaigns"
ON campaigns FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM client_users WHERE user_id = auth.uid()
  )
);
```

**Admin access:**
```sql
CREATE POLICY "Admins can view all campaigns"
ON campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

---

## Best Practices

1. **Always enable RLS** on user-facing tables
2. **Use indexes** on foreign keys and query columns
3. **Implement soft deletes** with `deleted_at` timestamps
4. **Version control migrations** - Never edit existing files
5. **Test locally first** before pushing to production
6. **Use transactions** for multi-step operations
7. **Implement audit logs** for sensitive changes
8. **Partition large tables** by date for performance
9. **Use JSONB** for flexible schema fields
10. **Monitor query performance** with `pg_stat_statements`

---

## Related Documentation

- [Development Setup](/admin/docs/developer-guide/setup)
- [Edge Functions](/admin/docs/developer-guide/edge-functions)
- [Security Architecture](/admin/docs/architecture/security)
