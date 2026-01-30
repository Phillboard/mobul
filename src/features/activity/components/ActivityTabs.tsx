/**
 * ActivityTabs Component
 * 
 * Tab navigation for different activity categories.
 */

import { 
  LayoutDashboard, Gift, Megaphone, Phone, Code, Users, Server, LucideIcon 
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';
import { ACTIVITY_TABS } from '../types/activity.types';
import { useUserRole } from '@core/auth/hooks/useUserRole';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Gift,
  Megaphone,
  Phone,
  Code,
  Users,
  Server,
};

interface ActivityTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts?: Record<string, number>;
}

export function ActivityTabs({ activeTab, onTabChange, counts }: ActivityTabsProps) {
  const { data: userRole } = useUserRole();
  const isAdmin = userRole === 'admin' || userRole === 'tech_support';

  // Filter tabs based on admin access
  const visibleTabs = ACTIVITY_TABS.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-1">
        {visibleTabs.map((tab) => {
          const Icon = ICON_MAP[tab.icon] || LayoutDashboard;
          const count = counts?.[tab.id];
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium',
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted/50 hover:bg-muted text-foreground',
                tab.adminOnly && 'border border-amber-500/30'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'ml-1 h-5 px-1.5 text-[10px]',
                    isActive && 'bg-primary-foreground/20 text-primary-foreground'
                  )}
                >
                  {count > 999 ? '999+' : count}
                </Badge>
              )}
              {tab.adminOnly && (
                <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 text-amber-500 border-amber-500/30">
                  Admin
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityTabs;
