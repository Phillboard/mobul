/**
 * ActivityEmptyState Component
 * 
 * Enhanced empty state with category-specific illustrations and messages.
 */

import { LucideIcon, Activity, Gift, Megaphone, Phone, Code, Users, Server, Search, Filter } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/cn';
import { ActivityCategory } from '../types/activity.types';

interface ActivityEmptyStateProps {
  category?: ActivityCategory | 'all' | 'search';
  hasFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const CATEGORY_CONFIGS: Record<string, EmptyStateConfig> = {
  all: {
    icon: Activity,
    title: 'No activity yet',
    description: 'Platform activity will appear here as users interact with the system.',
    color: 'text-primary',
  },
  gift_card: {
    icon: Gift,
    title: 'No gift card activity',
    description: 'Gift card provisioning, SMS deliveries, and redemptions will appear here.',
    color: 'text-purple-500',
  },
  campaign: {
    icon: Megaphone,
    title: 'No campaign activity',
    description: 'Campaign creation, mail sends, and tracking events will appear here.',
    color: 'text-blue-500',
  },
  communication: {
    icon: Phone,
    title: 'No communication activity',
    description: 'Phone calls, SMS messages, and opt-in/out events will appear here.',
    color: 'text-green-500',
  },
  api: {
    icon: Code,
    title: 'No API activity',
    description: 'API requests, webhook deliveries, and integration events will appear here.',
    color: 'text-orange-500',
  },
  user: {
    icon: Users,
    title: 'No user activity',
    description: 'Login attempts, permission changes, and user management events will appear here.',
    color: 'text-pink-500',
  },
  system: {
    icon: Server,
    title: 'No system activity',
    description: 'Error logs, background jobs, and system events will appear here.',
    color: 'text-gray-500',
  },
  search: {
    icon: Search,
    title: 'No matching results',
    description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    color: 'text-muted-foreground',
  },
};

export function ActivityEmptyState({
  category = 'all',
  hasFilters = false,
  onClearFilters,
  className,
}: ActivityEmptyStateProps) {
  const config = hasFilters ? CATEGORY_CONFIGS.search : (CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.all);
  const Icon = config.icon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      {/* Animated icon container */}
      <div className="relative mb-6">
        {/* Background glow */}
        <div className={cn(
          'absolute inset-0 rounded-full blur-xl opacity-20',
          config.color.replace('text-', 'bg-')
        )} />
        
        {/* Icon circle */}
        <div className={cn(
          'relative flex items-center justify-center w-20 h-20 rounded-full',
          'bg-muted border-2 border-dashed border-muted-foreground/20'
        )}>
          <Icon className={cn('h-10 w-10', config.color)} />
        </div>
        
        {/* Filter indicator */}
        {hasFilters && (
          <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-background border shadow-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-2 text-center">
        {config.title}
      </h3>
      
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        {config.description}
      </p>

      {hasFilters && onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

export default ActivityEmptyState;
