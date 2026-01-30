import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from '@/shared/utils/cn';

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary ring-primary/20 hover:bg-primary/20",
        success: "bg-success/10 text-success ring-success/20 hover:bg-success/20",
        warning: "bg-warning/10 text-warning ring-warning/20 hover:bg-warning/20",
        destructive: "bg-destructive/10 text-destructive ring-destructive/20 hover:bg-destructive/20",
        secondary: "bg-secondary/50 text-secondary-foreground ring-border hover:bg-secondary/70",
        outline: "text-foreground ring-border hover:bg-accent/50",
        neon: "bg-neon-cyan/10 text-neon-cyan ring-neon-cyan/30 shadow-glow-cyan",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
