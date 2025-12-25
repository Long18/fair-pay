import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringExpenseCard } from '../components/recurring-expense-card';
import { useRecurringExpenses } from '../hooks/use-recurring-expenses';
import { RecurringExpense } from '../types/recurring';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Repeat, Info } from 'lucide-react';

interface RecurringExpenseListProps {
  groupId?: string;
  friendshipId?: string;
}

export function RecurringExpenseList({ groupId, friendshipId }: RecurringExpenseListProps) {
  const { recurring, active, paused, isLoading, error } = useRecurringExpenses({
    groupId,
    friendshipId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Có lỗi xảy ra khi tải chi phí định kỳ: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (recurring.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Repeat className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Chưa có chi phí định kỳ</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Khi tạo chi phí, chọn "Chi phí định kỳ" để tự động tạo chi phí theo lịch
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Chi phí định kỳ được tạo tự động vào 00:00 UTC mỗi ngày. Bạn có thể tạm dừng hoặc xóa
          bất kỳ lúc nào.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Đang hoạt động ({active.length})
          </TabsTrigger>
          <TabsTrigger value="paused">Đã tạm dừng ({paused.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Không có chi phí định kỳ nào đang hoạt động
              </p>
            </div>
          ) : (
            active.map((item) => (
              <RecurringExpenseCard key={item.id} recurring={item as RecurringExpense} />
            ))
          )}
        </TabsContent>

        <TabsContent value="paused" className="space-y-4 mt-4">
          {paused.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Không có chi phí định kỳ nào bị tạm dừng
              </p>
            </div>
          ) : (
            paused.map((item) => (
              <RecurringExpenseCard key={item.id} recurring={item as RecurringExpense} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
