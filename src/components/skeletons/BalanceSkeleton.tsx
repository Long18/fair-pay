import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function BalanceSkeleton() {
  return (
    <div className="bento-grid gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bento-item p-6 animate-pulse">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-32" />
        </Card>
      ))}
    </div>
  );
}
