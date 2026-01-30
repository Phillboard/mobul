/**
 * useFeatureStatus Hook
 * 
 * Hook for checking feature availability based on status and user role.
 * Used with ComingSoon component for UI gating.
 */

import { useMemo } from 'react';
import { useUserRole } from '@core/auth/hooks/useUserRole';
import { 
  FEATURE_STATUS, 
  getFeatureStatus, 
  isFeatureComingSoon, 
  isFeatureBeta, 
  isFeatureAdminOnly,
  isFeatureStable,
  FeatureStatusConfig,
  FeatureStatusType 
} from '@core/config/featureStatus';

/** Roles that can access coming_soon and beta features for testing */
const ADMIN_ROLES = ['admin', 'tech_support', 'developer'];

interface UseFeatureStatusResult {
  /**
   * Check if the current user can access a feature
   * - Stable features: available to all
   * - Coming soon/beta with adminCanAccess: available to admin roles
   * - Coming soon/beta without adminCanAccess: not available
   * - Admin only: only available to admin role
   */
  isAvailable: (featureKey: string) => boolean;
  
  /**
   * Get the full status configuration for a feature
   */
  getStatus: (featureKey: string) => FeatureStatusConfig | undefined;
  
  /**
   * Check if feature is marked as coming soon
   */
  isComingSoon: (featureKey: string) => boolean;
  
  /**
   * Check if feature is marked as beta
   */
  isBeta: (featureKey: string) => boolean;
  
  /**
   * Check if feature is admin only
   */
  isAdminOnly: (featureKey: string) => boolean;
  
  /**
   * Check if feature is stable (available to all)
   */
  isStable: (featureKey: string) => boolean;
  
  /**
   * Check if current user is an admin who can test features
   */
  isAdminTester: boolean;
  
  /**
   * Get expected release date for a feature
   */
  getExpectedDate: (featureKey: string) => string | undefined;
  
  /**
   * Get feature description
   */
  getDescription: (featureKey: string) => string | undefined;
  
  /**
   * Get feature label
   */
  getLabel: (featureKey: string) => string | undefined;
  
  /**
   * Get all feature statuses
   */
  allFeatures: typeof FEATURE_STATUS;
}

/**
 * Hook for feature status checking with role-based access
 * 
 * @example
 * const { isAvailable, isComingSoon } = useFeatureStatus();
 * 
 * // Check if user can access billing
 * if (isAvailable('billing')) {
 *   // Show billing page
 * }
 * 
 * // Check if billing is coming soon
 * if (isComingSoon('billing')) {
 *   // Show coming soon badge
 * }
 */
export function useFeatureStatus(): UseFeatureStatusResult {
  const { data: userRole, isLoading } = useUserRole();
  
  const isAdminTester = useMemo(() => {
    if (isLoading || !userRole) return false;
    return ADMIN_ROLES.includes(userRole);
  }, [userRole, isLoading]);

  const isAvailable = useMemo(() => (featureKey: string): boolean => {
    const config = getFeatureStatus(featureKey);
    
    // If not registered, treat as stable (available to all)
    if (!config) return true;
    
    switch (config.status) {
      case 'stable':
        return true;
      
      case 'coming_soon':
      case 'beta':
        // Only available if adminCanAccess AND user is admin
        return config.adminCanAccess && isAdminTester;
      
      case 'admin_only':
        return isAdminTester;
      
      default:
        return true;
    }
  }, [isAdminTester]);

  return {
    isAvailable,
    getStatus: getFeatureStatus,
    isComingSoon: isFeatureComingSoon,
    isBeta: isFeatureBeta,
    isAdminOnly: isFeatureAdminOnly,
    isStable: isFeatureStable,
    isAdminTester,
    getExpectedDate: (featureKey: string) => getFeatureStatus(featureKey)?.expectedDate,
    getDescription: (featureKey: string) => getFeatureStatus(featureKey)?.description,
    getLabel: (featureKey: string) => getFeatureStatus(featureKey)?.label,
    allFeatures: FEATURE_STATUS,
  };
}

export default useFeatureStatus;
