/**
 * SettingsCard Component
 * 
 * A card wrapper for grouping related settings with:
 * - Icon + Title + Description header
 * - Optional action buttons in header
 * - Consistent padding and border styling
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface SettingsCardProps {
  /** Card title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional icon to display before title */
  icon?: LucideIcon;
  /** Optional action buttons in header (top-right) */
  actions?: React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Additional class name for the card */
  className?: string;
  /** Additional class name for the content area */
  contentClassName?: string;
  /** Remove padding from content area (useful for tables) */
  noPadding?: boolean;
  /** Card variant */
  variant?: 'default' | 'glass' | 'elevated';
}

/**
 * Settings card component for grouping related settings
 * 
 * @example
 * // Basic usage
 * <SettingsCard title="Profile" description="Update your profile information">
 *   <Input />
 * </SettingsCard>
 * 
 * // With icon and actions
 * <SettingsCard 
 *   title="Security" 
 *   icon={Shield}
 *   actions={<Button>Save</Button>}
 * >
 *   <SecurityForm />
 * </SettingsCard>
 * 
 * // With no padding for tables
 * <SettingsCard title="Team Members" noPadding>
 *   <Table>...</Table>
 * </SettingsCard>
 */
export function SettingsCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
  variant = 'default',
}: SettingsCardProps) {
  return (
    <Card variant={variant} className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
        <div className="flex items-start gap-3 flex-1">
          {Icon && (
            <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </CardHeader>
      <CardContent 
        className={cn(
          noPadding ? 'p-0' : undefined,
          contentClassName
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export default SettingsCard;
