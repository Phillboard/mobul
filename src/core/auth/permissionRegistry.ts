/**
 * PERMISSION REGISTRY — Single Source of Truth
 * 
 * Every permission in the ACE Engage platform is defined here.
 * Components import these constants instead of using magic strings.
 * The database `permissions` table must be seeded to match this file exactly.
 * 
 * Naming convention: {domain}.{action}
 * Domains: dashboard, campaigns, templates, contacts, audiences, gift_cards,
 *          call_center, forms, settings, users, agencies, analytics, 
 *          integrations, admin, docs
 * Actions: view, create, edit, delete, manage, export, import
 */

// ============================================================================
// Permission String Constants
// ============================================================================

export const P = {
  // ── Dashboard ──────────────────────────────────────────────────────────
  DASHBOARD_VIEW:          'dashboard.view',
  PLATFORM_DASHBOARD_VIEW: 'dashboard.platform_view',

  // ── Campaigns ──────────────────────────────────────────────────────────
  CAMPAIGNS_VIEW:          'campaigns.view',
  CAMPAIGNS_CREATE:        'campaigns.create',
  CAMPAIGNS_EDIT:          'campaigns.edit',
  CAMPAIGNS_DELETE:        'campaigns.delete',
  CAMPAIGNS_ANALYTICS:     'campaigns.analytics',

  // ── Mail Templates ─────────────────────────────────────────────────────
  TEMPLATES_VIEW:          'templates.view',
  TEMPLATES_CREATE:        'templates.create',
  TEMPLATES_EDIT:          'templates.edit',
  TEMPLATES_DELETE:        'templates.delete',

  // ── Landing Pages ──────────────────────────────────────────────────────
  LANDING_PAGES_VIEW:      'landingpages.view',
  LANDING_PAGES_CREATE:    'landingpages.create',
  LANDING_PAGES_EDIT:      'landingpages.edit',
  LANDING_PAGES_DELETE:    'landingpages.delete',

  // ── Contacts & Audiences ───────────────────────────────────────────────
  CONTACTS_VIEW:           'contacts.view',
  CONTACTS_CREATE:         'contacts.create',
  CONTACTS_EDIT:           'contacts.edit',
  CONTACTS_DELETE:         'contacts.delete',
  CONTACTS_IMPORT:         'contacts.import',
  CONTACTS_EXPORT:         'contacts.export',
  AUDIENCES_VIEW:          'audiences.view',
  AUDIENCES_CREATE:        'audiences.create',
  AUDIENCES_MANAGE:        'audiences.manage',

  // ── Gift Cards ─────────────────────────────────────────────────────────
  GIFT_CARDS_VIEW:              'gift_cards.view',
  GIFT_CARDS_MANAGE_POOLS:      'gift_cards.manage_pools',
  GIFT_CARDS_PURCHASE:          'gift_cards.purchase',
  GIFT_CARDS_MARKETPLACE_ADMIN: 'gift_cards.marketplace_admin',
  GIFT_CARDS_RECORD_PURCHASE:   'gift_cards.record_purchase',
  GIFT_CARDS_PRICING:           'gift_cards.pricing',
  GIFT_CARDS_BRAND_MANAGEMENT:  'gift_cards.brand_management',
  GIFT_CARDS_ASSIGN_CAMPAIGN:   'gift_cards.assign_to_campaign',
  GIFT_CARDS_REDEEM:            'gift_cards.redeem',
  GIFT_CARDS_VIEW_REDEMPTIONS:  'gift_cards.view_redemptions',
  GIFT_CARDS_UPLOAD:            'gift_cards.upload',
  GIFT_CARDS_DELIVERY_HISTORY:  'gift_cards.delivery_history',

  // ── Credits & Billing ──────────────────────────────────────────────────
  BILLING_VIEW:            'billing.view',
  BILLING_MANAGE:          'billing.manage',
  CREDITS_VIEW:            'credits.view',
  CREDITS_MANAGE:          'credits.manage',

  // ── Call Center ────────────────────────────────────────────────────────
  CALL_CENTER_VIEW:        'calls.view',
  CALL_CENTER_REDEEM:      'calls.confirm_redemption',
  CALL_CENTER_SCRIPTS:     'calls.manage',

  // ── ACE Forms ──────────────────────────────────────────────────────────
  FORMS_VIEW:              'forms.view',
  FORMS_CREATE:            'forms.create',
  FORMS_EDIT:              'forms.edit',
  FORMS_DELETE:            'forms.delete',
  FORMS_ANALYTICS:         'forms.analytics',

  // ── User Management ────────────────────────────────────────────────────
  USERS_VIEW:              'users.view',
  USERS_MANAGE:            'users.manage',
  USERS_INVITE:            'users.invite',
  USERS_DELETE:            'users.delete',

  // ── Team & Activities ──────────────────────────────────────────────────
  TEAM_VIEW:               'team.view',
  TEAM_MANAGE:             'team.manage',
  ACTIVITIES_VIEW:         'activities.view',
  TASKS_VIEW:              'tasks.view',
  TASKS_MANAGE:            'tasks.manage',

  // ── Agency Management ──────────────────────────────────────────────────
  AGENCIES_VIEW:           'agencies.view',
  AGENCIES_CREATE:         'agencies.create',
  AGENCIES_MANAGE:         'agencies.manage',

  // ── Settings ───────────────────────────────────────────────────────────
  SETTINGS_GENERAL:        'settings.general',
  SETTINGS_BILLING:        'settings.billing',
  SETTINGS_SECURITY:       'settings.security.view',
  SETTINGS_SECURITY_MANAGE:'platform.security.manage',
  SETTINGS_NOTIFICATIONS:  'settings.notifications',
  SETTINGS_INTEGRATIONS:   'settings.integrations',
  SETTINGS_API:            'settings.api',

  // ── Analytics & Reports ────────────────────────────────────────────────
  ANALYTICS_VIEW:          'analytics.view',
  ANALYTICS_EXPORT:        'analytics.export',
  REPORTS_VIEW:            'reports.view',
  REPORTS_FINANCIAL:       'reports.financial',

  // ── Integrations ───────────────────────────────────────────────────────
  INTEGRATIONS_VIEW:       'integrations.view',
  INTEGRATIONS_MANAGE:     'integrations.manage',
  API_VIEW:                'api.view',
  API_MANAGE:              'api.manage',

  // ── Admin Tools ────────────────────────────────────────────────────────
  ADMIN_SYSTEM_HEALTH:     'admin.system_health',
  ADMIN_AUDIT_LOG:         'admin.audit_log',
  ADMIN_ERROR_LOGS:        'admin.error_logs',
  ADMIN_DEMO_DATA:         'admin.demo_data',
  ADMIN_SITE_DIRECTORY:    'admin.site_directory',
  ADMIN_ORGANIZATIONS:     'admin.organizations',

  // ── Documentation ──────────────────────────────────────────────────────
  DOCS_VIEW:               'docs.view',
  DOCS_MANAGE:             'docs.manage',
} as const;

export type Permission = typeof P[keyof typeof P];

// All permissions as array (for seeding database)
export const ALL_PERMISSIONS: Permission[] = Object.values(P);

// Permission categories (for UI grouping in admin panel)
export const PERMISSION_CATEGORIES = {
  'Dashboard':       [P.DASHBOARD_VIEW, P.PLATFORM_DASHBOARD_VIEW],
  'Campaigns':       [P.CAMPAIGNS_VIEW, P.CAMPAIGNS_CREATE, P.CAMPAIGNS_EDIT, P.CAMPAIGNS_DELETE, P.CAMPAIGNS_ANALYTICS],
  'Mail Templates':  [P.TEMPLATES_VIEW, P.TEMPLATES_CREATE, P.TEMPLATES_EDIT, P.TEMPLATES_DELETE],
  'Landing Pages':   [P.LANDING_PAGES_VIEW, P.LANDING_PAGES_CREATE, P.LANDING_PAGES_EDIT, P.LANDING_PAGES_DELETE],
  'Contacts':        [P.CONTACTS_VIEW, P.CONTACTS_CREATE, P.CONTACTS_EDIT, P.CONTACTS_DELETE, P.CONTACTS_IMPORT, P.CONTACTS_EXPORT],
  'Audiences':       [P.AUDIENCES_VIEW, P.AUDIENCES_CREATE, P.AUDIENCES_MANAGE],
  'Gift Cards':      [P.GIFT_CARDS_VIEW, P.GIFT_CARDS_MANAGE_POOLS, P.GIFT_CARDS_PURCHASE, P.GIFT_CARDS_MARKETPLACE_ADMIN, P.GIFT_CARDS_RECORD_PURCHASE, P.GIFT_CARDS_PRICING, P.GIFT_CARDS_BRAND_MANAGEMENT, P.GIFT_CARDS_ASSIGN_CAMPAIGN, P.GIFT_CARDS_REDEEM, P.GIFT_CARDS_VIEW_REDEMPTIONS, P.GIFT_CARDS_UPLOAD, P.GIFT_CARDS_DELIVERY_HISTORY],
  'Billing':         [P.BILLING_VIEW, P.BILLING_MANAGE, P.CREDITS_VIEW, P.CREDITS_MANAGE],
  'Call Center':     [P.CALL_CENTER_VIEW, P.CALL_CENTER_REDEEM, P.CALL_CENTER_SCRIPTS],
  'ACE Forms':       [P.FORMS_VIEW, P.FORMS_CREATE, P.FORMS_EDIT, P.FORMS_DELETE, P.FORMS_ANALYTICS],
  'Users':           [P.USERS_VIEW, P.USERS_MANAGE, P.USERS_INVITE, P.USERS_DELETE],
  'Team':            [P.TEAM_VIEW, P.TEAM_MANAGE, P.ACTIVITIES_VIEW, P.TASKS_VIEW, P.TASKS_MANAGE],
  'Agencies':        [P.AGENCIES_VIEW, P.AGENCIES_CREATE, P.AGENCIES_MANAGE],
  'Settings':        [P.SETTINGS_GENERAL, P.SETTINGS_BILLING, P.SETTINGS_SECURITY, P.SETTINGS_SECURITY_MANAGE, P.SETTINGS_NOTIFICATIONS, P.SETTINGS_INTEGRATIONS, P.SETTINGS_API],
  'Analytics':       [P.ANALYTICS_VIEW, P.ANALYTICS_EXPORT, P.REPORTS_VIEW, P.REPORTS_FINANCIAL],
  'Integrations':    [P.INTEGRATIONS_VIEW, P.INTEGRATIONS_MANAGE, P.API_VIEW, P.API_MANAGE],
  'Admin':           [P.ADMIN_SYSTEM_HEALTH, P.ADMIN_AUDIT_LOG, P.ADMIN_ERROR_LOGS, P.ADMIN_DEMO_DATA, P.ADMIN_SITE_DIRECTORY, P.ADMIN_ORGANIZATIONS],
  'Documentation':   [P.DOCS_VIEW, P.DOCS_MANAGE],
} as const;
