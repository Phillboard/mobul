import { LucideIcon, User, Settings, Phone, MessageSquare, Palette, Database, Zap, Code, Users, Shield, CreditCard, Building2, Mail } from "lucide-react";
import { AppRole } from "./roleUtils";

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
}

export const settingsTabs: TabConfig[] = [
  // Personal Settings
  {
    id: 'account',
    label: 'Account',
    icon: User,
    roles: 'all',
    description: 'Personal profile and preferences',
    group: 'personal'
  },
  
  // Client Settings
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer'],
    permissions: ['settings.view'],
    description: 'Organization and client settings',
    group: 'client'
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: Palette,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['clients.edit'],
    requiresClient: true,
    description: 'Customize brand colors, fonts, and logo',
    group: 'client'
  },
  {
    id: 'phone',
    label: 'Phone Numbers',
    icon: Phone,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: ['settings.phone_numbers'],
    description: 'Manage call tracking numbers',
    group: 'client'
  },
  {
    id: 'sms',
    label: 'SMS Logs',
    icon: MessageSquare,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: ['settings.view'],
    description: 'View SMS delivery history',
    group: 'client'
  },
  
  // Integrations
  {
    id: 'crm',
    label: 'CRM Integration',
    icon: Database,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['settings.integrations'],
    requiresClient: true,
    description: 'Connect your CRM system',
    group: 'integrations'
  },
  {
    id: 'zapier',
    label: 'Zapier',
    icon: Zap,
    roles: ['admin', 'agency_owner', 'company_owner', 'developer'],
    permissions: ['settings.integrations'],
    requiresClient: true,
    description: 'Automation and webhooks',
    group: 'integrations'
  },
  {
    id: 'mail-provider',
    label: 'Mail Provider',
    icon: Mail,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['settings.edit'],
    requiresClient: false,
    description: 'Configure direct mail fulfillment provider',
    group: 'integrations'
  },
  {
    id: 'api',
    label: 'API Keys',
    icon: Code,
    roles: ['admin', 'developer'],
    permissions: ['settings.api'],
    description: 'Developer API access',
    group: 'integrations'
  },
  
  // Administration
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['users.manage'],
    description: 'Invite and manage team members',
    group: 'admin'
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    roles: ['admin', 'tech_support'],
    permissions: ['platform.security.manage'],
    description: 'Audit logs and security settings',
    group: 'admin'
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['settings.billing'],
    description: 'Invoices and usage tracking',
    group: 'admin'
  }
];

export const settingsGroups = [
  { id: 'personal', label: 'Personal', description: 'Your account settings' },
  { id: 'client', label: 'Client Settings', description: 'Organization and branding' },
  { id: 'integrations', label: 'Integrations', description: 'Connect external services' },
  { id: 'admin', label: 'Administration', description: 'Users, security, and billing' }
] as const;
