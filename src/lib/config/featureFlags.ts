/**
 * Feature Flags for Gift Card System Overhaul
 * 
 * These flags allow for gradual rollout and quick rollback if issues arise.
 * Flags can be toggled per environment or per client for safe production deployment.
 */

export const FEATURE_FLAGS = {
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
  simplified_gift_card_ui: 'Simplified brand+denomination selector in campaign wizard',
  atomic_gift_card_assignment: 'Atomic gift card assignment prevents double redemptions',
  hide_pools_from_clients: 'Restrict gift card inventory access to admin and agencies',
  legacy_pool_selector: 'Fallback to old pool dropdown selector',
  multi_condition_rewards: 'Allow recipients to receive multiple gift cards for different conditions',
  show_availability_counts: 'Display availability counts in gift card selector',
  persistent_card_assignment: 'Delivery failures preserve card assignments for retry',
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



