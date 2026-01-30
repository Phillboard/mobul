/**
 * SettingsSection Component
 * 
 * For grouping multiple cards under a heading within a page:
 * - Section title (smaller than page title)
 * - Optional description
 * - Children wrapper with spacing
 */

import * as React from 'react';
import { cn } from '@/shared/utils/cn';

interface SettingsSectionProps {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Section content (typically SettingsCard components) */
  children: React.ReactNode;
  /** Additional class name for the section */
  className?: string;
  /** Whether to add a border-top separator */
  separator?: boolean;
}

/**
 * Section wrapper for grouping related settings cards
 * 
 * @example
 * <SettingsPageLayout title="Integrations">
 *   <SettingsSection title="Connected Services">
 *     <SettingsCard title="Zapier">...</SettingsCard>
 *     <SettingsCard title="CRM">...</SettingsCard>
 *   </SettingsSection>
 *   
 *   <SettingsSection title="API Access" separator>
 *     <SettingsCard title="API Keys">...</SettingsCard>
 *   </SettingsSection>
 * </SettingsPageLayout>
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
  separator = false,
}: SettingsSectionProps) {
  return (
    <section 
      className={cn(
        'space-y-4',
        separator && 'pt-6 border-t border-border',
        className
      )}
    >
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}

export default SettingsSection;
