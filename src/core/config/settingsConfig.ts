import { LucideIcon, User, Settings, Phone, MessageSquare, Palette, Database, Zap, Code, Users, Shield, CreditCard, Building2, Mail, Plug } from "lucide-react";
import { AppRole } from "@/core/auth/roles";
import { P } from "@/core/auth/permissionRegistry";
import { FeatureStatusType } from "./featureStatus";

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  roles?: AppRole[] | 'all';
  permissions?: string[];
  requiresClient?: boolean;
  requiresOrg?: boolean;
  description?: string;
  group: 'personal' | 'client' | 'integrations' | 'admin';
  /** Feature status for Coming Soon/Beta badges */
  status?: FeatureStatusType;
  /** Feature key for ComingSoon wrapper lookup */
  featureKey?: string;
  /** Whether this tab is hidden (legacy routes still work) */
  hidden?: boolean;
}

/**
 * NEW 6-TAB STRUCTURE (Week 4 Consolidation)
 * 
 * Account - Profile, preferences, password, 2FA (coming soon)
 * Company - Branding (logo, colors), business info (industry, timezone)
 * Communications - Phone numbers, Twilio configuration, SMS templates
 * Integrations - Overview | CRM (coming soon) | Zapier | Mail Provider | API Keys
 * Team - Members | Pending Invitations | Roles & Permissions
 * Billing (Coming Soon) - Usage metrics, invoices, payment methods
 */
export const settingsTabs: TabConfig[] = [
  // ===================
  // PERSONAL SETTINGS
  // ===================
  {
    id: 'account',
    label: 'Account',
    icon: User,
    roles: 'all',
    description: 'Profile, preferences, password, security',
    group: 'personal'
  },
  
  // ===================
  // CLIENT SETTINGS  
  // ===================
  {
    id: 'company',
    label: 'Company',
    icon: Building2,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_GENERAL],
    description: 'Business info, branding, and logo',
    group: 'client'
  },
  {
    id: 'communications',
    label: 'Communications',
    icon: Phone,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_GENERAL],
    description: 'Phone numbers and Twilio configuration',
    group: 'client'
  },
  
  // ===================
  // INTEGRATIONS
  // ===================
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug,
    roles: ['admin', 'agency_owner', 'company_owner', 'developer'],
    permissions: [P.SETTINGS_INTEGRATIONS],
    description: 'CRM, Zapier, Mail Provider, API',
    group: 'integrations'
  },
  
  // ===================
  // ADMINISTRATION
  // ===================
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: [P.USERS_MANAGE],
    description: 'Team members, invitations, and roles',
    group: 'admin'
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_BILLING],
    description: 'Usage, invoices, and payment methods',
    group: 'admin',
    status: 'coming_soon',
    featureKey: 'billing'
  },

  // ===================
  // LEGACY/HIDDEN TABS (for backward compatibility redirects)
  // ===================
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer'],
    permissions: [P.SETTINGS_GENERAL],
    description: 'Redirects to Company',
    group: 'client',
    hidden: true
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: Palette,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_GENERAL],
    requiresClient: true,
    description: 'Redirects to Company',
    group: 'client',
    hidden: true
  },
  {
    id: 'phone',
    label: 'Phone Numbers',
    icon: Phone,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_GENERAL],
    description: 'Redirects to Communications',
    group: 'client',
    hidden: true
  },
  {
    id: 'sms',
    label: 'SMS Logs',
    icon: MessageSquare,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_GENERAL],
    description: 'Redirects to Activity page',
    group: 'client',
    hidden: true
  },
  {
    id: 'crm',
    label: 'CRM Integration',
    icon: Database,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_INTEGRATIONS],
    requiresClient: true,
    description: 'Redirects to Integrations',
    group: 'integrations',
    hidden: true
  },
  {
    id: 'zapier',
    label: 'Zapier',
    icon: Zap,
    roles: ['admin', 'agency_owner', 'company_owner', 'developer'],
    permissions: [P.SETTINGS_INTEGRATIONS],
    requiresClient: true,
    description: 'Redirects to Integrations',
    group: 'integrations',
    hidden: true
  },
  {
    id: 'mail-provider',
    label: 'Mail Provider',
    icon: Mail,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: [P.SETTINGS_GENERAL],
    requiresClient: false,
    description: 'Redirects to Integrations',
    group: 'integrations',
    hidden: true
  },
  {
    id: 'api',
    label: 'API Keys',
    icon: Code,
    roles: ['admin', 'developer'],
    permissions: [P.SETTINGS_API],
    description: 'Redirects to Integrations',
    group: 'integrations',
    hidden: true
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    roles: ['admin'],
    permissions: [P.USERS_MANAGE],
    description: 'Redirects to Team',
    group: 'admin',
    hidden: true
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    roles: ['admin', 'tech_support'],
    permissions: [P.SETTINGS_SECURITY_MANAGE],
    description: 'Redirects to Account/Activity',
    group: 'admin',
    hidden: true
  }
];

/** Get visible tabs (excluding hidden legacy tabs) */
export const getVisibleTabs = () => settingsTabs.filter(tab => !tab.hidden);

/** Legacy route redirects */
export const legacyRouteRedirects: Record<string, string> = {
  'general': 'company',
  'branding': 'company',
  'phone': 'communications',
  'sms': '/activity?tab=gift-cards', // External redirect
  'crm': 'integrations?tab=crm',
  'zapier': 'integrations?tab=zapier',
  'mail-provider': 'integrations?tab=mail-provider',
  'api': 'integrations?tab=api',
  'users': 'team',
  'security': 'account', // Security settings moved to Account
};

export const settingsGroups = [
  { id: 'personal', label: 'Personal', description: 'Your account settings' },
  { id: 'client', label: 'Client Settings', description: 'Organization and branding' },
  { id: 'integrations', label: 'Integrations', description: 'Connect external services' },
  { id: 'admin', label: 'Administration', description: 'Users and billing' }
] as const;
