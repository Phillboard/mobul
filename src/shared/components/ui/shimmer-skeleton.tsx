import { cn } from '@/shared/utils/cn';

interface ShimmerSkeletonProps {
  className?: string;
}

export function ShimmerSkeleton({ className }: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/50",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-shimmer",
        "before:bg-gradient-to-r",
        "before:from-transparent before:via-white/10 before:to-transparent",
        "shimmer-effect",
        className
      )}
    />
  );
}

interface ShimmerLoadingProps {
  rows?: number;
  className?: string;
}

export function ShimmerLoading({ rows = 5, className }: ShimmerLoadingProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerSkeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
