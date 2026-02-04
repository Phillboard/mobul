/**
 * OptInStatusIndicator
 *
 * Large, prominent visual indicator showing real-time SMS opt-in status.
 * Used in call center dashboard.
 *
 * Status colors:
 * - not_sent: Gray
 * - pending: Yellow/Amber (pulsing animation + ring)
 * - opted_in: Green (with checkmark)
 * - opted_out: Red (with X + recovery script)
 * - invalid_response: Orange (with warning + recovery script)
 */

import { useState } from 'react';
import { cn } from '@shared/utils/cn';
import { Check, X, AlertTriangle, Clock, Circle, RefreshCw, Copy, Send } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useToast } from '@shared/hooks';
import type { OptInStatus } from '@/features/settings/hooks';

interface StatusConfig {
  icon: typeof Check;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor?: string;
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
    description: "Enter cell phone number above to send opt-in SMS",
  },
  pending: {
    icon: Clock,
    label: "Waiting for Response",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    ringColor: "ring-yellow-400",
    description: "SMS sent - waiting for customer to reply YES...",
    animate: true,
  },
  opted_in: {
    icon: Check,
    label: "Customer Opted In",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    description: "Customer confirmed - you can now proceed!",
  },
  opted_out: {
    icon: X,
    label: "Customer Opted Out",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    description: "Customer declined marketing messages",
  },
  invalid_response: {
    icon: AlertTriangle,
    label: "Invalid Response",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    description: "Customer replied but did not opt in",
  },
};

// Recovery scripts for agents to read to customers
const RECOVERY_SCRIPTS: Partial<Record<OptInStatus, string>> = {
  opted_out:
    "I understand you opted out of messages. That's completely fine. If you change your mind about receiving your gift card via text, you can reply YES to the last message we sent you.",
  invalid_response:
    "I see you replied to our text. To receive your gift card via SMS, just reply YES to that message. Would you like me to resend it so you can reply?",
};

// Special script when response is specifically "NO"
const NO_RECOVERY_SCRIPT =
  "I see you replied NO. That just means you won't receive the text right now - it doesn't affect your eligibility. If you'd like your gift card sent via text, just reply YES to the message. Would you like me to resend it?";

interface OptInStatusIndicatorProps {
  status: OptInStatus;
  response?: string | null;
  sentAt?: string | null;
  responseAt?: string | null;
  onRefresh?: () => void;
  onResend?: () => void;
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
  onResend,
  isLoading,
  className,
  compact = false,
}: OptInStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const { toast } = useToast();

  // Determine recovery script based on status and response
  const isNoResponse = response?.toUpperCase().trim() === 'NO';
  const recoveryScript = isNoResponse
    ? NO_RECOVERY_SCRIPT
    : RECOVERY_SCRIPTS[status];

  const copyScript = () => {
    if (recoveryScript) {
      navigator.clipboard.writeText(recoveryScript);
      toast({ title: "Copied!", description: "Recovery script copied to clipboard" });
    }
  };

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
      "flex items-start gap-4 p-6 rounded-lg border-2",
      config.bgColor,
      config.borderColor,
      config.animate && "ring-2 ring-offset-2 animate-pulse",
      config.animate && config.ringColor,
      className
    )}>
      <div className={cn(
        "flex items-center justify-center w-16 h-16 rounded-full shrink-0",
        config.bgColor,
        "border-2",
        config.borderColor,
      )}>
        <Icon className={cn("h-8 w-8", config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn("font-bold text-2xl", config.color)}>
          {config.label}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {config.description}
        </div>

        {/* Show customer response text for invalid_response or opted_out */}
        {(status === 'invalid_response' || status === 'opted_out') && response && (
          <div className={cn(
            "mt-3 p-3 rounded-md text-sm",
            status === 'invalid_response' ? "bg-orange-100" : "bg-red-100"
          )}>
            <span className={status === 'invalid_response' ? "text-orange-700" : "text-red-700"}>
              Customer replied:{' '}
            </span>
            <span className="font-mono font-semibold">"{response}"</span>
          </div>
        )}

        {/* Recovery script for agent */}
        {recoveryScript && (status === 'opted_out' || status === 'invalid_response') && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Recovery Script
              </span>
              <Button variant="ghost" size="sm" onClick={copyScript} className="h-6 px-2 text-blue-600 hover:text-blue-800">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-sm text-blue-800 italic leading-relaxed">
              "{recoveryScript}"
            </p>
          </div>
        )}

        {/* Show timestamps */}
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {sentAt && (
            <div>SMS sent: {new Date(sentAt).toLocaleTimeString()}</div>
          )}
          {responseAt && (
            <div>Response received: {new Date(responseAt).toLocaleTimeString()}</div>
          )}
        </div>

        {/* Resend button inside pending card */}
        {status === 'pending' && onResend && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onResend}
              disabled={isLoading}
              className="border-yellow-400 bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Resend Opt-In SMS
            </Button>
          </div>
        )}
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
