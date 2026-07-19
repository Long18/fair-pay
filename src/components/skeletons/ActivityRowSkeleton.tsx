import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ActivityRowSkeletonProps {
  count?: number;
  showChildRows?: boolean;
  className?: string;
  variant?: "default" | "timeline";
}

export function ActivityRowSkeleton({
  count = 5,
  showChildRows = false,
  className,
  variant = "default",
}: ActivityRowSkeletonProps) {
  if (variant === "timeline") {
    return (
      <div className={cn("divide-y divide-border/70", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] gap-3 px-4 py-3.5">
            <div className="flex justify-center pt-0.5">
              <Skeleton className="size-10 rounded-full" />
            </div>
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-3/4 max-w-sm" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-3 w-16" />
              </div>
              {i % 2 === 0 && <Skeleton className="h-1.5 w-40 rounded-full" />}
            </div>
            <div className="flex flex-col items-end gap-2 pt-0.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="size-7 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-0">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="flex flex-shrink-0 items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              {showChildRows && <Skeleton className="h-6 w-6 rounded" />}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex-shrink-0 text-right">
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          {showChildRows && i === 0 && (
            <div className="ml-12 mr-4 space-y-2 pb-2 pt-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 rounded-md border border-muted bg-muted/30 p-3"
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
