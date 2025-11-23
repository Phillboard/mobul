# Permission System Documentation

## Overview
The Mobul ACE platform uses a comprehensive role-based access control (RBAC) system with granular permissions. This system allows fine-grained control over what users can see and do within the application.

## Role Hierarchy

### 1. Admin (Level 1)
- **Description**: Full platform access
- **Hierarchy Level**: 1 (highest)
- **Can Manage**: All users and all functionality
- **Key Permissions**: All permissions granted

### 2. Tech Support (Level 2)
- **Description**: Support and troubleshooting access
- **Hierarchy Level**: 2
- **Can Manage**: Support tickets, user issues
- **Key Permissions**: Limited administrative access

### 3. Agency Owner (Level 3)
- **Description**: Manage agencies and create companies/clients
- **Hierarchy Level**: 3
- **Can Manage**: Multiple clients, users, campaigns
- **Key Permissions**: Full access within agency scope

### 4. Company Owner (Level 4)
- **Description**: Manage company campaigns and data
- **Hierarchy Level**: 4
- **Can Manage**: Own company's data, campaigns, contacts
- **Key Permissions**: Full access within company scope

### 5. Developer (Level 5)
- **Description**: Technical development and API access
- **Hierarchy Level**: 5
- **Can Manage**: API keys, integrations, technical settings
- **Key Permissions**: API and integration focused

### 6. Call Center (Level 6)
- **Description**: Gift card redemption only
- **Hierarchy Level**: 6
- **Can Manage**: Call handling, gift card verification
- **Key Permissions**: Minimal - only call center operations

## Permission Modules

### Dashboard
- `dashboard.view` - View dashboard

### Campaigns
- `campaigns.view` - View campaigns
- `campaigns.create` - Create campaigns
- `campaigns.edit` - Edit campaigns
- `campaigns.delete` - Delete campaigns
- `campaigns.approve` - Approve campaigns

### Templates
- `templates.view` - View templates
- `templates.create` - Create templates
- `templates.edit` - Edit templates
- `templates.delete` - Delete templates

### Landing Pages
- `landingpages.view` - View landing pages
- `landingpages.create` - Create landing pages
- `landingpages.edit` - Edit landing pages
- `landingpages.delete` - Delete landing pages

### Contacts & CRM
- `contacts.view` - View contacts
- `contacts.create` - Create contacts
- `contacts.edit` - Edit contacts
- `contacts.delete` - Delete contacts
- `contacts.import` - Import contacts
- `contacts.export` - Export contacts
- `companies.view` - View companies
- `companies.create` - Create companies
- `companies.edit` - Edit companies
- `companies.delete` - Delete companies
- `deals.view` - View deals
- `deals.create` - Create deals
- `deals.edit` - Edit deals
- `deals.delete` - Delete deals
- `activities.view` - View activities
- `activities.create` - Create activities
- `tasks.view` - View tasks
- `tasks.create` - Create tasks
- `tasks.edit` - Edit tasks
- `tasks.complete` - Complete tasks

### Audiences (Legacy - use contacts.*)
- `audiences.view` - View audiences
- `audiences.create` - Create audiences
- `audiences.edit` - Edit audiences
- `audiences.delete` - Delete audiences

### Gift Cards
- `gift_cards.manage` - Manage gift card pools
- `gift_cards.purchase` - Purchase gift cards
- `giftcards.view` - View gift card inventory
- `giftcards.purchase` - Purchase from pools
- `giftcards.admin_view` - Admin marketplace access (admin only)

### Call Center
- `calls.agent_dashboard` - Access agent dashboard
- `calls.confirm_redemption` - Confirm gift card redemptions
- `calls.view` - View call logs
- `calls.manage` - Manage call center settings

### Analytics
- `analytics.view` - View analytics

### Users & Administration
- `users.view` - View users
- `users.manage` - Manage users
- `users.create` - Create users
- `users.edit` - Edit users
- `users.delete` - Delete users

### API & Integrations
- `api.view` - View API keys
- `api.create` - Create API keys
- `api.delete` - Delete API keys
- `settings.integrations` - Manage integrations

### Clients (Agency)
- `clients.view` - View clients
- `clients.manage` - Manage clients
- `clients.create` - Create clients

### Settings
- `settings.view` - View settings (all users have this)
- `settings.edit` - Edit settings

## Permission Checking

### In Code

#### Using hasAnyPermission (OR logic)
```typescript
const { hasAnyPermission } = useAuth();

// User needs ONE of these permissions
if (hasAnyPermission(['campaigns.view', 'campaigns.edit'])) {
  // Show campaigns menu
}
```

#### Using hasPermission (single permission)
```typescript
const { hasPermission } = useAuth();

// User needs this specific permission
if (hasPermission('campaigns.delete')) {
  // Show delete button
}
```

#### Using hasRole
```typescript
const { hasRole } = useAuth();

// User must have this role
if (hasRole('admin')) {
  // Show admin features
}
```

### In Components

#### Protected Routes
```typescript
<Route 
  path="/campaigns" 
  element={
    <ProtectedRoute requiredPermissions={['campaigns.view']}>
      <Campaigns />
    </ProtectedRoute>
  } 
/>

<Route 
  path="/admin/marketplace" 
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminMarketplace />
    </ProtectedRoute>
  } 
/>
```

#### Permission Gates
```typescript
<PermissionGate permissions={['campaigns.delete']}>
  <Button variant="destructive">Delete</Button>
</PermissionGate>
```

## Menu Structure & Permissions

### Dashboard
- All users can view

### Marketing
- **Campaigns**: `campaigns.view`
- **Templates**: `templates.view`
- **Landing Pages**: `landingpages.view`

### CRM
- **Contacts**: `audiences.view` OR `contacts.view`
- **Companies**: `audiences.view` OR `companies.view`
- **Deals**: `audiences.view` OR `deals.view`
- **Activities**: `audiences.view` OR `activities.view`
- **Tasks**: `audiences.view` OR `tasks.view`

### Gift Cards
- **Manage Cards**: `gift_cards.manage` OR `giftcards.view`
- **Purchase Cards**: `gift_cards.purchase` OR `giftcards.purchase`
- **Marketplace**: `giftcards.admin_view` (admin role required)

### Call Center
- **Agent Dashboard**: `calls.agent_dashboard` OR `calls.confirm_redemption`
- **Call Analytics**: `calls.view` OR `calls.manage`
- Visible only to: `call_center` and `admin` roles

### Administration
- **Analytics**: `analytics.view`
- **User Management**: `users.view` OR `users.manage`
- **API & Integrations**: `api.view` OR `settings.integrations`
- **Automation**: `settings.integrations`
- **Settings**: `settings.view`

### Agency
- **Client Management**: `clients.view` OR `clients.manage`
- Visible only to: `agency_owner` role

## Permission Templates

### Account Admin (Agency Owner)
- Full campaign, template, landing page access
- Full CRM access (contacts, companies, deals, activities, tasks)
- Gift card purchase and management
- Analytics
- User management
- API access

### Sales Rep (Company Owner - Limited)
- View campaigns
- View/create contacts
- Full deals and activities access
- Tasks management

### Call Center Agent
- Agent dashboard only
- Confirm redemptions only
- No other access

## Row-Level Security (RLS)

### Key RLS Policies

#### Client Isolation
All data is isolated by `client_id`. Users can only access data from clients they're associated with through the `client_users` table.

Example:
```sql
CREATE POLICY "Users can view their client's campaigns"
ON campaigns FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR
  client_id IN (
    SELECT client_id FROM client_users
    WHERE user_id = auth.uid()
  )
);
```

#### Admin Bypass
Admins bypass most client isolation and can access all data:
```sql
has_role(auth.uid(), 'admin') OR [regular user check]
```

#### Master Pool Isolation
Master gift card pools (admin-owned) are separate from client pools:
```sql
CREATE POLICY "Only admins can view master pools"
ON gift_card_pools FOR SELECT
TO authenticated
USING (
  (is_master_pool = true AND has_role(auth.uid(), 'admin'))
  OR
  (is_master_pool = false AND client_id IN (SELECT client_id FROM client_users WHERE user_id = auth.uid()))
);
```

## Best Practices

### 1. Always Use Permission Checks
Never assume a user has access. Always check permissions before:
- Showing UI elements
- Making API calls
- Performing actions

### 2. Use OR Logic for Backward Compatibility
When consolidating features (like Audiences → Contacts), use OR logic:
```typescript
permissions: ['audiences.view', 'contacts.view']
```

### 3. Prefer Granular Permissions Over Roles
Use specific permissions (e.g., `campaigns.delete`) rather than checking roles (e.g., `admin`), except when role is explicitly required.

### 4. Protect Routes AND Components
Use both `<ProtectedRoute>` and `<PermissionGate>` for defense in depth.

### 5. Document Permission Requirements
When creating new features, document required permissions in code comments and this file.

## Adding New Permissions

### Step 1: Add to Database
```sql
INSERT INTO permissions (name, description, module) VALUES
  ('new_feature.view', 'View new feature', 'new_module')
ON CONFLICT (name) DO NOTHING;
```

### Step 2: Update Role Templates
Add permission to relevant permission templates in the database.

### Step 3: Update Code
Add permission checks in:
- Menu navigation
- Route protection
- Component rendering
- API calls

### Step 4: Update Documentation
Add new permission to this document.

## Troubleshooting

### User Can't See Menu Item
1. Check if user has required permissions via `get_user_permissions(user_id)`
2. Check if menu visibility requires role AND permission
3. Verify user is associated with correct client via `client_users`
4. Check if group visibility rules filter out the menu

### User Can See Menu But Can't Access Route
1. Check `<ProtectedRoute>` wrapper matches menu permissions
2. Verify permissions use OR logic if multiple are valid
3. Check for role-specific restrictions

### User Can't Perform Action
1. Check RLS policies on affected tables
2. Verify permission is granted at all levels (role → template → user)
3. Check for user-specific permission revocations in `user_permissions`

## Security Considerations

### Never Trust Client-Side
- Always validate permissions server-side
- RLS policies are the final authority
- UI permission checks are for UX only

### Principle of Least Privilege
- Grant minimum permissions needed
- Use specific permissions over broad ones
- Regularly audit user permissions

### Audit Trail
- All permission-based actions should be logged
- Use `gift_card_audit_log` and similar tables
- Track who did what and when
