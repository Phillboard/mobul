/**
 * OptInStatusIndicator
 * 
 * Visual indicator showing real-time SMS opt-in status.
 * Used in call center dashboard.
 * 
 * Status colors:
 * - not_sent: Gray
 * - pending: Yellow/Amber (pulsing animation)
 * - opted_in: Green (with checkmark)
 * - opted_out: Red (with X)
 * - invalid_response: Orange (with warning)
 */

import { cn } from "@/lib/utils";
import { Check, X, AlertTriangle, Clock, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OptInStatus } from "@/hooks/useOptInStatus";

interface StatusConfig {
  icon: typeof Check;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  animate?: boolean;
}

const statusConfig: Record<OptInStatus, StatusConfig> = {
  not_sent: {
    icon: Circle,
    label: "No SMS Sent",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    description: "Enter cell phone to send opt-in",
  },
  pending: {
    icon: Clock,
    label: "Waiting for Response",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    description: "SMS sent - waiting for customer to reply...",
    animate: true,
  },
  opted_in: {
    icon: Check,
    label: "Opted In ✓",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    description: "Customer confirmed - you can now proceed!",
  },
  opted_out: {
    icon: X,
    label: "Opted Out",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    description: "Customer declined - cannot send gift card",
  },
  invalid_response: {
    icon: AlertTriangle,
    label: "Invalid Response",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    description: "Ask customer to reply YES to opt in",
  },
};

interface OptInStatusIndicatorProps {
  status: OptInStatus;
  response?: string | null;
  sentAt?: string | null;
  responseAt?: string | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

export function OptInStatusIndicator({ 
  status, 
  response, 
  sentAt,
  responseAt,
  onRefresh,
  isLoading,
  className,
  compact = false,
}: OptInStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        config.bgColor,
        config.color,
        config.animate && "animate-pulse",
        className
      )}>
        <Icon className="h-4 w-4" />
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-lg border-2",
      config.bgColor,
      config.borderColor,
      config.animate && "animate-pulse",
      className
    )}>
      <div className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full",
        config.bgColor,
        "border-2",
        config.borderColor,
      )}>
        <Icon className={cn("h-6 w-6", config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-lg", config.color)}>
          {config.label}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {config.description}
        </div>
        
        {/* Show invalid response text */}
        {status === 'invalid_response' && response && (
          <div className="mt-2 p-2 bg-orange-100 rounded text-sm">
            <span className="text-orange-700">Customer replied: </span>
            <span className="font-mono font-medium">"{response}"</span>
          </div>
        )}

        {/* Show timestamps */}
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {sentAt && (
            <div>SMS sent: {new Date(sentAt).toLocaleTimeString()}</div>
          )}
          {responseAt && (
            <div>Response received: {new Date(responseAt).toLocaleTimeString()}</div>
          )}
        </div>
      </div>

      {/* Refresh button for pending status */}
      {status === 'pending' && onRefresh && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRefresh}
          disabled={isLoading}
          className="flex-shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}

/**
 * OptInStatusBadge - Compact inline badge version
 */
export function OptInStatusBadge({ 
  status,
  className,
}: { 
  status: OptInStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
      config.bgColor,
      config.color,
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

