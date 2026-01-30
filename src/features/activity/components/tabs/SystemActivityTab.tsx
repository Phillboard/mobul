/**
 * SystemActivityTab Component
 * 
 * Admin-only system activity: errors, background jobs, integrations.
 */

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Server, AlertTriangle, Bug, Zap, Database, PlugZap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { useActivityLogs } from '../../hooks';
import { ActivityTable, SeverityBadge, StatusBadge } from '../ActivityTable';
import { ActivityFiltersPanel } from '../ActivityFilters';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { SystemActivityLog, ActivityFilters } from '../../types/activity.types';
import { useUserRole } from '@core/auth/hooks/useUserRole';

const SYSTEM_EVENT_TYPES = [
  'error',
  'job_started',
  'job_completed',
  'job_failed',
  'integration_connected',
  'integration_disconnected',
  'integration_error',
  'database_operation',
  'security_event',
  'performance_alert',
];

function createSystemColumns(): ColumnDef<SystemActivityLog>[] {
  return [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {formatDate(row.getValue('timestamp'), DATE_FORMATS.DATETIME)}
        </span>
      ),
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    },
    {
      accessorKey: 'event_type',
      header: 'Event',
      cell: ({ row }) => {
        const eventType = row.getValue('event_type') as string;
        return (
          <Badge variant="outline" className="capitalize">
            {eventType.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'message',
      header: 'Message',
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[300px] block" title={row.original.message}>
          {row.original.message}
        </span>
      ),
    },
    {
      accessorKey: 'job_name',
      header: 'Job/Integration',
      cell: ({ row }) => {
        const jobName = row.original.job_name;
        const integrationName = row.original.integration_name;
        const name = jobName || integrationName;
        if (!name) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {name}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'correlation_id',
      header: 'Trace ID',
      cell: ({ row }) => (
        <span className="font-mono text-[10px] text-muted-foreground">
          {row.original.correlation_id?.slice(0, 8) || '-'}
        </span>
      ),
    },
  ];
}

interface SystemActivityTabProps {
  filters: ActivityFilters;
  onFilterChange: (filters: Partial<ActivityFilters>) => void;
}

export function SystemActivityTab({ filters, onFilterChange }: SystemActivityTabProps) {
  const { data: userRole } = useUserRole();
  const isAdmin = userRole === 'admin' || userRole === 'tech_support';
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useActivityLogs({
    category: 'system',
    filters,
    page,
    pageSize,
    enabled: isAdmin,
  });

  const systemLogs = (data?.data || []) as SystemActivityLog[];

  // Calculate stats
  const stats = {
    errors: systemLogs.filter(l => l.severity === 'error' || l.severity === 'critical').length,
    warnings: systemLogs.filter(l => l.severity === 'warning').length,
    jobsCompleted: systemLogs.filter(l => l.event_type === 'job_completed').length,
    jobsFailed: systemLogs.filter(l => l.event_type === 'job_failed').length,
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Server className="h-4 w-4" />
        <AlertTitle>Admin Access Required</AlertTitle>
        <AlertDescription>
          System logs are only available to administrators and tech support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Warning */}
      <Alert variant="default" className="border-amber-500/20 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle>System Logs (Admin Only)</AlertTitle>
        <AlertDescription>
          These logs contain sensitive system information and are only visible to administrators.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-500">{stats.errors}</p>
              </div>
              <Bug className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-amber-500">{stats.warnings}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
                <p className="text-2xl font-bold text-green-500">{stats.jobsCompleted}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jobs Failed</p>
                <p className="text-2xl font-bold text-red-500">{stats.jobsFailed}</p>
              </div>
              <Zap className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>
                Error logs, background jobs, and integration events
              </CardDescription>
            </div>
            <ActivityFiltersPanel
              filters={filters}
              onFilterChange={onFilterChange}
              availableEventTypes={SYSTEM_EVENT_TYPES}
              showSeverity
            />
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={systemLogs}
            columns={createSystemColumns()}
            pagination={data?.pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            emptyMessage="No system activity"
            emptyDescription="System events, errors, and background job logs will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default SystemActivityTab;
