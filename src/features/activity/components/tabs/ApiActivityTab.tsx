/**
 * ApiActivityTab Component
 * 
 * API requests, webhook deliveries, and integration events.
 */

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Code, Webhook, Key, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useActivityLogs } from '../../hooks';
import { ActivityTable, StatusBadge } from '../ActivityTable';
import { ActivityFiltersPanel } from '../ActivityFilters';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { ApiActivityLog, ActivityFilters } from '../../types/activity.types';

const API_EVENT_TYPES = [
  'api_request',
  'api_key_created',
  'api_key_revoked',
  'webhook_sent',
  'webhook_received',
  'webhook_failed',
  'rate_limit_hit',
  'integration_sync',
];

function getMethodColor(method?: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-500 border-green-500/20',
    PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    PATCH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return colors[method || ''] || '';
}

function getStatusCodeColor(code?: number): string {
  if (!code) return '';
  if (code >= 200 && code < 300) return 'text-green-500';
  if (code >= 400 && code < 500) return 'text-amber-500';
  if (code >= 500) return 'text-red-500';
  return '';
}

function createApiColumns(): ColumnDef<ApiActivityLog>[] {
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
      accessorKey: 'event_type',
      header: 'Type',
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
      accessorKey: 'endpoint',
      header: 'Endpoint',
      cell: ({ row }) => {
        const endpoint = row.original.endpoint;
        const webhookUrl = row.original.webhook_url;
        return (
          <span className="font-mono text-xs truncate max-w-[200px] block">
            {endpoint || webhookUrl || '-'}
          </span>
        );
      },
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: ({ row }) => {
        const method = row.original.method;
        if (!method) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="outline" className={getMethodColor(method)}>
            {method}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status_code',
      header: 'Status',
      cell: ({ row }) => {
        const statusCode = row.original.status_code;
        if (!statusCode) return <StatusBadge status={row.original.status} />;
        return (
          <span className={`font-mono font-medium ${getStatusCodeColor(statusCode)}`}>
            {statusCode}
          </span>
        );
      },
    },
    {
      accessorKey: 'latency_ms',
      header: 'Latency',
      cell: ({ row }) => {
        const latency = row.original.latency_ms;
        if (!latency) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="text-sm">
            {latency}ms
          </span>
        );
      },
    },
    {
      accessorKey: 'api_key_name',
      header: 'API Key',
      cell: ({ row }) => {
        const keyName = row.original.api_key_name;
        if (!keyName) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1">
            <Key className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{keyName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'ip_address',
      header: 'IP',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.ip_address || '-'}
        </span>
      ),
    },
  ];
}

interface ApiActivityTabProps {
  filters: ActivityFilters;
  onFilterChange: (filters: Partial<ActivityFilters>) => void;
}

export function ApiActivityTab({ filters, onFilterChange }: ApiActivityTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useActivityLogs({
    category: 'api',
    filters,
    page,
    pageSize,
  });

  const apiLogs = (data?.data || []) as ApiActivityLog[];

  // Calculate stats
  const stats = {
    requests: apiLogs.filter(l => l.event_type === 'api_request').length,
    webhooks: apiLogs.filter(l => l.event_type.includes('webhook')).length,
    errors: apiLogs.filter(l => (l.status_code || 0) >= 400 || l.status === 'failed').length,
    rateLimited: apiLogs.filter(l => l.event_type === 'rate_limit_hit').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Requests</p>
                <p className="text-2xl font-bold">{stats.requests}</p>
              </div>
              <Code className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Webhooks</p>
                <p className="text-2xl font-bold">{stats.webhooks}</p>
              </div>
              <Webhook className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-500">{stats.errors}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rate Limited</p>
                <p className="text-2xl font-bold text-amber-500">{stats.rateLimited}</p>
              </div>
              <Zap className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API & Webhook Activity</CardTitle>
              <CardDescription>
                API requests, webhook deliveries, and integration events
              </CardDescription>
            </div>
            <ActivityFiltersPanel
              filters={filters}
              onFilterChange={onFilterChange}
              availableEventTypes={API_EVENT_TYPES}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={apiLogs}
            columns={createApiColumns()}
            pagination={data?.pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            emptyMessage="No API activity"
            emptyDescription="API requests and webhook deliveries will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiActivityTab;
