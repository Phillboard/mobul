import * as React from "react";
import { cn } from '@/shared/utils/utils';

export interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(e.target.value !== "");
      props.onBlur?.(e);
    };

    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="relative">
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "peer flex h-12 w-full rounded-md border border-input bg-background px-3 pt-4 pb-1 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            className
          )}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={label}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-3 text-muted-foreground transition-all duration-200 pointer-events-none",
            isFocused || hasValue || props.value
              ? "top-1 text-xs text-primary font-medium"
              : "top-3.5 text-sm"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
