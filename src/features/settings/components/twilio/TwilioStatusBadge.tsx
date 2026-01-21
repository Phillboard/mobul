/**
 * TwilioStatusBadge Component
 * 
 * Displays the current Twilio configuration status as a colored badge.
 */

import { Badge } from '@/shared/components/ui/badge';
import { CheckCircle2, AlertTriangle, ArrowDown, XCircle } from 'lucide-react';
import type { TwilioStatusType } from '../../types/twilio';
import { cn } from '@/shared/utils/cn';

interface TwilioStatusBadgeProps {
  status: TwilioStatusType;
  fallbackName?: string;
  className?: string;
}

const statusConfig: Record<TwilioStatusType, {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  label: string;
  className: string;
}> = {
  own_active: {
    variant: 'default',
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Own Twilio Active',
    className: 'bg-green-500 hover:bg-green-600 text-white',
  },
  own_stale: {
    variant: 'secondary',
    icon: <AlertTriangle className="h-3 w-3" />,
    label: 'Validation Needed',
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  },
  fallback_agency: {
    variant: 'secondary',
    icon: <ArrowDown className="h-3 w-3" />,
    label: 'Using Agency Twilio',
    className: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  fallback_admin: {
    variant: 'secondary',
    icon: <ArrowDown className="h-3 w-3" />,
    label: 'Using Platform Twilio',
    className: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  fallback_error: {
    variant: 'secondary',
    icon: <AlertTriangle className="h-3 w-3" />,
    label: 'Fallback Active',
    className: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  unavailable: {
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
    label: 'SMS Unavailable',
    className: 'bg-red-500 hover:bg-red-600 text-white',
  },
};

export function TwilioStatusBadge({ status, fallbackName, className }: TwilioStatusBadgeProps) {
  const config = statusConfig[status];
  
  // Customize label for fallback with name
  let label = config.label;
  if ((status === 'fallback_agency' || status === 'fallback_admin') && fallbackName) {
    label = `Using ${fallbackName}`;
  }
  
  return (
    <Badge 
      variant={config.variant}
      className={cn('flex items-center gap-1', config.className, className)}
    >
      {config.icon}
      <span>{label}</span>
    </Badge>
  );
}
