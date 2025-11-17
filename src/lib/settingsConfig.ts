import { LucideIcon, User, Settings, Phone, MessageSquare, Palette, Database, Zap, Code, Users, Shield, CreditCard } from "lucide-react";
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
}

export const settingsTabs: TabConfig[] = [
  {
    id: 'account',
    label: 'Account',
    icon: User,
    roles: 'all',
    description: 'Personal profile and preferences'
  },
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner', 'developer'],
    permissions: ['settings.view'],
    description: 'Platform-wide and organization settings'
  },
  {
    id: 'phone',
    label: 'Phone Numbers',
    icon: Phone,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: ['settings.phone_numbers'],
    description: 'Manage Twilio phone numbers and call routing'
  },
  {
    id: 'sms',
    label: 'SMS Delivery',
    icon: MessageSquare,
    roles: ['admin', 'tech_support', 'agency_owner', 'company_owner'],
    permissions: ['settings.view'],
    description: 'View SMS delivery logs and status'
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: Palette,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['clients.edit'],
    requiresClient: true,
    description: 'Customize client branding and theme'
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Database,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['settings.integrations'],
    requiresClient: true,
    description: 'Connect CRM systems'
  },
  {
    id: 'zapier',
    label: 'Zapier',
    icon: Zap,
    roles: ['admin', 'agency_owner', 'company_owner', 'developer'],
    permissions: ['settings.integrations'],
    requiresClient: true,
    description: 'Zapier integrations and webhooks'
  },
  {
    id: 'api',
    label: 'API',
    icon: Code,
    roles: ['admin', 'developer'],
    permissions: ['settings.api'],
    description: 'API keys and documentation'
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['users.manage'],
    description: 'Invite and manage users'
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    roles: ['admin', 'tech_support'],
    permissions: ['platform.security.manage'],
    description: 'Security audit logs and settings'
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    roles: ['admin', 'agency_owner', 'company_owner'],
    permissions: ['settings.billing'],
    description: 'View invoices and usage'
  }
];
