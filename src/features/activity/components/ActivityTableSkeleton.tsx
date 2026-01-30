/**
 * ActivityTableSkeleton Component
 * 
 * Loading skeleton for activity tables with realistic shimmer effect.
 */

import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/utils/cn';

interface ActivityTableSkeletonProps {
  rows?: number;
  columns?: number;
  showStats?: boolean;
}

export function ActivityTableSkeleton({ 
  rows = 10, 
  columns = 6,
  showStats = true 
}: ActivityTableSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Cards Skeleton */}
      {showStats && (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="p-6 rounded-lg border bg-card"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Skeleton */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className={cn(
                    "h-4",
                    i === 0 ? "w-28" : i === columns - 1 ? "w-16" : "w-20"
                  )} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton 
                      className={cn(
                        "h-4",
                        colIndex === 0 ? "w-32" : 
                        colIndex === 1 ? "w-20" :
                        colIndex === columns - 2 ? "w-16" :
                        colIndex === columns - 1 ? "w-12" :
                        "w-24"
                      )} 
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export default ActivityTableSkeleton;
