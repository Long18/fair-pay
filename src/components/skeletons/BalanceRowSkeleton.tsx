import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface BalanceRowSkeletonProps {
  count?: number;
  showHistory?: boolean;
  className?: string;
}

export function BalanceRowSkeleton({
  count = 5,
  showHistory = false,
  className,
}: BalanceRowSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading balances"
      className={cn(className)}
    >
      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full rounded-md sm:max-w-sm" />
        <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-0.5">
          <Skeleton className="h-8 w-14 rounded-sm" />
          <Skeleton className="h-8 w-16 rounded-sm" />
          <Skeleton className="h-8 w-20 rounded-sm" />
        </div>
      </div>

      {/* Mobile list */}
      <div className="divide-y divide-border md:hidden" aria-hidden>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`balance-skel-mobile-${index}`}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block" aria-hidden>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]" />
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-14" />
              </TableHead>
              {showHistory ? (
                <>
                  <TableHead className="text-right">
                    <Skeleton className="ml-auto h-4 w-12" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Skeleton className="ml-auto h-4 w-14" />
                  </TableHead>
                  <TableHead className="text-center">
                    <Skeleton className="mx-auto h-4 w-10" />
                  </TableHead>
                </>
              ) : null}
              <TableHead className="text-right">
                <Skeleton className="ml-auto h-4 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: count }).map((_, index) => (
              <TableRow
                key={`balance-skel-desktop-${index}`}
                className={cn(index % 2 === 0 && "bg-muted/50 dark:bg-muted/30")}
              >
                <TableCell>
                  <Skeleton className="size-8 rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    {showHistory ? <Skeleton className="h-3 w-20" /> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-md" />
                </TableCell>
                {showHistory ? (
                  <>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-14" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="mx-auto h-5 w-8 rounded-md" />
                    </TableCell>
                  </>
                ) : null}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="size-4" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
