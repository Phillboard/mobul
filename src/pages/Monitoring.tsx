/**
 * Monitoring Page
 * 
 * Unified monitoring hub that consolidates all logging, activity tracking,
 * and system health into a single permission-aware interface.
 * 
 * Features:
 * - Role-specific dashboards (Admin, Agency, Client)
 * - Real-time activity feeds
 * - Alert management
 * - System health monitoring (admin)
 * - Export capabilities
 */

import { useState, useCallback, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/shared/components/layout/Layout';
import { Activity, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@core/auth/AuthProvider';
import { useTenant } from '@/contexts/TenantContext';
import { P } from '@/core/auth/permissionRegistry';

// Import monitoring components
import { MonitoringTabs, OverviewTab, AlertsTab } from '@/features/monitoring/components';

// Lazy load existing tabs from activity feature
const ActivityTab = lazy(() => import('@/features/activity/components/tabs/GiftCardActivityTab').then(m => ({ default: m.GiftCardActivityTab })));

// ============================================================================
// Main Component
// ============================================================================

export default function Monitoring() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const { hasPermission, roles } = useAuth();
  const { currentOrg } = useTenant();
  
  const isAdmin = roles.some(r => r.role === 'admin' || r.role === 'tech_support');

  // Handle tab changes
  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  // Get page title based on role
  const getPageTitle = () => {
    if (isAdmin) return 'Platform Monitoring';
    if (currentOrg?.type === 'agency') return 'Agency Monitoring';
    return 'Activity & Logs';
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab onNavigateToTab={handleTabChange} />;
      
      case 'activity':
        // Use existing activity components with the unified filters
        return (
          <Suspense fallback={<TabLoading />}>
            <ActivityTabWrapper />
          </Suspense>
        );
      
      case 'alerts':
        return <AlertsTab />;
      
      case 'system':
      case 'performance':
      case 'errors':
      case 'provisioning':
        // For admin tabs, redirect to existing SystemHealth functionality
        if (!isAdmin) return null;
        return (
          <Suspense fallback={<TabLoading />}>
            <SystemTabPlaceholder tab={activeTab} />
          </Suspense>
        );
      
      case 'redemptions':
        if (!isAdmin) return null;
        return (
          <Suspense fallback={<TabLoading />}>
            <RedemptionsTabPlaceholder />
          </Suspense>
        );
      
      default:
        return <OverviewTab onNavigateToTab={handleTabChange} />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {getPageTitle()}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? 'Monitor system health, activity, and performance across the platform'
                : 'Track activity and monitor your operations'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {hasPermission(P.MONITORING_EXPORT) && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <MonitoringTabs 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </Layout>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading...</span>
    </div>
  );
}

// Placeholder for activity tab - will use existing activity components
function ActivityTabWrapper() {
  // This will eventually wrap the existing activity feature components
  // For now, show a message
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Activity className="h-12 w-12 mx-auto mb-4" />
      <h3 className="text-lg font-medium">Activity Logs</h3>
      <p className="text-sm">
        This tab will display the unified activity log interface.
      </p>
      <p className="text-xs mt-2">
        The existing Activity feature components will be integrated here.
      </p>
    </div>
  );
}

// Placeholder for system tabs - will reuse SystemHealth content
function SystemTabPlaceholder({ tab }: { tab: string }) {
  const tabLabels: Record<string, string> = {
    system: 'System Events',
    performance: 'Performance Metrics',
    errors: 'Error Logs',
    provisioning: 'Gift Card Provisioning',
  };

  return (
    <div className="text-center py-12 text-muted-foreground">
      <Activity className="h-12 w-12 mx-auto mb-4" />
      <h3 className="text-lg font-medium">{tabLabels[tab] || 'System'}</h3>
      <p className="text-sm">
        This tab will display {tabLabels[tab]?.toLowerCase() || 'system information'}.
      </p>
      <p className="text-xs mt-2">
        Content will be migrated from the existing SystemHealth page.
      </p>
    </div>
  );
}

// Placeholder for redemptions tab
function RedemptionsTabPlaceholder() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Activity className="h-12 w-12 mx-auto mb-4" />
      <h3 className="text-lg font-medium">Redemption Workflow Logs</h3>
      <p className="text-sm">
        This tab will display call center redemption workflow traces.
      </p>
      <p className="text-xs mt-2">
        Content will be migrated from the existing RedemptionLogs page.
      </p>
    </div>
  );
}
