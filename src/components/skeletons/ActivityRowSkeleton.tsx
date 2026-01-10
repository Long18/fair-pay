import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ActivityRowSkeletonProps {
  count?: number;
  showChildRows?: boolean;
  className?: string;
}

export function ActivityRowSkeleton({
  count = 5,
  showChildRows = false,
  className,
}: ActivityRowSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-0">
          {/* Parent Row Skeleton */}
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            {/* Left Section: Badge + Expand Control */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Skeleton className="h-6 w-20 rounded-full" />
              {showChildRows && <Skeleton className="h-6 w-6 rounded" />}
            </div>

            {/* Center Section: Expense Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>

            {/* Right Section: Amount */}
            <div className="text-right flex-shrink-0">
              <Skeleton className="h-6 w-24" />
            </div>
          </div>

          {/* Child Rows Skeleton (Optional) */}
          {showChildRows && i === 0 && (
            <div className="ml-12 mr-4 space-y-2 pt-2 pb-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-muted"
                >
                  <Skeleton className="h-3 w-20" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
