import * as React from "react";

import { cn } from '@/shared/utils/utils';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-[var(--radius)] border border-border/50",
        "bg-card/50 backdrop-blur-sm px-3 py-2 text-sm",
        "ring-offset-background",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "focus-visible:border-primary/50 focus-visible:bg-card/80",
        "hover:border-border hover:bg-card/60",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-200",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
