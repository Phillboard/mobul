/**
 * CampaignStatusBadge Component
 * 
 * Consistent, color-coded status badges for campaigns.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from '@shared/utils/cn';
import {
  Clock,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Loader2,
  Calendar,
} from "lucide-react";

type CampaignStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'pending_approval'
  | 'in_progress' 
  | 'mailing'
  | 'active' 
  | 'completed' 
  | 'paused' 
  | 'cancelled';

interface CampaignStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<CampaignStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}> = {
  draft: {
    label: 'Draft',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    icon: FileText,
  },
  scheduled: {
    label: 'Scheduled',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: Calendar,
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    icon: Loader2,
  },
  mailing: {
    label: 'Mailing',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
    icon: Send,
  },
  active: {
    label: 'Active',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: Play,
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
  },
  paused: {
    label: 'Paused',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    icon: Pause,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: XCircle,
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-3 py-1.5',
};

const ICON_SIZES = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function CampaignStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: CampaignStatusBadgeProps) {
  const normalizedStatus = (status?.toLowerCase().replace(/\s+/g, '_') || 'draft') as CampaignStatus;
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        config.color,
        config.bgColor,
        SIZE_CLASSES[size],
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(ICON_SIZES[size], 'mr-1', normalizedStatus === 'in_progress' && 'animate-spin')} />
      )}
      {config.label}
    </Badge>
  );
}

/**
 * Get status progress percentage for progress bars
 */
export function getStatusProgress(status: string): number {
  const progressMap: Record<string, number> = {
    draft: 10,
    scheduled: 25,
    pending_approval: 30,
    in_progress: 50,
    mailing: 60,
    active: 80,
    completed: 100,
    paused: 50,
    cancelled: 0,
  };

  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') || 'draft';
  return progressMap[normalizedStatus] || 0;
}

/**
 * Get next logical status options
 */
export function getNextStatusOptions(currentStatus: string): CampaignStatus[] {
  const transitions: Record<string, CampaignStatus[]> = {
    draft: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled', 'draft'],
    pending_approval: ['scheduled', 'draft', 'cancelled'],
    in_progress: ['mailing', 'paused', 'cancelled'],
    mailing: ['active', 'paused'],
    active: ['completed', 'paused'],
    paused: ['active', 'cancelled'],
    completed: [],
    cancelled: ['draft'],
  };

  const normalized = currentStatus?.toLowerCase().replace(/\s+/g, '_') || 'draft';
  return transitions[normalized] || [];
}

