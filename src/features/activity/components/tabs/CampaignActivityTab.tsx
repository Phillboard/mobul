/**
 * CampaignActivityTab Component
 * 
 * Campaign lifecycle events, mail piece tracking, and recipient activity.
 */

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Megaphone, Mail, Users, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useActivityLogs } from '../../hooks';
import { ActivityTable, StatusBadge } from '../ActivityTable';
import { ActivityFiltersPanel } from '../ActivityFilters';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { CampaignActivityLog, ActivityFilters } from '../../types/activity.types';

const CAMPAIGN_EVENT_TYPES = [
  'campaign_created',
  'campaign_updated',
  'campaign_launched',
  'campaign_paused',
  'campaign_completed',
  'campaign_deleted',
  'mail_piece_sent',
  'mail_piece_delivered',
  'mail_piece_returned',
  'recipient_added',
  'recipient_removed',
  'list_uploaded',
  'response_recorded',
  'conversion_tracked',
];

function createCampaignColumns(): ColumnDef<CampaignActivityLog>[] {
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
      accessorKey: 'campaign_name',
      header: 'Campaign',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.campaign_name || 'N/A'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'user_email',
      header: 'Triggered By',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.user_email || 'System'}
        </span>
      ),
    },
    {
      accessorKey: 'recipients_affected',
      header: 'Recipients',
      cell: ({ row }) => {
        const count = row.original.recipients_affected;
        return count ? (
          <Badge variant="secondary">{count.toLocaleString()}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

interface CampaignActivityTabProps {
  filters: ActivityFilters;
  onFilterChange: (filters: Partial<ActivityFilters>) => void;
}

export function CampaignActivityTab({ filters, onFilterChange }: CampaignActivityTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useActivityLogs({
    category: 'campaign',
    filters,
    page,
    pageSize,
  });

  const campaignLogs = (data?.data || []) as CampaignActivityLog[];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Campaigns Created</p>
                <p className="text-2xl font-bold">
                  {campaignLogs.filter(l => l.event_type === 'campaign_created').length}
                </p>
              </div>
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mail Pieces Sent</p>
                <p className="text-2xl font-bold">
                  {campaignLogs.filter(l => l.event_type === 'mail_piece_sent').length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recipients Added</p>
                <p className="text-2xl font-bold">
                  {campaignLogs.filter(l => l.event_type === 'recipient_added').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversions</p>
                <p className="text-2xl font-bold text-green-500">
                  {campaignLogs.filter(l => l.event_type === 'conversion_tracked').length}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaign Activity</CardTitle>
              <CardDescription>
                Campaign lifecycle events, mail sends, and tracking
              </CardDescription>
            </div>
            <ActivityFiltersPanel
              filters={filters}
              onFilterChange={onFilterChange}
              availableEventTypes={CAMPAIGN_EVENT_TYPES}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={campaignLogs}
            columns={createCampaignColumns()}
            pagination={data?.pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            emptyMessage="No campaign activity"
            emptyDescription="Campaign events will appear here as campaigns are created and run."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default CampaignActivityTab;
