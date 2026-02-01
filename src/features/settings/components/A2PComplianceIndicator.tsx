/**
 * A2P Compliance Indicator Component
 * 
 * Shows real-time A2P compliance status for SMS templates.
 * Displays required and recommended checks with visual indicators.
 */

import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { Badge } from '@/shared/components/ui/badge';
import type { A2PValidationResult, A2PCheckResult } from '@/shared/utils/a2pValidation';

interface A2PComplianceIndicatorProps {
  validation: A2PValidationResult;
  compact?: boolean;
  className?: string;
}

export function A2PComplianceIndicator({
  validation,
  compact = false,
  className,
}: A2PComplianceIndicatorProps) {
  const { isValid, errors, warnings, checks } = validation;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isValid ? 'default' : 'destructive'}
            className={cn('cursor-help', className)}
          >
            {isValid ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                A2P Compliant
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Compliant
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            {errors.length > 0 && (
              <div className="text-destructive">
                <p className="font-medium">Required:</p>
                <ul className="list-disc pl-4 text-xs">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="text-amber-500">
                <p className="font-medium">Recommended:</p>
                <ul className="list-disc pl-4 text-xs">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {isValid && errors.length === 0 && warnings.length === 0 && (
              <p className="text-green-500">All compliance checks passed</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Overall Status */}
      <div className="flex items-center gap-2">
        {isValid ? (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            A2P Compliant
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Not Compliant
          </Badge>
        )}
        {warnings.length > 0 && isValid && (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Individual Checks */}
      <div className="flex flex-wrap gap-2">
        {checks.map((check, index) => (
          <CheckBadge key={index} check={check} />
        ))}
      </div>
    </div>
  );
}

function CheckBadge({ check }: { check: A2PCheckResult }) {
  const Icon = check.passed
    ? CheckCircle2
    : check.required
    ? XCircle
    : AlertTriangle;

  const colorClass = check.passed
    ? 'text-green-600'
    : check.required
    ? 'text-destructive'
    : 'text-amber-500';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-md border cursor-help',
            check.passed
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
              : check.required
              ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              : 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
          )}
        >
          <Icon className={cn('h-3 w-3', colorClass)} />
          <span className={colorClass}>{check.name}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{check.message}</p>
        {check.required && !check.passed && (
          <p className="text-xs text-destructive mt-1">
            Required for compliance
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline compliance indicator for use in text areas
 */
interface InlineComplianceProps {
  validation: A2PValidationResult;
  charCount: number;
  charLimit: number;
  segments?: number;
  /** Estimated character count after Twilio URL shortening */
  estimatedCharCount?: number;
  /** Number of URLs that will be shortened */
  urlCount?: number;
}

export function InlineComplianceStatus({
  validation,
  charCount,
  charLimit,
  segments = 1,
  estimatedCharCount,
  urlCount = 0,
}: InlineComplianceProps) {
  // Use estimated count (after URL shortening) for limit checking
  const effectiveCount = estimatedCharCount ?? charCount;
  const isOverLimit = effectiveCount > charLimit;
  const isNearLimit = effectiveCount > charLimit * 0.9;
  const hasUrlShortening = urlCount > 0 && estimatedCharCount !== undefined && estimatedCharCount < charCount;

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        {/* Character Count */}
        <span className={cn(
          isOverLimit ? 'text-destructive' :
          isNearLimit ? 'text-amber-500' : ''
        )}>
          {hasUrlShortening ? (
            <>
              <span className="line-through opacity-50">{charCount}</span>
              {' ~'}{estimatedCharCount}/{charLimit} chars
            </>
          ) : (
            <>{charCount}/{charLimit} chars</>
          )}
          {segments > 1 && (
            <span className="text-amber-500 ml-1">
              ({segments} SMS)
            </span>
          )}
          {hasUrlShortening && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-blue-500 ml-1 cursor-help">
                  (link shortened)
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Twilio automatically shortens URLs to ~35 characters.
                  <br />
                  Estimated length accounts for {urlCount} URL{urlCount > 1 ? 's' : ''}.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </span>

        {/* Compliance Status */}
        {validation.isValid ? (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Compliant
          </span>
        ) : (
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="h-3 w-3" />
            {validation.errors.length} issue{validation.errors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Quick Checks */}
      <div className="flex items-center gap-1">
        {validation.checks.filter(c => c.required).map((check, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                {check.passed ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{check.name}: {check.message}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

export default A2PComplianceIndicator;
