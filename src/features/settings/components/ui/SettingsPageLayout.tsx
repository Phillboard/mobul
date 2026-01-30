/**
 * SettingsPageLayout Component
 * 
 * Provides consistent layout for all settings pages:
 * - Consistent max-width for readability
 * - Responsive padding
 * - Header area with title, description, optional action buttons
 * - Content area with consistent spacing
 * - Subtle fade-in animation
 */

import * as React from 'react';
import { cn } from '@/shared/utils/cn';

interface SettingsPageLayoutProps {
  /** Page title (required) */
  title: string;
  /** Optional description shown below title */
  description?: string;
  /** Optional action buttons for top-right area */
  actions?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Additional class name for the container */
  className?: string;
  /** Whether to show the header section */
  showHeader?: boolean;
}

/**
 * Layout wrapper for settings pages
 * 
 * @example
 * <SettingsPageLayout
 *   title="Account Settings"
 *   description="Manage your profile and preferences"
 *   actions={<Button>Save Changes</Button>}
 * >
 *   <SettingsCard>...</SettingsCard>
 *   <SettingsCard>...</SettingsCard>
 * </SettingsPageLayout>
 */
export function SettingsPageLayout({
  title,
  description,
  actions,
  children,
  className,
  showHeader = true,
}: SettingsPageLayoutProps) {
  return (
    <div 
      className={cn(
        'w-full max-w-5xl mx-auto',
        'px-4 py-6 md:px-6 lg:px-8',
        'animate-fade-in',
        className
      )}
    >
      {showHeader && (
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-muted-foreground md:text-base">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 shrink-0">
                {actions}
              </div>
            )}
          </div>
        </header>
      )}
      
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

export default SettingsPageLayout;
