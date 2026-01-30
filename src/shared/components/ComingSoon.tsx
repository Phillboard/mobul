/**
 * ComingSoon Component
 * 
 * Wrapper component that controls access to features based on their status.
 * - Regular users see: grayed out UI, "Coming Soon" badge, tooltip explaining the feature
 * - Admins see: subtle "Testing" badge, can click through to test
 * - Stable features render normally
 */

import * as React from 'react';
import { cn } from '@/shared/utils/cn';
import { useFeatureStatus } from '@/shared/hooks/useFeatureStatus';
import { ComingSoonBadge } from './ComingSoonBadge';
import { Clock, Lock } from 'lucide-react';

interface ComingSoonProps {
  /** Feature key to look up status in FEATURE_STATUS config */
  featureKey: string;
  /** Content to render */
  children: React.ReactNode;
  /** Optional custom message to show instead of default coming soon overlay */
  fallback?: React.ReactNode;
  /** Optional custom title for the overlay */
  title?: string;
  /** Whether to completely hide content for non-admins (vs graying out) */
  hideContent?: boolean;
  /** Additional class name for the wrapper */
  className?: string;
}

interface ComingSoonOverlayProps {
  featureKey: string;
  title?: string;
  description?: string;
  expectedDate?: string;
  fallback?: React.ReactNode;
}

/**
 * Default overlay shown when feature is coming soon
 */
function ComingSoonOverlay({ 
  featureKey, 
  title, 
  description, 
  expectedDate,
  fallback 
}: ComingSoonOverlayProps) {
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 rounded-lg">
      <div className="text-center p-6 max-w-md">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {title || 'Coming Soon'}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-3">
            {description}
          </p>
        )}
        {expectedDate && (
          <p className="text-xs text-muted-foreground">
            Expected: {expectedDate}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * ComingSoon wrapper component
 * 
 * Checks feature status and user role to determine what to render:
 * - Stable features: renders children normally
 * - Coming soon (non-admin): grayed out with overlay
 * - Coming soon (admin with access): subtle testing badge, full interaction
 * - Admin only (non-admin): shows locked state
 * 
 * @example
 * // Wrap billing settings
 * <ComingSoon featureKey="billing">
 *   <BillingSettings />
 * </ComingSoon>
 * 
 * // With custom fallback
 * <ComingSoon 
 *   featureKey="crm_integration" 
 *   fallback={<CRMComingSoonPlaceholder />}
 * >
 *   <CRMIntegrationTab />
 * </ComingSoon>
 */
export function ComingSoon({
  featureKey,
  children,
  fallback,
  title,
  hideContent = false,
  className,
}: ComingSoonProps) {
  const { 
    isAvailable, 
    isComingSoon, 
    isBeta,
    isAdminOnly,
    isAdminTester,
    getDescription,
    getExpectedDate,
    getLabel,
  } = useFeatureStatus();

  const available = isAvailable(featureKey);
  const comingSoon = isComingSoon(featureKey);
  const beta = isBeta(featureKey);
  const adminOnly = isAdminOnly(featureKey);
  const description = getDescription(featureKey);
  const expectedDate = getExpectedDate(featureKey);
  const label = getLabel(featureKey);

  // Stable feature or available to current user - render normally
  if (available && !comingSoon && !beta && !adminOnly) {
    return <>{children}</>;
  }

  // Admin can access - show with testing badge
  if (available && isAdminTester && (comingSoon || beta)) {
    return (
      <div className={cn('relative', className)}>
        {/* Testing badge in top-right corner */}
        <div className="absolute top-2 right-2 z-20">
          <ComingSoonBadge 
            variant="testing" 
            tooltip={`Testing: ${label || featureKey}. Not visible to regular users.`}
          />
        </div>
        {children}
      </div>
    );
  }

  // Feature is coming soon and user cannot access
  if (comingSoon && !available) {
    if (hideContent) {
      return (
        <div className={cn('relative', className)}>
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {title || label || 'Coming Soon'}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground mb-3">
                {description}
              </p>
            )}
            {expectedDate && (
              <p className="text-xs text-muted-foreground">
                Expected: {expectedDate}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn('relative', className)}>
        {/* Grayed out children */}
        <div className="opacity-40 pointer-events-none select-none filter grayscale">
          {children}
        </div>
        {/* Overlay */}
        <ComingSoonOverlay
          featureKey={featureKey}
          title={title || label}
          description={description}
          expectedDate={expectedDate}
          fallback={fallback}
        />
      </div>
    );
  }

  // Feature is admin only and user is not admin
  if (adminOnly && !available) {
    return (
      <div className={cn('relative', className)}>
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {title || 'Admin Access Required'}
          </h3>
          <p className="text-sm text-muted-foreground">
            This feature is only available to administrators.
          </p>
        </div>
      </div>
    );
  }

  // Beta feature - show with beta badge for admins
  if (beta && available && isAdminTester) {
    return (
      <div className={cn('relative', className)}>
        <div className="absolute top-2 right-2 z-20">
          <ComingSoonBadge 
            variant="beta" 
            tooltip={`Beta feature: ${label || featureKey}`}
          />
        </div>
        {children}
      </div>
    );
  }

  // Default: render children (fallback for unregistered features)
  return <>{children}</>;
}

export default ComingSoon;
