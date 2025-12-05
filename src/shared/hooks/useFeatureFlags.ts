/**
 * Feature Flags Hook
 * 
 * Provides easy access to feature flags throughout the application.
 * Can be extended to fetch flags from backend for per-client configuration.
 */

import { useMemo } from 'react';
import { FEATURE_FLAGS, FeatureFlag, isFeatureEnabled, FEATURE_FLAG_DESCRIPTIONS } from '@core/config';

interface UseFeatureFlagsResult {
  flags: typeof FEATURE_FLAGS;
  isEnabled: (flag: FeatureFlag) => boolean;
  getDescription: (flag: FeatureFlag) => string;
  enabledFlags: FeatureFlag[];
  disabledFlags: FeatureFlag[];
}

/**
 * Hook for accessing feature flags
 * 
 * @example
 * const { isEnabled } = useFeatureFlags();
 * if (isEnabled('global_search')) {
 *   // render search component
 * }
 */
export function useFeatureFlags(): UseFeatureFlagsResult {
  const enabledFlags = useMemo(() => 
    (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter(flag => FEATURE_FLAGS[flag]),
    []
  );

  const disabledFlags = useMemo(() => 
    (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter(flag => !FEATURE_FLAGS[flag]),
    []
  );

  return {
    flags: FEATURE_FLAGS,
    isEnabled: isFeatureEnabled,
    getDescription: (flag: FeatureFlag) => FEATURE_FLAG_DESCRIPTIONS[flag] || flag,
    enabledFlags,
    disabledFlags,
  };
}

/**
 * Check if a specific feature is enabled
 * Convenience function for use outside of React components
 */
export { isFeatureEnabled };

