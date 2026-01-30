/**
 * ComingSoonBadge Component
 * 
 * Standalone badge component for use in navigation, cards, buttons.
 * Shows different variants based on feature status.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Clock, Sparkles, Zap, Lock, TestTube } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

const comingSoonBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-all',
  {
    variants: {
      variant: {
        /** Grayed out, with clock icon - for coming soon features */
        coming_soon: 'bg-muted text-muted-foreground border border-border',
        
        /** Purple/blue for beta/testing features (admin can access) */
        beta: 'bg-violet-500/10 text-violet-500 border border-violet-500/20',
        
        /** Green for recently launched features */
        new: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
        
        /** Yellow/amber for admin-only features */
        admin_only: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        
        /** Cyan/teal for testing mode (admin testing coming_soon) */
        testing: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
      },
      size: {
        sm: 'text-[9px] px-1.5 py-0.5',
        default: 'text-[10px] px-2 py-0.5',
        lg: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'coming_soon',
      size: 'default',
    },
  }
);

const variantIcons = {
  coming_soon: Clock,
  beta: Sparkles,
  new: Zap,
  admin_only: Lock,
  testing: TestTube,
} as const;

const variantLabels = {
  coming_soon: 'Coming Soon',
  beta: 'Beta',
  new: 'New',
  admin_only: 'Admin Only',
  testing: 'Testing',
} as const;

export interface ComingSoonBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof comingSoonBadgeVariants> {
  /** Custom label to override default variant label */
  label?: string;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Tooltip content for additional context */
  tooltip?: string;
  /** Expected date (for coming_soon variant) */
  expectedDate?: string;
}

/**
 * Badge for showing feature status
 * 
 * @example
 * // Basic coming soon badge
 * <ComingSoonBadge variant="coming_soon" />
 * 
 * // Beta badge with custom tooltip
 * <ComingSoonBadge variant="beta" tooltip="Available for admin testing" />
 * 
 * // Coming soon with expected date
 * <ComingSoonBadge variant="coming_soon" expectedDate="Q2 2026" />
 */
export function ComingSoonBadge({
  className,
  variant = 'coming_soon',
  size,
  label,
  showIcon = true,
  tooltip,
  expectedDate,
  ...props
}: ComingSoonBadgeProps) {
  const Icon = variantIcons[variant || 'coming_soon'];
  const displayLabel = label || variantLabels[variant || 'coming_soon'];
  
  // Build tooltip text
  const tooltipText = tooltip || (
    variant === 'coming_soon' && expectedDate 
      ? `Expected ${expectedDate}` 
      : undefined
  );

  const badge = (
    <span
      className={cn(comingSoonBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {displayLabel}
    </span>
  );

  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

export { comingSoonBadgeVariants };
export default ComingSoonBadge;
