import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringExpenseCard } from '../components/recurring-expense-card';
import { useRecurringExpenses } from '../hooks/use-recurring-expenses';
import { RecurringExpense } from '../types/recurring';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/refine-ui/empty-state';
import { RepeatIcon, InfoIcon } from "@/components/ui/icons";
import { useTranslation } from 'react-i18next';

interface RecurringExpenseListProps {
  groupId?: string;
  friendshipId?: string;
}

export function RecurringExpenseList({ groupId, friendshipId }: RecurringExpenseListProps) {
  const { t } = useTranslation();
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
          {t('recurring.loadError')}: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (recurring.length === 0) {
    return (
      <EmptyState
        icon={<RepeatIcon />}
        title={t('recurring.noRecurring')}
        description={t('recurring.noRecurringDescription')}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          {t('recurring.autoCreatedInfo')}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            {t('recurring.activeTab', { count: active.length })}
          </TabsTrigger>
          <TabsTrigger value="paused">{t('recurring.pausedTab', { count: paused.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('recurring.noActiveRecurring')}
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
                {t('recurring.noPausedRecurring')}
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
