import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic page-level skeleton used as Suspense fallback.
 * Mirrors the rough shape of a standard page (title + card rows)
 * so the layout feels stable while the real component loads.
 */
export function PageSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6" role="status" aria-label="Loading…">
      {/* Page title */}
      <Skeleton className="h-7 w-40" />

      {/* Primary content card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/5" />
      </div>

      {/* Secondary rows */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact skeleton for admin pages — wider layout, table-like rows.
 */
export function AdminPageSkeleton() {
  return (
    <div className="w-full px-6 py-6 space-y-5" role="status" aria-label="Loading…">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Table-like rows */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex gap-4 px-4 py-3 border-b">
          {[120, 200, 100, 80].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: w }} />
          ))}
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 px-4 py-4 border-b last:border-0">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
