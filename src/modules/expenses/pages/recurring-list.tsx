import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringExpenseCard } from '../components/recurring-expense-card';
import { useRecurringExpenses } from '../hooks/use-recurring-expenses';
import { RecurringExpense } from '../types/recurring';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/refine-ui/empty-state';
import { RepeatIcon, InfoIcon, ArrowLeftIcon, PlusIcon } from "@/components/ui/icons";
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useGo } from '@refinedev/core';
import { CreateRecurringDialog } from '../components/create-recurring-dialog';
import { useState } from 'react';
import { RecurringExpensesAnalytics } from '@/components/analytics/recurring-expenses-analytics';

interface RecurringExpenseListProps {
  groupId?: string;
  friendshipId?: string;
}

export function RecurringExpenseList({ groupId, friendshipId }: RecurringExpenseListProps) {
  const { t } = useTranslation();
  const go = useGo();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { recurring, active, paused, isLoading, error } = useRecurringExpenses({
    groupId,
    friendshipId,
  });

  const isStandalonePage = !groupId && !friendshipId;

  if (isLoading) {
    return (
      <div className={isStandalonePage ? "container px-4 sm:px-6 py-4 sm:py-8 max-w-4xl" : ""}>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={isStandalonePage ? "container px-4 sm:px-6 py-4 sm:py-8 max-w-4xl" : ""}>
        <Alert variant="destructive">
          <AlertDescription>
            {t('recurring.loadError')}: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const content = recurring.length === 0 ? (
    <EmptyState
      icon={<RepeatIcon />}
      title={t('recurring.noRecurring')}
      description={t('recurring.noRecurringDescription')}
    />
  ) : (
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

  // Standalone page mode — full page with header, analytics, and create button
  if (isStandalonePage) {
    return (
      <div className="container px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => go({ to: "/dashboard" })}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <RepeatIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('recurring.pageTitle', 'Recurring Expenses')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('recurring.pageDescription', 'Manage your auto-created expense schedules')}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('recurring.create.title', 'Create')}
          </Button>
        </div>

        {/* Analytics summary */}
        <div className="mb-6">
          <RecurringExpensesAnalytics />
        </div>

        {content}

        <CreateRecurringDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </div>
    );
  }

  // Embedded mode — just the content (used inside ExpandableCard in group/friend pages)
  return content;
}
