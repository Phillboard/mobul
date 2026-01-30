/**
 * Feature Status Configuration
 * 
 * Defines the status of features across the platform for:
 * - "Coming Soon" UI treatment
 * - Admin testing access
 * - Beta feature management
 * 
 * This is separate from featureFlags.ts which controls runtime behavior.
 * featureStatus.ts controls UI presentation and access patterns.
 */

export type FeatureStatusType = 'stable' | 'coming_soon' | 'beta' | 'admin_only';

export interface FeatureStatusConfig {
  /** Current status of the feature */
  status: FeatureStatusType;
  /** Whether admins can access/test coming_soon or beta features */
  adminCanAccess: boolean;
  /** Expected release date for coming_soon features (e.g., "Q2 2026") */
  expectedDate?: string;
  /** Human-readable description of what the feature does */
  description: string;
  /** Short label for badges/tooltips */
  label: string;
}

/**
 * Feature status registry
 * 
 * Keys should be descriptive and match feature areas:
 * - billing: Billing & Invoices page
 * - landing_page_designer: GrapesJS visual editor for landing pages
 * - mail_designer: GrapesJS visual editor for mail pieces
 * - crm_integration: CRM sync functionality
 * - two_factor_auth: 2FA for user accounts
 * - zapier_integration: Zapier connections
 * - api_keys: API key management
 */
export const FEATURE_STATUS: Record<string, FeatureStatusConfig> = {
  // Core Platform Features
  billing: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q2 2026',
    description: 'View invoices, manage payment methods, and track usage metrics',
    label: 'Billing & Invoices',
  },

  // Design Tools
  landing_page_designer: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q2 2026',
    description: 'Visual drag-and-drop editor for creating landing pages',
    label: 'Visual Page Editor',
  },

  mail_designer: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q2 2026',
    description: 'Visual drag-and-drop editor for designing mail pieces',
    label: 'Mail Designer',
  },

  // Integrations
  crm_integration: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q2 2026',
    description: 'Connect your CRM to automatically sync contacts and trigger rewards',
    label: 'CRM Integration',
  },

  zapier_integration: {
    status: 'stable',
    adminCanAccess: true,
    description: 'Connect to 5000+ apps through Zapier automation platform',
    label: 'Zapier',
  },

  api_keys: {
    status: 'stable',
    adminCanAccess: true,
    description: 'Manage API keys for programmatic access to the platform',
    label: 'API Keys',
  },

  // Security Features
  two_factor_auth: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q2 2026',
    description: 'Add an extra layer of security with two-factor authentication',
    label: 'Two-Factor Auth',
  },

  // Advanced Campaign Features
  ab_testing: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q3 2026',
    description: 'Test different variations of your campaigns to optimize performance',
    label: 'A/B Testing',
  },

  campaign_templates: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q2 2026',
    description: 'Pre-built campaign templates for quick setup',
    label: 'Campaign Templates',
  },

  segment_builder: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q3 2026',
    description: 'Create dynamic contact segments based on attributes and behavior',
    label: 'Segment Builder',
  },

  // AI Features
  ai_assistant: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q3 2026',
    description: 'AI-powered assistant for campaign optimization and content generation',
    label: 'AI Assistant',
  },

  // White Label
  white_labeling: {
    status: 'coming_soon',
    adminCanAccess: true,
    expectedDate: 'Q4 2026',
    description: 'Fully customizable branding for resellers and agencies',
    label: 'White Labeling',
  },
} as const;

export type FeatureKey = keyof typeof FEATURE_STATUS;

/**
 * Get feature status configuration
 * Returns undefined if feature is not registered (treated as stable)
 */
export function getFeatureStatus(featureKey: string): FeatureStatusConfig | undefined {
  return FEATURE_STATUS[featureKey];
}

/**
 * Check if a feature is marked as coming soon
 */
export function isFeatureComingSoon(featureKey: string): boolean {
  const config = FEATURE_STATUS[featureKey];
  return config?.status === 'coming_soon';
}

/**
 * Check if a feature is in beta
 */
export function isFeatureBeta(featureKey: string): boolean {
  const config = FEATURE_STATUS[featureKey];
  return config?.status === 'beta';
}

/**
 * Check if a feature is admin only
 */
export function isFeatureAdminOnly(featureKey: string): boolean {
  const config = FEATURE_STATUS[featureKey];
  return config?.status === 'admin_only';
}

/**
 * Check if a feature is stable (available to all)
 */
export function isFeatureStable(featureKey: string): boolean {
  const config = FEATURE_STATUS[featureKey];
  // If not registered, treat as stable
  return !config || config.status === 'stable';
}

/**
 * Get all features by status
 */
export function getFeaturesByStatus(status: FeatureStatusType): string[] {
  return Object.entries(FEATURE_STATUS)
    .filter(([_, config]) => config.status === status)
    .map(([key]) => key);
}

/**
 * Get all coming soon features
 */
export function getComingSoonFeatures(): string[] {
  return getFeaturesByStatus('coming_soon');
}

/**
 * Get all beta features
 */
export function getBetaFeatures(): string[] {
  return getFeaturesByStatus('beta');
}
