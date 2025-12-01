/**
 * Feature Flags Configuration
 * 
 * These flags allow for gradual rollout and quick rollback if issues arise.
 * Flags can be toggled per environment or per client for safe production deployment.
 */

export const FEATURE_FLAGS = {
  // ===== Gift Card System =====
  /**
   * Use new brand+denomination selector instead of pool dropdown
   * When true: SimpleBrandDenominationSelector is used in campaign wizard
   * When false: Falls back to legacy pool selector
   */
  simplified_gift_card_ui: true,

  /**
   * Use new atomic gift card assignment system
   * When true: claim_card_atomic RPC with brand+value parameters
   * When false: Falls back to legacy claim functions
   */
  atomic_gift_card_assignment: true,

  /**
   * Hide /gift-cards routes from company_owner and call_center roles
   * When true: Only admin and agency_owner can access gift card inventory
   * When false: All authenticated users can access
   */
  hide_pools_from_clients: true,

  /**
   * Use legacy pool selector in campaign wizard
   * When true: Shows old pool dropdown
   * When false: Uses new brand+denomination selector
   */
  legacy_pool_selector: false,

  /**
   * Enable multi-condition gift card rewards
   * When true: Recipients can receive multiple cards for different conditions
   * When false: Single card per recipient
   */
  multi_condition_rewards: true,

  /**
   * Show availability counts in brand selector
   * When true: Displays "25 available" next to each brand/denomination
   * When false: Hides availability info
   */
  show_availability_counts: true,

  /**
   * Enable delivery retry with same assigned card
   * When true: Failed deliveries reuse the same assigned card
   * When false: Each delivery attempt claims a new card
   */
  persistent_card_assignment: true,

  // ===== UI/UX Features =====
  /**
   * Enable global search command palette (Cmd+K)
   */
  global_search: true,

  /**
   * Enable keyboard shortcuts
   */
  keyboard_shortcuts: true,

  /**
   * Enable enhanced analytics dashboard
   */
  enhanced_analytics: true,

  /**
   * Show conversion funnel visualization
   */
  conversion_funnel: true,

  /**
   * Enable campaign ROI calculator
   */
  roi_calculator: true,

  // ===== Campaign Features =====
  /**
   * Enable campaign cloning functionality
   */
  campaign_cloning: true,

  /**
   * Enable campaign templates
   */
  campaign_templates: false, // Not yet implemented

  /**
   * Enable A/B testing for campaigns
   */
  ab_testing: false, // Not yet implemented

  // ===== Contact Features =====
  /**
   * Enable tags system for contacts and campaigns
   */
  tags_system: true,

  /**
   * Enable contact segmentation builder
   */
  segment_builder: false, // Not yet implemented

  /**
   * Enable bulk operations for contacts
   */
  bulk_operations: true,

  // ===== Call Center Features =====
  /**
   * Enable call scripts with dynamic merge fields
   */
  dynamic_call_scripts: true,

  /**
   * Enable bulk code validation
   */
  bulk_code_validation: true,

  // ===== Integrations =====
  /**
   * Enable additional Zapier trigger events
   */
  extended_zapier_triggers: true,

  /**
   * Enable webhook retry queue
   */
  webhook_retry_queue: true,

  // ===== Admin Features =====
  /**
   * Enable credit management system
   */
  credit_management: true,

  /**
   * Enable inventory monitoring alerts
   */
  inventory_alerts: true,

  /**
   * Enable error tracking dashboard
   */
  error_tracking: true,

  // ===== Beta Features =====
  /**
   * Enable AI-powered features (experimental)
   */
  ai_features: false,

  /**
   * Enable two-factor authentication
   */
  two_factor_auth: false, // Not yet implemented

  /**
   * Enable white-labeling support
   */
  white_labeling: false, // Not yet implemented
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter(
    (flag) => FEATURE_FLAGS[flag]
  );
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter(
    (flag) => !FEATURE_FLAGS[flag]
  );
}

/**
 * Feature flag descriptions for documentation
 */
export const FEATURE_FLAG_DESCRIPTIONS: Record<FeatureFlag, string> = {
  // Gift Card System
  simplified_gift_card_ui: 'Simplified brand+denomination selector in campaign wizard',
  atomic_gift_card_assignment: 'Atomic gift card assignment prevents double redemptions',
  hide_pools_from_clients: 'Restrict gift card inventory access to admin and agencies',
  legacy_pool_selector: 'Fallback to old pool dropdown selector',
  multi_condition_rewards: 'Allow recipients to receive multiple gift cards for different conditions',
  show_availability_counts: 'Display availability counts in gift card selector',
  persistent_card_assignment: 'Delivery failures preserve card assignments for retry',
  
  // UI/UX Features
  global_search: 'Global search command palette (Cmd+K)',
  keyboard_shortcuts: 'Keyboard shortcuts for power users',
  enhanced_analytics: 'Enhanced analytics dashboard with ROI and funnel',
  conversion_funnel: 'Visual conversion funnel in campaign analytics',
  roi_calculator: 'Campaign ROI calculator component',
  
  // Campaign Features
  campaign_cloning: 'Clone campaigns with settings',
  campaign_templates: 'Pre-built campaign templates library',
  ab_testing: 'A/B testing for campaigns',
  
  // Contact Features
  tags_system: 'Tags for organizing contacts and campaigns',
  segment_builder: 'Visual segment builder for contacts',
  bulk_operations: 'Bulk operations for contacts and codes',
  
  // Call Center Features
  dynamic_call_scripts: 'Call scripts with dynamic merge fields',
  bulk_code_validation: 'Validate multiple codes at once',
  
  // Integrations
  extended_zapier_triggers: 'Additional Zapier trigger events',
  webhook_retry_queue: 'Background retry for failed webhooks',
  
  // Admin Features
  credit_management: 'Credit allocation and tracking system',
  inventory_alerts: 'Low inventory monitoring and alerts',
  error_tracking: 'Centralized error tracking dashboard',
  
  // Beta Features
  ai_features: 'AI-powered features (experimental)',
  two_factor_auth: 'Two-factor authentication',
  white_labeling: 'White-labeling support for resellers',
};

/**
 * Benefits of the new gift card system
 */
export const SYSTEM_BENEFITS = {
  clientExperience: [
    'No pool management complexity',
    'Simple brand + denomination selection',
    'Clear availability information',
    'Appropriate error messages with guidance',
  ],
  agencyExperience: [
    'Access to marketplace for purchasing',
    'Simplified gift card selection',
    'Read-only pool summaries',
    'Clear credit balance display',
  ],
  adminExperience: [
    'Full control over marketplace and pools',
    'Comprehensive pool management',
    'Pricing controls',
    'Clean, professional UI',
  ],
  systemIntegrity: [
    'Zero double redemptions (atomic locking)',
    'Multi-condition rewards support',
    'Delivery failures preserve assignments',
    'All permissions enforced correctly',
    'Performance < 500ms for claims',
  ],
};

export default FEATURE_FLAGS;



