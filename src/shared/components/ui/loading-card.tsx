import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * LoadingCard Component
 * 
 * Premium loading state with shimmer effect and glassmorphism.
 * Used throughout the app for consistent loading states.
 * 
 * Features:
 * - Glassmorphic card background
 * - Shimmer animation overlay
 * - Semantic skeleton shapes
 */
export function LoadingCard() {
  return (
    <Card variant="glass" className="relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-shimmer-slide bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-4 w-3/4 bg-muted/30" />
        <Skeleton className="h-8 w-1/2 bg-muted/30" />
        <Skeleton className="h-4 w-full bg-muted/30" />
      </CardContent>
    </Card>
  );
}

/**
 * LoadingGrid Component
 * 
 * Grid of loading cards for dashboard and list views.
 * 
 * @param count - Number of loading cards to display
 * @param columns - Grid columns (default: 4)
 */
export function LoadingGrid({ count = 4, columns = 4 }: { count?: number; columns?: number }) {
  return (
    <div className={`grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}
