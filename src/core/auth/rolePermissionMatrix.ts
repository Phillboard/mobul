/**
 * ROLE-PERMISSION MATRIX — Default permissions per role
 * 
 * PURPOSE: This file serves TWO purposes:
 * 1. SEED — Used to populate the database `role_permissions` table on first run
 * 2. FALLBACK — Used by AuthProvider ONLY if the database RPC fails
 * 
 * The database is the RUNTIME AUTHORITY. This file is NOT checked on every
 * hasPermission() call. The resolution chain is:
 *   user_permissions (user override) → org_permission_overrides (agency override) → role_permissions (DB) → this file (fallback)
 * 
 * RULES:
 * 1. Admin gets EVERYTHING
 * 2. Tech Support gets all VIEW permissions, no destructive actions
 * 3. Agency Owner gets campaign/client management for their org
 * 4. Client Owner gets campaign/contact management for their client
 * 5. Developer gets API/integration access only
 * 6. Call Center gets redemption access only
 */

import { AppRole } from './roles';
import { P, Permission } from './permissionRegistry';

// ============================================================================
// Role → Permission Defaults
// ============================================================================

const ADMIN_PERMISSIONS: Permission[] = Object.values(P); // Admin gets EVERYTHING

const TECH_SUPPORT_PERMISSIONS: Permission[] = [
  // View everything, manage nothing destructive
  P.DASHBOARD_VIEW,
  P.PLATFORM_DASHBOARD_VIEW,
  P.CAMPAIGNS_VIEW,
  P.CAMPAIGNS_ANALYTICS,
  P.TEMPLATES_VIEW,
  P.LANDING_PAGES_VIEW,
  P.CONTACTS_VIEW,
  P.AUDIENCES_VIEW,
  P.GIFT_CARDS_VIEW,
  P.GIFT_CARDS_VIEW_REDEMPTIONS,
  P.GIFT_CARDS_DELIVERY_HISTORY,
  P.BILLING_VIEW,
  P.CREDITS_VIEW,
  P.CALL_CENTER_VIEW,
  P.FORMS_VIEW,
  P.FORMS_ANALYTICS,
  P.USERS_VIEW,
  P.TEAM_VIEW,
  P.ACTIVITIES_VIEW,
  P.TASKS_VIEW,
  P.AGENCIES_VIEW,
  P.SETTINGS_GENERAL,
  P.SETTINGS_SECURITY,
  P.ANALYTICS_VIEW,
  P.REPORTS_VIEW,
  P.INTEGRATIONS_VIEW,
  P.API_VIEW,
  P.ADMIN_SYSTEM_HEALTH,
  P.ADMIN_AUDIT_LOG,
  P.ADMIN_ERROR_LOGS,
  P.DOCS_VIEW,
];

const AGENCY_OWNER_PERMISSIONS: Permission[] = [
  P.DASHBOARD_VIEW,
  // Campaigns — full CRUD
  P.CAMPAIGNS_VIEW,
  P.CAMPAIGNS_CREATE,
  P.CAMPAIGNS_EDIT,
  P.CAMPAIGNS_DELETE,
  P.CAMPAIGNS_ANALYTICS,
  // Templates — full CRUD
  P.TEMPLATES_VIEW,
  P.TEMPLATES_CREATE,
  P.TEMPLATES_EDIT,
  P.TEMPLATES_DELETE,
  // Landing Pages — full CRUD
  P.LANDING_PAGES_VIEW,
  P.LANDING_PAGES_CREATE,
  P.LANDING_PAGES_EDIT,
  P.LANDING_PAGES_DELETE,
  // Contacts — full CRUD
  P.CONTACTS_VIEW,
  P.CONTACTS_CREATE,
  P.CONTACTS_EDIT,
  P.CONTACTS_DELETE,
  P.CONTACTS_IMPORT,
  P.CONTACTS_EXPORT,
  // Audiences
  P.AUDIENCES_VIEW,
  P.AUDIENCES_CREATE,
  P.AUDIENCES_MANAGE,
  // Gift Cards — management level (not platform marketplace)
  P.GIFT_CARDS_VIEW,
  P.GIFT_CARDS_MANAGE_POOLS,
  P.GIFT_CARDS_PURCHASE,
  P.GIFT_CARDS_ASSIGN_CAMPAIGN,
  P.GIFT_CARDS_REDEEM,
  P.GIFT_CARDS_VIEW_REDEMPTIONS,
  P.GIFT_CARDS_UPLOAD,
  P.GIFT_CARDS_DELIVERY_HISTORY,
  // Billing
  P.BILLING_VIEW,
  P.BILLING_MANAGE,
  P.CREDITS_VIEW,
  P.CREDITS_MANAGE,
  // Call Center
  P.CALL_CENTER_VIEW,
  P.CALL_CENTER_REDEEM,
  P.CALL_CENTER_SCRIPTS,
  // Forms
  P.FORMS_VIEW,
  P.FORMS_CREATE,
  P.FORMS_EDIT,
  P.FORMS_DELETE,
  P.FORMS_ANALYTICS,
  // Users — can manage users within their org
  P.USERS_VIEW,
  P.USERS_MANAGE,
  P.USERS_INVITE,
  // Team
  P.TEAM_VIEW,
  P.TEAM_MANAGE,
  P.ACTIVITIES_VIEW,
  P.TASKS_VIEW,
  P.TASKS_MANAGE,
  // Settings
  P.SETTINGS_GENERAL,
  P.SETTINGS_BILLING,
  P.SETTINGS_NOTIFICATIONS,
  P.SETTINGS_INTEGRATIONS,
  // Analytics
  P.ANALYTICS_VIEW,
  P.ANALYTICS_EXPORT,
  P.REPORTS_VIEW,
  // Integrations
  P.INTEGRATIONS_VIEW,
  P.INTEGRATIONS_MANAGE,
  P.API_VIEW,
  // Docs
  P.DOCS_VIEW,
];

const CLIENT_OWNER_PERMISSIONS: Permission[] = [
  P.DASHBOARD_VIEW,
  // Campaigns — full CRUD for their client
  P.CAMPAIGNS_VIEW,
  P.CAMPAIGNS_CREATE,
  P.CAMPAIGNS_EDIT,
  P.CAMPAIGNS_DELETE,
  P.CAMPAIGNS_ANALYTICS,
  // Templates — view and use, limited create
  P.TEMPLATES_VIEW,
  P.TEMPLATES_CREATE,
  P.TEMPLATES_EDIT,
  // Landing Pages
  P.LANDING_PAGES_VIEW,
  P.LANDING_PAGES_CREATE,
  P.LANDING_PAGES_EDIT,
  // Contacts — full CRUD for their client
  P.CONTACTS_VIEW,
  P.CONTACTS_CREATE,
  P.CONTACTS_EDIT,
  P.CONTACTS_DELETE,
  P.CONTACTS_IMPORT,
  P.CONTACTS_EXPORT,
  // Audiences
  P.AUDIENCES_VIEW,
  P.AUDIENCES_CREATE,
  P.AUDIENCES_MANAGE,
  // Gift Cards — assign and view only
  P.GIFT_CARDS_VIEW,
  P.GIFT_CARDS_ASSIGN_CAMPAIGN,
  P.GIFT_CARDS_REDEEM,
  P.GIFT_CARDS_VIEW_REDEMPTIONS,
  // Billing — view only
  P.BILLING_VIEW,
  P.CREDITS_VIEW,
  // Call Center
  P.CALL_CENTER_VIEW,
  P.CALL_CENTER_REDEEM,
  // Forms
  P.FORMS_VIEW,
  P.FORMS_CREATE,
  P.FORMS_EDIT,
  P.FORMS_ANALYTICS,
  // Users — can invite within their client
  P.USERS_VIEW,
  P.USERS_INVITE,
  // Team
  P.TEAM_VIEW,
  P.ACTIVITIES_VIEW,
  P.TASKS_VIEW,
  P.TASKS_MANAGE,
  // Settings — limited
  P.SETTINGS_GENERAL,
  P.SETTINGS_NOTIFICATIONS,
  // Analytics
  P.ANALYTICS_VIEW,
  P.REPORTS_VIEW,
  // Docs
  P.DOCS_VIEW,
];

const DEVELOPER_PERMISSIONS: Permission[] = [
  // Developer is a CROSS-CUTTING role — API and integration focused
  P.DASHBOARD_VIEW,
  P.API_VIEW,
  P.API_MANAGE,
  P.INTEGRATIONS_VIEW,
  P.INTEGRATIONS_MANAGE,
  P.SETTINGS_API,
  P.SETTINGS_INTEGRATIONS,
  P.DOCS_VIEW,
  P.ANALYTICS_VIEW,
  // Developers can view campaigns/contacts for API context but not manage via UI
  P.CAMPAIGNS_VIEW,
  P.CONTACTS_VIEW,
  P.TEMPLATES_VIEW,
  P.FORMS_VIEW,
];

const CALL_CENTER_PERMISSIONS: Permission[] = [
  // Call center ONLY sees redemption interface
  P.DASHBOARD_VIEW, // Minimal dashboard with their stats
  P.CALL_CENTER_VIEW,
  P.CALL_CENTER_REDEEM,
  P.GIFT_CARDS_REDEEM,
  P.GIFT_CARDS_VIEW_REDEMPTIONS,
  P.DOCS_VIEW,
];

// ============================================================================
// Exported Matrix
// ============================================================================

export const ROLE_PERMISSION_MATRIX: Record<AppRole, Permission[]> = {
  admin:         ADMIN_PERMISSIONS,
  tech_support:  TECH_SUPPORT_PERMISSIONS,
  agency_owner:  AGENCY_OWNER_PERMISSIONS,
  company_owner: CLIENT_OWNER_PERMISSIONS,
  developer:     DEVELOPER_PERMISSIONS,
  call_center:   CALL_CENTER_PERMISSIONS,
};

/**
 * Check if a role has a specific permission by default
 */
export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSION_MATRIX[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: AppRole): Permission[] {
  return ROLE_PERMISSION_MATRIX[role] ?? [];
}
