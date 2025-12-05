# Admin Guide

Comprehensive guide for platform administrators managing organizations, users, system configuration, and platform-wide operations.

---

## Your Dashboard

As an admin, your **Dashboard** shows platform-wide metrics:
- Total active organizations
- Campaign volume across all clients
- System health status
- Recent platform activity

---

## Organization Management

### Navigating to Organizations

1. Click **Admin** → **Organizations** in the sidebar

### Creating an Organization

1. Click **Create Organization**
2. Select organization type:
   - **Agency**: Marketing agencies managing multiple clients
   - **Direct Client**: Single business managing their own campaigns
3. Enter organization details:
   - Name
   - Contact email
   - Industry type
   - Status (Active/Inactive)
4. Click **Save**

### Managing Organizations

From the Organizations list, you can:
- **View Details**: Click on any organization to see full profile
- **Edit**: Update organization information
- **Archive**: Soft-delete organizations (preserves data)
- **View Clients**: See all clients under an agency
- **Switch Context**: Impersonate organization for troubleshooting

### Organization Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Agency** | Multi-tenant organization managing clients | Marketing agencies |
| **Direct** | Single-tenant organization | Direct businesses |
| **Internal** | Platform administrators | Your team |

---

## User Management

### Navigating to User Management

1. Click **Admin** → **User Management** in the sidebar

### Inviting Users

1. Click **Invite User**
2. Enter user's email address
3. Select role:
   - **Admin**: Full platform access
   - **Agency Owner**: Agency-level management
   - **Company Owner**: Client-level management
   - **Call Center Agent**: Redemption operations
   - **Tech Support**: Support and troubleshooting
   - **Developer**: API access
4. Assign to organization/client
5. Click **Send Invitation**

### Role Permissions Matrix

| Permission | Admin | Agency Owner | Company Owner | Call Center |
|------------|-------|--------------|---------------|-------------|
| View all organizations | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | Own org only | ❌ | ❌ |
| Create campaigns | ✅ | ✅ | ✅ | ❌ |
| View campaigns | ✅ | ✅ | Own only | ❌ |
| Manage gift cards | ✅ | ✅ | Limited | ❌ |
| Process redemptions | ✅ | ✅ | ❌ | ✅ |
| System health | ✅ | ❌ | ❌ | ❌ |
| Financial reports | ✅ | Own org | Own org | ❌ |

### Managing Existing Users

- **Edit User**: Change role or organization assignment
- **Deactivate**: Temporarily disable access
- **Reset Password**: Send password reset email
- **View Activity**: See user's recent actions

---

## Platform Inventory (Gift Card Marketplace)

### Navigating to Platform Inventory

1. Click **Admin** → **Platform Inventory** in the sidebar

### Managing Gift Card Brands

1. Go to **Admin** → **Gift Card Brands**
2. Add/edit brands available on the platform
3. Configure denominations for each brand
4. Set pricing and margins

### Monitoring Inventory

From Platform Inventory, you can:
- View total inventory across all brands
- Check low-stock alerts
- Monitor provisioning rates
- Review failed provisions

---

## System Health Monitoring

### Navigating to System Health

1. Click **Admin** → **System Health** in the sidebar

### Health Dashboard

- **API Response Times**: Average latency for key endpoints
- **Database Performance**: Query performance metrics
- **Edge Function Status**: Serverless function health
- **Error Rate**: Percentage of failed requests
- **Active Sessions**: Current logged-in users

### Alerts

Configure alerts for:
- High error rates (>1%)
- Slow response times (>2s)
- Database connection issues
- Edge function failures
- Low gift card inventory

---

## Audit Log

### Navigating to Audit Log

1. Click **Admin** → **Audit Log** in the sidebar

### What's Logged

- User login/logout events
- Role changes
- Organization creation/modification
- Campaign approvals
- Gift card provisioning
- Settings changes

### Using the Audit Log

- **Filter by User**: See all actions by a specific user
- **Filter by Action**: See all actions of a specific type
- **Date Range**: Filter by time period
- **Export**: Download audit data for compliance

---

## Financial Reports

### Navigating to Financial Reports

1. Click **Admin** → **Financial Reports** in the sidebar

### Available Reports

- **Revenue by Organization**: Monthly revenue breakdown
- **Gift Card Usage**: Provisioning and redemption metrics
- **Credit Purchases**: Credit purchase history
- **Campaign Spend**: Spend by campaign type

---

## Error Logs

### Navigating to Error Logs

1. Click **Admin** → **Error Logs** in the sidebar

### Using Error Logs

- View recent system errors
- Filter by severity (Error, Warning, Info)
- Filter by component (API, Edge Functions, Database)
- Search by error message
- Stack traces for debugging

---

## Demo Data

### Navigating to Demo Data

1. Click **Admin** → **Demo Data** in the sidebar

### Generating Test Data

Use demo data for:
- Training new users
- Testing new features
- Demonstrations to clients
- Development environments

### Available Demo Data Types

- Test organizations and clients
- Sample campaigns with recipients
- Mock gift card inventory
- Example contact lists

---

## Site Directory

### Navigating to Site Directory

1. Click **Admin** → **Site Directory** in the sidebar

### Features

- View all available routes in the platform
- Search for specific pages
- See which roles can access each page
- Quick navigation to any section

---

## Best Practices

### Security

1. **Principle of Least Privilege**: Assign minimum required permissions
2. **Regular Access Reviews**: Quarterly review of user access
3. **Enable 2FA**: Require two-factor authentication for admin accounts
4. **Monitor Audit Logs**: Regular review for suspicious activity

### Operations

1. **Document Changes**: Keep a change log for system modifications
2. **Test in Staging**: Test changes before production
3. **Monitor Health**: Daily review of system health dashboard
4. **Backup Verification**: Regular backup restoration tests

### User Management

1. **Offboarding**: Immediately deactivate departing users
2. **Role Templates**: Use consistent role assignments
3. **Training**: Ensure users understand their permissions
4. **Support Escalation**: Define clear escalation paths

---

## Related Documentation

- [Security →](/admin/docs/architecture/security)
- [Data Model →](/admin/docs/architecture/data-model)
- [Deployment →](/admin/docs/developer-guide/deployment)
- [Operations →](/admin/docs/operations/index)
