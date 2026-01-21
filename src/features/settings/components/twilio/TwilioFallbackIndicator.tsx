/**
 * TwilioFallbackIndicator Component
 * 
 * Shows which Twilio configuration is currently active and the full fallback chain.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X, Phone } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import type { TwilioActiveConfig, TwilioFallbackChainItem, TwilioLevel } from '../../types/twilio';

interface TwilioFallbackIndicatorProps {
  activeConfig: TwilioActiveConfig | null | undefined;
  fallbackChain: TwilioFallbackChainItem[];
  expanded?: boolean;
  className?: string;
  /** When true, shows red error state. When false, shows neutral info state. Default: false */
  showAsError?: boolean;
}

const levelLabels: Record<TwilioLevel, string> = {
  client: 'Client',
  agency: 'Agency',
  admin: 'Platform',
  env: 'Legacy (Env)',
};

export function TwilioFallbackIndicator({ 
  activeConfig, 
  fallbackChain, 
  expanded: initialExpanded = false,
  className,
  showAsError = false,
}: TwilioFallbackIndicatorProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  if (!activeConfig) {
    // Show neutral/informational state when not configured (default)
    // Only show as error when explicitly requested
    if (showAsError) {
      return (
        <div className={cn('p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800', className)}>
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <X className="h-4 w-4" />
            <span className="font-medium">Twilio configuration error</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            SMS sending is currently unavailable due to a configuration error.
          </p>
        </div>
      );
    }
    
    // Default: neutral informational state
    return (
      <div className={cn('p-3 bg-muted/50 rounded-lg border', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span className="font-medium">Twilio not configured</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a Twilio account to enable SMS sending for your campaigns.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Active configuration */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Currently using:</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 px-2"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-medium">{activeConfig.entityName}</span>
          <span className="text-sm text-muted-foreground">
            ({activeConfig.phoneNumber})
          </span>
        </div>
        {activeConfig.reason !== 'Own config' && (
          <p className="text-xs text-muted-foreground mt-1">
            {activeConfig.reason}
          </p>
        )}
      </div>

      {/* Expandable fallback chain */}
      {expanded && (
        <div className="border-t px-3 py-2 bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Fallback Chain</p>
          <div className="space-y-2">
            {fallbackChain.map((item, index) => (
              <div key={item.level} className="flex items-center gap-2">
                <div className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  item.available 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                )}>
                  {item.available ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm',
                      item.available ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {index + 1}. {levelLabels[item.level]}: {item.name}
                    </span>
                    {activeConfig.level === item.level && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  {!item.available && (
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
