/**
 * GiftCardActivityTab Component
 * 
 * Gift card provisioning, SMS delivery, and redemption activity.
 * Migrated from SMSDeliveryLog component.
 */

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Gift, RefreshCw, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useActivityLogs, useGiftCardStats } from '../../hooks';
import { ActivityTable, StatusBadge } from '../ActivityTable';
import { ActivityFiltersPanel } from '../ActivityFilters';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { GiftCardActivityLog, ActivityFilters } from '../../types/activity.types';
import { formatCurrency } from '@/shared/utils/currency';
import { Skeleton } from '@/shared/components/ui/skeleton';

const GIFT_CARD_EVENT_TYPES = [
  'card_provisioned',
  'card_assigned',
  'card_claimed',
  'sms_sent',
  'sms_delivered',
  'sms_failed',
  'card_redeemed',
  'card_activated',
  'card_cancelled',
  'delivery_retry',
];

function createGiftCardColumns(): ColumnDef<GiftCardActivityLog>[] {
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
        const eventLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
          sms_sent: { label: 'SMS Sent', variant: 'secondary' },
          sms_delivered: { label: 'SMS Delivered', variant: 'default' },
          sms_failed: { label: 'SMS Failed', variant: 'outline' },
          card_assigned: { label: 'Card Assigned', variant: 'secondary' },
          card_redeemed: { label: 'Redeemed', variant: 'default' },
          card_provisioned: { label: 'Provisioned', variant: 'secondary' },
          delivery_retry: { label: 'Retry', variant: 'outline' },
        };
        const config = eventLabels[eventType] || { label: eventType.replace(/_/g, ' '), variant: 'outline' as const };
        return (
          <Badge variant={config.variant} className="capitalize">
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'recipient_name',
      header: 'Recipient',
      cell: ({ row }) => {
        const name = row.original.recipient_name;
        const phone = row.original.recipient_phone;
        return (
          <div>
            <p className="font-medium">{name || 'Unknown'}</p>
            {phone && <p className="text-xs text-muted-foreground font-mono">{phone}</p>}
          </div>
        );
      },
    },
    {
      accessorKey: 'campaign_name',
      header: 'Campaign',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.campaign_name || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'brand_name',
      header: 'Gift Card',
      cell: ({ row }) => {
        const brand = row.original.brand_name;
        const amount = row.original.amount;
        return (
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-muted-foreground" />
            <span>{brand || 'N/A'}</span>
            {amount && (
              <Badge variant="outline">{formatCurrency(amount)}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status === 'failed' && row.original.event_type.includes('sms')) {
          return (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          );
        }
        return null;
      },
    },
  ];
}

interface GiftCardActivityTabProps {
  filters: ActivityFilters;
  onFilterChange: (filters: Partial<ActivityFilters>) => void;
}

export function GiftCardActivityTab({ filters, onFilterChange }: GiftCardActivityTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useActivityLogs({
    category: 'gift_card',
    filters,
    page,
    pageSize,
  });

  // Use server-side stats aggregation instead of client-side filtering
  const { data: stats, isLoading: statsLoading } = useGiftCardStats(filters);

  const giftCardLogs = (data?.data || []) as GiftCardActivityLog[];

  return (
    <div className="space-y-6">
      {/* Stats - Server-side aggregated */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SMS Sent</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.sent || 0}</p>
                )}
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-green-500">{stats?.delivered || 0}</p>
                )}
              </div>
              <Badge variant="default">Success</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-red-500">{stats?.failed || 0}</p>
                )}
              </div>
              <Badge variant="destructive">Failed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Redeemed</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-primary">{stats?.redeemed || 0}</p>
                )}
              </div>
              <Gift className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gift Card Activity</CardTitle>
              <CardDescription>
                SMS deliveries, redemptions, and gift card provisioning events
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ActivityFiltersPanel
                filters={filters}
                onFilterChange={onFilterChange}
                availableEventTypes={GIFT_CARD_EVENT_TYPES}
              />
              {(stats?.failed || 0) > 0 && (
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry {stats?.failed} Failed
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={giftCardLogs}
            columns={createGiftCardColumns()}
            pagination={data?.pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            emptyMessage="No gift card activity"
            emptyDescription="Gift card SMS deliveries and redemptions will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default GiftCardActivityTab;
