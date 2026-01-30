/**
 * CommunicationsActivityTab Component
 * 
 * Phone calls, SMS messages, and opt-in/opt-out events.
 */

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Phone, MessageSquare, PhoneIncoming, PhoneOutgoing, VolumeX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { useActivityLogs } from '../../hooks';
import { ActivityTable, StatusBadge } from '../ActivityTable';
import { ActivityFiltersPanel } from '../ActivityFilters';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { CommunicationActivityLog, ActivityFilters } from '../../types/activity.types';

const COMMUNICATION_EVENT_TYPES = [
  'call_inbound',
  'call_outbound',
  'call_completed',
  'call_missed',
  'call_recorded',
  'sms_inbound',
  'sms_outbound',
  'opt_in',
  'opt_out',
  'webhook_twilio',
];

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function createCommunicationColumns(): ColumnDef<CommunicationActivityLog>[] {
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
        const isCall = eventType.includes('call');
        const isSMS = eventType.includes('sms');
        const isOpt = eventType.includes('opt');
        
        return (
          <div className="flex items-center gap-2">
            {isCall && <Phone className="h-4 w-4" />}
            {isSMS && <MessageSquare className="h-4 w-4" />}
            {isOpt && <VolumeX className="h-4 w-4" />}
            <Badge variant="outline" className="capitalize">
              {eventType.replace(/_/g, ' ')}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'direction',
      header: 'Direction',
      cell: ({ row }) => {
        const direction = row.original.direction;
        if (!direction) return <span className="text-muted-foreground">-</span>;
        
        return (
          <div className="flex items-center gap-1">
            {direction === 'inbound' ? (
              <PhoneIncoming className="h-4 w-4 text-green-500" />
            ) : (
              <PhoneOutgoing className="h-4 w-4 text-blue-500" />
            )}
            <span className="capitalize text-sm">{direction}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'from_number',
      header: 'From',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.from_number || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'to_number',
      header: 'To',
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.to_number || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'duration_seconds',
      header: 'Duration',
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDuration(row.original.duration_seconds)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'recording',
      header: '',
      cell: ({ row }) => {
        if (row.original.recording_url) {
          return (
            <Button variant="ghost" size="sm" asChild>
              <a href={row.original.recording_url} target="_blank" rel="noopener noreferrer">
                Listen
              </a>
            </Button>
          );
        }
        return null;
      },
    },
  ];
}

interface CommunicationsActivityTabProps {
  filters: ActivityFilters;
  onFilterChange: (filters: Partial<ActivityFilters>) => void;
}

export function CommunicationsActivityTab({ filters, onFilterChange }: CommunicationsActivityTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useActivityLogs({
    category: 'communication',
    filters,
    page,
    pageSize,
  });

  const commLogs = (data?.data || []) as CommunicationActivityLog[];

  // Calculate stats
  const stats = {
    calls: commLogs.filter(l => l.event_type.includes('call')).length,
    sms: commLogs.filter(l => l.event_type.includes('sms')).length,
    optIns: commLogs.filter(l => l.event_type === 'opt_in').length,
    optOuts: commLogs.filter(l => l.event_type === 'opt_out').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Phone Calls</p>
                <p className="text-2xl font-bold">{stats.calls}</p>
              </div>
              <Phone className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SMS Messages</p>
                <p className="text-2xl font-bold">{stats.sms}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opt-Ins</p>
                <p className="text-2xl font-bold text-green-500">{stats.optIns}</p>
              </div>
              <Badge variant="default">+{stats.optIns}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opt-Outs</p>
                <p className="text-2xl font-bold text-amber-500">{stats.optOuts}</p>
              </div>
              <Badge variant="secondary">-{stats.optOuts}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Communications Activity</CardTitle>
              <CardDescription>
                Phone calls, SMS messages, and subscription events
              </CardDescription>
            </div>
            <ActivityFiltersPanel
              filters={filters}
              onFilterChange={onFilterChange}
              availableEventTypes={COMMUNICATION_EVENT_TYPES}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={commLogs}
            columns={createCommunicationColumns()}
            pagination={data?.pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            emptyMessage="No communication activity"
            emptyDescription="Phone calls and SMS messages will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default CommunicationsActivityTab;
