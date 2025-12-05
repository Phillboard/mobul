# Troubleshooting Guide

## Quick Navigation

Having issues? Start here for common problems and solutions.

---

## By Category

### Gift Card System
**[Gift Cards Troubleshooting](GIFT_CARDS.md)**
- Provisioning errors (400 Bad Request)
- Configuration issues
- Inventory problems
- Error code reference (GC-001 through GC-015)
- Diagnostic SQL queries

### SMS Delivery
**[SMS Delivery Troubleshooting](SMS_DELIVERY.md)**
- Provider configuration (Twilio, Infobip, NotificationAPI)
- SMS not sending
- SMS not received
- Provider fallback issues
- Delivery monitoring

### Permissions & Access
**[Permissions Troubleshooting](PERMISSIONS.md)**
- Call center access denied
- Menu items not showing
- RLS policy errors
- Role assignment issues

### Common Errors
**[Common Errors Reference](COMMON_ERRORS.md)**
- Database connection errors
- Authentication failures
- API integration issues
- Performance problems

---

## Quick Diagnostics

### System Health Check

```sql
-- Check critical system components
SELECT 
  'Campaigns' as component,
  COUNT(*) as count
FROM campaigns
WHERE status IN ('in_production', 'mailed', 'scheduled')

UNION ALL

SELECT 
  'Gift Card Inventory',
  COUNT(*) FILTER (WHERE status = 'available')
FROM gift_card_inventory

UNION ALL

SELECT 
  'Active Users',
  COUNT(*)
FROM auth.users
WHERE deleted_at IS NULL;
```

### Recent Errors

```sql
-- Last 20 errors across the system
SELECT 
  category,
  message,
  occurred_at,
  function_name
FROM error_logs
ORDER BY occurred_at DESC
LIMIT 20;
```

---

## Common Issues by Role

### For Call Center Agents
- [Can't access Call Center page](#permissions--access)
- [Code lookup fails](#gift-card-system)
- [SMS not sending](#sms-delivery)
- Gift card provisioning errors

### For Admins
- User permission issues
- Gift card inventory management
- Campaign configuration errors
- System performance problems

### For Developers
- Edge function deployment
- Database migration issues
- Integration errors
- Type errors

---

## Emergency Contacts

### During Business Hours
- **Email:** support@mobulace.com
- **Phone:** 1-800-XXX-XXXX
- **Chat:** Available in admin panel (Dr. Phillip)

### After Hours
- **Critical Issues:** Use emergency escalation
- **Non-Critical:** Submit ticket for next business day

---

## Related Documentation

- [Developer Guide](../4-DEVELOPER-GUIDE/)
- [API Reference](../5-API-REFERENCE/)
- [User Guides](../6-USER-GUIDES/)
- [Operations](../8-OPERATIONS/)

---

**Last Updated:** December 4, 2024
