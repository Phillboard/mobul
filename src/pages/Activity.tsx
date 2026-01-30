/**
 * Activity Page
 * 
 * Unified Activity & Logs page consolidating all platform logging
 * into one compliance-ready interface.
 * 
 * Supports ISO 27001, SOC 2 Type II, and government contract requirements.
 */

import { useState, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Layout } from '@/shared/components/layout/Layout';
import { toast } from 'sonner';

import {
  ActivityHeader,
  ActivityTabs,
  QuickFilters,
  OverviewTab,
  GiftCardActivityTab,
  CampaignActivityTab,
  CommunicationsActivityTab,
  ApiActivityTab,
  UserActivityTab,
  SystemActivityTab,
} from '@/features/activity';

import { 
  useActivityFilters, 
  useActivityExport, 
  useActivityLogs 
} from '@/features/activity';

import { ExportFormat, ActivityCategory, ACTIVITY_TABS } from '@/features/activity';

export default function Activity() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Use local state for tabs - read from URL on mount
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'overview');

  const { 
    filters, 
    setFilter, 
    setFilters, 
    clearFilters, 
    clearFilter,
    hasActiveFilters,
    activeFilterCount 
  } = useActivityFilters();

  const { exportLogs, isExporting } = useActivityExport();
  
  // Get the category for the current tab
  const getCurrentCategory = (): ActivityCategory | undefined => {
    const tabConfig = ACTIVITY_TABS.find(t => t.id === activeTab);
    return tabConfig?.category;
  };
  
  // Fetch data for export based on current tab
  const { data: exportData, refetch: refetchExportData } = useActivityLogs({
    category: getCurrentCategory(),
    filters,
    pageSize: 5000,
    enabled: false, // Manual trigger only
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    clearFilters();
    // Update URL for bookmarking/sharing
    window.history.replaceState(null, '', `${location.pathname}?tab=${tab}`);
  };

  const handleExport = useCallback(async (format: ExportFormat) => {
    try {
      // Refetch data for export
      const { data: freshData } = await refetchExportData();
      
      if (!freshData?.data?.length) {
        toast.error('No data to export');
        return;
      }

      const result = await exportLogs(freshData.data, { 
        format,
        filters,
      });
      
      if (format === 'pdf') {
        toast.success('PDF opened in new window for printing');
      } else {
        toast.success(`Exported ${result.records_exported} records as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed. Please try again.');
    }
  }, [refetchExportData, exportLogs, filters]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with Search and Export */}
        <ActivityHeader
          filters={filters}
          onFilterChange={setFilters}
          onExport={handleExport}
          isExporting={isExporting}
          activeFilterCount={activeFilterCount}
          onClearFilters={clearFilters}
        />

        {/* Quick Filter Chips */}
        <QuickFilters
          filters={filters}
          onClearFilter={clearFilter}
          onClearAll={clearFilters}
        />

        {/* Tab Navigation */}
        <ActivityTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Tab Content - rendered based on activeTab */}
        <div className="mt-0">
          {activeTab === 'overview' && (
            <OverviewTab onNavigateToTab={handleTabChange} />
          )}

          {activeTab === 'gift-cards' && (
            <GiftCardActivityTab
              filters={filters}
              onFilterChange={setFilters}
            />
          )}

          {activeTab === 'campaigns' && (
            <CampaignActivityTab
              filters={filters}
              onFilterChange={setFilters}
            />
          )}

          {activeTab === 'communications' && (
            <CommunicationsActivityTab
              filters={filters}
              onFilterChange={setFilters}
            />
          )}

          {activeTab === 'api' && (
            <ApiActivityTab
              filters={filters}
              onFilterChange={setFilters}
            />
          )}

          {activeTab === 'users' && (
            <UserActivityTab
              filters={filters}
              onFilterChange={setFilters}
            />
          )}

          {activeTab === 'system' && (
            <SystemActivityTab
              filters={filters}
              onFilterChange={setFilters}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
