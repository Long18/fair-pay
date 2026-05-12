import { Skeleton } from "@/components/ui/skeleton";

interface AdminTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function AdminTableSkeleton({ rows = 7, columns = 5 }: AdminTableSkeletonProps) {
  return (
    <div>
      <Skeleton className="h-10 w-full rounded-none" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b last:border-b-0">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              className="h-4"
              style={{ flex: j === 0 ? "2" : "1" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
