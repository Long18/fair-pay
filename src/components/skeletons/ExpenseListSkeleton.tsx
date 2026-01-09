import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ExpenseListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}
