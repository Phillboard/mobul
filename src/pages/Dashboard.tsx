import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { PlatformDashboard } from './PlatformDashboard';
import { Settings, Edit } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardSettingsDialog } from '@/components/dashboard/DashboardSettingsDialog';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';

export default function Dashboard() {
  const { currentClient, isAdminMode } = useTenant();
  const { hasRole } = useAuth();
  const [dateRange, setDateRange] = useState(30);
  const [isDragMode, setIsDragMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { stats, isLoading } = useDashboardData(dateRange);
  
  const {
    visibleWidgets,
    layout,
    hiddenWidgets,
    saveLayout,
    toggleWidget,
    resetToDefaults,
    isLoading: preferencesLoading,
  } = useDashboardPreferences();

  if (hasRole('admin') && isAdminMode) {
    return <PlatformDashboard />;
  }

  const handleReorder = (newLayout: string[]) => {
    saveLayout(newLayout);
  };

  const handleHideWidget = (widgetId: string) => {
    toggleWidget(widgetId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Onboarding Checklist - Always show for new users, not draggable */}
      {stats?.activeCampaigns === 0 && <OnboardingChecklist />}

      {/* Header with Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentClient ? `${currentClient.name} Overview` : 'Welcome back'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={dateRange.toString()} onValueChange={(v) => setDateRange(Number(v))}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant={isDragMode ? 'default' : 'outline'}
            size="icon"
            onClick={() => setIsDragMode(!isDragMode)}
            title="Rearrange widgets"
          >
            <Edit className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            title="Dashboard settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Drag Mode Banner */}
      {isDragMode && (
        <div className="bg-primary/10 border-2 border-primary/50 rounded-lg p-4 text-center animate-in fade-in slide-in-from-top-2">
          <p className="font-medium text-primary">
            🎯 Drag Mode Active - Drag widgets to rearrange or click the eye icon to hide
          </p>
        </div>
      )}

      {/* Draggable Dashboard Grid */}
      {isLoading || preferencesLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      ) : (
        <DashboardGrid
          widgets={visibleWidgets}
          layout={layout}
          isDragMode={isDragMode}
          onReorder={handleReorder}
          onHideWidget={handleHideWidget}
          dateRange={dateRange}
        />
      )}

      {/* Settings Dialog */}
      <DashboardSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hiddenWidgets={hiddenWidgets}
        onToggleWidget={toggleWidget}
        onResetToDefaults={resetToDefaults}
      />
    </div>
  );
}
