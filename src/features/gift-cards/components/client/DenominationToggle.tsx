/**
 * DenominationToggle - Reusable toggle for enabling/disabling a denomination
 */

import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from '@shared/utils/cn';

interface DenominationToggleProps {
  denomination: number;
  isEnabled: boolean;
  onToggle: () => void;
  brandName: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function DenominationToggle({
  denomination,
  isEnabled,
  onToggle,
  brandName,
  size = "md",
  showLabel = true,
}: DenominationToggleProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isEnabled ? "default" : "outline"}
        className={cn(sizeClasses[size], "font-semibold")}
      >
        ${denomination}
      </Badge>
      {showLabel && (
        <div className="flex items-center gap-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            aria-label={`Toggle ${brandName} $${denomination} gift card`}
          />
          <span className="text-xs text-muted-foreground">
            {isEnabled ? "Active" : "Inactive"}
          </span>
        </div>
      )}
      {!showLabel && (
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${brandName} $${denomination} gift card`}
        />
      )}
    </div>
  );
}

