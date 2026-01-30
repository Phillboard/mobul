/**
 * ActivityTable Component
 * 
 * Reusable table component for displaying activity logs with:
 * - Sorting
 * - Pagination
 * - Loading states
 * - Empty states
 * - Expandable row details
 */

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, Loader2, Activity, Eye } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/utils/cn';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { ActivityLog, ActivityStatus, ActivitySeverity, ActivityPagination, ActivityCategory } from '../types/activity.types';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivityEmptyState } from './ActivityEmptyState';
import { ActivityTableSkeleton } from './ActivityTableSkeleton';

// ============================================================================
// Column Definitions
// ============================================================================

export function createActivityColumns(): ColumnDef<ActivityLog>[] {
  return [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {formatDate(row.getValue('timestamp'), DATE_FORMATS.DATETIME)}
        </span>
      ),
      sortingFn: 'datetime',
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.getValue('category') as string;
        return (
          <Badge variant="outline" className="capitalize">
            {category.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'event_type',
      header: 'Event',
      cell: ({ row }) => {
        const eventType = row.getValue('event_type') as string;
        return (
          <span className="font-medium text-sm">
            {eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        );
      },
    },
    {
      id: 'details',
      header: 'Details',
      cell: ({ row }) => {
        const log = row.original as any;
        // Show relevant details based on category
        let detail = '';
        let subDetail = '';
        
        if (log.category === 'system') {
          detail = log.message || 'System error';
          subDetail = log.source ? `Source: ${log.source}` : '';
        } else if (log.category === 'gift_card') {
          detail = log.recipient_name || '';
          subDetail = log.campaign_name ? `Campaign: ${log.campaign_name}` : '';
          if (log.brand_name) subDetail += ` | ${log.brand_name}`;
          if (log.amount) subDetail += ` $${log.amount}`;
        } else if (log.category === 'user') {
          detail = log.target_user_email || log.user_email || '';
          subDetail = log.location || '';
        } else if (log.category === 'api') {
          detail = log.endpoint || '';
          subDetail = log.method ? `${log.method} - ${log.status_code || ''}` : '';
        } else if (log.category === 'campaign') {
          detail = log.campaign_name || '';
          subDetail = log.recipients_affected ? `${log.recipients_affected} recipients` : '';
        } else if (log.category === 'communication') {
          detail = log.to_number || log.from_number || '';
          subDetail = log.direction || '';
        }
        
        return (
          <div className="max-w-[300px]">
            <span className="text-sm truncate block" title={detail}>
              {detail || '-'}
            </span>
            {subDetail && (
              <span className="text-xs text-muted-foreground truncate block" title={subDetail}>
                {subDetail}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as ActivityStatus;
        return <StatusBadge status={status} />;
      },
    },
  ];
}

// ============================================================================
// Status Badge
// ============================================================================

interface StatusBadgeProps {
  status: ActivityStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<ActivityStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    success: 'default',
    pending: 'secondary',
    failed: 'destructive',
    cancelled: 'outline',
  };

  return (
    <Badge variant={variants[status]} className="capitalize">
      {status}
    </Badge>
  );
}

// ============================================================================
// Severity Badge
// ============================================================================

interface SeverityBadgeProps {
  severity: ActivitySeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const classes: Record<ActivitySeverity, string> = {
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    critical: 'bg-red-700/10 text-red-700 border-red-700/20',
  };

  return (
    <Badge variant="outline" className={cn('capitalize', classes[severity])}>
      {severity}
    </Badge>
  );
}

// ============================================================================
// Main Table Component
// ============================================================================

interface ActivityTableProps<T extends ActivityLog> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: ActivityPagination;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  category?: ActivityCategory;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function ActivityTable<T extends ActivityLog>({
  data,
  columns,
  pagination,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  emptyMessage = 'No activity found',
  emptyDescription = 'Activity logs will appear here once there is platform activity.',
  category,
  hasFilters = false,
  onClearFilters,
}: ActivityTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'timestamp', desc: true },
  ]);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return <ActivityTableSkeleton rows={10} columns={columns.length} showStats={false} />;
  }

  if (data.length === 0) {
    return (
      <ActivityEmptyState
        category={hasFilters ? 'search' : category}
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <button
                        className={cn(
                          'flex items-center gap-1 hover:text-foreground transition-colors',
                          header.column.getCanSort() && 'cursor-pointer select-none'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </>
                        )}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow 
                key={row.id} 
                className="hover:bg-muted/30 cursor-pointer group"
                onClick={() => setSelectedLog(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell className="w-10">
                  <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Modal */}
      <ActivityDetailModal
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
              {Math.min(pagination.page * pagination.page_size, pagination.total_count)} of{' '}
              {pagination.total_count} results
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select
                value={String(pagination.page_size)}
                onValueChange={(value) => onPageSizeChange?.(Number(value))}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityTable;
