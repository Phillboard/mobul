/**
 * SettingsEmptyState Component
 * 
 * For when a settings section has no data:
 * - Large muted icon
 * - Title and description text
 * - Optional action button
 * - Centered layout with proper spacing
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/shared/components/ui/button';

interface SettingsEmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface SettingsEmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button */
  action?: SettingsEmptyStateAction;
  /** Additional class name */
  className?: string;
  /** Icon size */
  iconSize?: 'sm' | 'md' | 'lg';
}

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

const containerSizes = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

/**
 * Empty state component for settings sections
 * 
 * @example
 * // Basic usage
 * <SettingsEmptyState
 *   icon={Users}
 *   title="No team members"
 *   description="Invite team members to collaborate on campaigns"
 * />
 * 
 * // With action button
 * <SettingsEmptyState
 *   icon={Key}
 *   title="No API keys"
 *   description="Create an API key to access the platform programmatically"
 *   action={{
 *     label: "Create API Key",
 *     onClick: () => setDialogOpen(true)
 *   }}
 * />
 */
export function SettingsEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconSize = 'md',
}: SettingsEmptyStateProps) {
  const renderButton = () => {
    if (!action) return null;

    const buttonProps = {
      children: action.label,
    };

    if (action.href) {
      return (
        <Button asChild>
          <a href={action.href}>{action.label}</a>
        </Button>
      );
    }

    return (
      <Button onClick={action.onClick}>
        {action.label}
      </Button>
    );
  };

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div 
        className={cn(
          'flex items-center justify-center rounded-full bg-muted mb-4',
          containerSizes[iconSize]
        )}
      >
        <Icon 
          className={cn(
            'text-muted-foreground',
            iconSizes[iconSize]
          )} 
        />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {renderButton()}
    </div>
  );
}

export default SettingsEmptyState;
