/**
 * Monitoring Tabs Component
 * 
 * Permission-aware tab navigation for the unified monitoring hub.
 * Only shows tabs the user has permission to access.
 */

import { useEffect, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Bell, 
  ClipboardList, 
  CreditCard, 
  Gauge, 
  LayoutDashboard,
  Server,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { useAuth } from '@core/auth/AuthProvider';
import { P } from '@/core/auth/permissionRegistry';
import { useAlertCount, useErrorStats } from '../hooks';

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: string;
  label: string;
  permission: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: 'alertCount' | 'unresolvedErrors';
}

const MONITORING_TABS: TabConfig[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    permission: P.MONITORING_VIEW, 
    icon: LayoutDashboard,
  },
  { 
    id: 'activity', 
    label: 'Activity', 
    permission: P.MONITORING_VIEW, 
    icon: Activity,
  },
  { 
    id: 'alerts', 
    label: 'Alerts', 
    permission: P.MONITORING_ALERTS, 
    icon: Bell,
    badge: 'alertCount',
  },
  { 
    id: 'system', 
    label: 'System', 
    permission: P.MONITORING_SYSTEM, 
    icon: Server,
    adminOnly: true,
  },
  { 
    id: 'performance', 
    label: 'Performance', 
    permission: P.MONITORING_SYSTEM, 
    icon: Gauge,
    adminOnly: true,
  },
  { 
    id: 'errors', 
    label: 'Errors', 
    permission: P.MONITORING_ERRORS, 
    icon: AlertTriangle,
    adminOnly: true,
    badge: 'unresolvedErrors',
  },
  { 
    id: 'provisioning', 
    label: 'Provisioning', 
    permission: P.MONITORING_SYSTEM, 
    icon: CreditCard,
    adminOnly: true,
  },
  { 
    id: 'redemptions', 
    label: 'Redemptions', 
    permission: P.MONITORING_AUDIT, 
    icon: ClipboardList,
    adminOnly: true,
  },
];

// ============================================================================
// Component
// ============================================================================

interface MonitoringTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MonitoringTabs({ activeTab, onTabChange }: MonitoringTabsProps) {
  const { hasPermission, roles } = useAuth();
  const alertCount = useAlertCount();
  const { data: errorStats } = useErrorStats();
  
  const isAdmin = roles.some(r => r.role === 'admin' || r.role === 'tech_support');

  // Filter tabs based on permissions
  const visibleTabs = useMemo(() => {
    return MONITORING_TABS.filter(tab => {
      // Check permission
      if (!hasPermission(tab.permission)) return false;
      // Check admin-only restriction
      if (tab.adminOnly && !isAdmin) return false;
      return true;
    });
  }, [hasPermission, isAdmin]);

  // Redirect to first visible tab if current tab is not accessible
  useEffect(() => {
    const currentTabConfig = MONITORING_TABS.find(t => t.id === activeTab);
    const isCurrentTabVisible = visibleTabs.some(t => t.id === activeTab);
    
    if (!isCurrentTabVisible && visibleTabs.length > 0) {
      onTabChange(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs, onTabChange]);

  // Get badge value for a tab
  const getBadgeValue = (tab: TabConfig): number | null => {
    if (!tab.badge) return null;
    
    if (tab.badge === 'alertCount') {
      return alertCount.unacknowledged > 0 ? alertCount.unacknowledged : null;
    }
    
    if (tab.badge === 'unresolvedErrors') {
      return errorStats?.unresolved || null;
    }
    
    return null;
  };

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="flex flex-wrap h-auto gap-1 p-1">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const badgeValue = getBadgeValue(tab);
          
          return (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 px-3 py-2"
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {badgeValue !== null && (
                <Badge 
                  variant={tab.badge === 'unresolvedErrors' ? 'destructive' : 'secondary'}
                  className="ml-1 h-5 px-1.5 text-xs"
                >
                  {badgeValue}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

// Export tab IDs for use elsewhere
export const MONITORING_TAB_IDS = MONITORING_TABS.map(t => t.id);
export type MonitoringTabId = typeof MONITORING_TAB_IDS[number];
