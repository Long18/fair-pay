import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SplitCardSkeletonProps {
  count?: number;
  className?: string;
}

export function SplitCardSkeleton({
  count = 3,
  className,
}: SplitCardSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-2 rounded-lg p-4 bg-card"
        >
          <div className="flex items-center justify-between gap-3">
            {/* User Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-full flex-shrink-0" />

              {/* Name and Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>

            {/* Amount and Actions - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex flex-col items-end space-y-1">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>

            {/* Mobile: Expand Icon */}
            <div className="md:hidden">
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
