import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from '@/shared/utils/cn';

const cardVariants = cva(
  "rounded-[var(--radius-lg)] border transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card/95 backdrop-blur-xl border-border/50 shadow-sm hover:shadow-md",
        glass: "bg-card/40 backdrop-blur-2xl border-border/30 shadow-glow-sm hover:shadow-glow-md",
        elevated: "bg-card shadow-lg hover:shadow-xl border-border/50 hover:translate-y-[-2px]",
        neon: "bg-card/95 backdrop-blur-xl border-primary/30 shadow-glow-cyan hover:border-primary/60",
        mesh: "bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-xl border-border/30",
      },
      hover: {
        none: "",
        lift: "hover:translate-y-[-2px]",
        glow: "hover:shadow-glow-md",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, hover }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
