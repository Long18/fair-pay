import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurringExpenseCard } from '../components/recurring-expense-card';
import { EditRecurringDialog } from '../components/edit-recurring-dialog';
import { useRecurringExpenses } from '../hooks/use-recurring-expenses';
import { useRecurringActions } from '../hooks/use-recurring-actions';
import { RecurringExpense } from '../types/recurring';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/refine-ui/empty-state';
import {
  RepeatIcon,
  InfoIcon,
  PlusIcon,
  CalendarIcon,
  PauseIcon,
  PlayIcon,
  PieChartIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateRecurringDialog } from '../components/create-recurring-dialog';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { RecurringExpensesAnalytics } from '@/components/analytics/recurring-expenses-analytics';
import { exportAllRecurringExpensesToCalendar } from '@/lib/calendar-export';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/ui/page-container';
import { PageContent } from '@/components/ui/page-content';
import { PageHeader } from '@/components/ui/page-header';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface RecurringExpenseListProps {
  groupId?: string;
  friendshipId?: string;
}

export function RecurringExpenseList({ groupId, friendshipId }: RecurringExpenseListProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { pause, resume } = useRecurringActions();
  const { recurring, active, paused, isLoading, error } = useRecurringExpenses({
    groupId,
    friendshipId,
  });

  const isStandalonePage = !groupId && !friendshipId;

  const statusTab =
    searchParams.get('status') === 'paused' ? 'paused' : 'active';

  const setStatusTab = (status: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('status', status === 'paused' ? 'paused' : 'active');
    setSearchParams(next, { replace: true });
  };

  const selectedItems = useMemo(
    () => recurring.filter((item) => selectedIds.has(item.id)),
    [recurring, selectedIds],
  );

  const handleEdit = (item: RecurringExpense) => {
    setEditingRecurring(item);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkPause = () => {
    const targets = selectedItems.filter((item) => item.is_active);
    targets.forEach((item) => pause(item.id));
    setSelectedIds(new Set());
    if (targets.length > 0) {
      toast.success(t('recurring.bulkPaused', 'Paused {{count}} schedules', { count: targets.length }));
    }
  };

  const handleBulkResume = () => {
    const targets = selectedItems.filter((item) => !item.is_active);
    targets.forEach((item) => resume(item.id));
    setSelectedIds(new Set());
    if (targets.length > 0) {
      toast.success(t('recurring.bulkResumed', 'Resumed {{count}} schedules', { count: targets.length }));
    }
  };

  const handleExportCalendar = () => {
    tap();
    try {
      if (active.length === 0) {
        toast.message(t('recurring.noActiveForCalendar', 'No active recurring expenses to export'));
        return;
      }
      exportAllRecurringExpensesToCalendar(active as RecurringExpense[]);
      toast.success(t('calendar.exported', 'Calendar file downloaded'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('calendar.exportError', 'Export failed'));
    }
  };

  const renderSelectableCard = (item: RecurringExpense, compact = false) => {
    if (!isStandalonePage) {
      return (
        <RecurringExpenseCard
          key={item.id}
          recurring={item}
          onEdit={handleEdit}
        />
      );
    }

    const checked = selectedIds.has(item.id);
    return (
      <div key={item.id} className="flex items-start gap-2">
        <Checkbox
          className="mt-4"
          checked={checked}
          onCheckedChange={() => toggleSelected(item.id)}
          aria-label={t('recurring.selectItem', 'Select recurring expense')}
        />
        <div className={cn('flex-1 min-w-0', checked && 'ring-1 ring-primary/30 rounded-xl')}>
          <RecurringExpenseCard recurring={item} onEdit={handleEdit} compact={compact} />
        </div>
      </div>
    );
  };

  if (isLoading) {
    if (isStandalonePage) {
      return (
        <PageContainer padding="none" variant="default">
          <PageContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </PageContent>
        </PageContainer>
      );
    }
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    if (isStandalonePage) {
      return (
        <PageContainer padding="none" variant="default">
          <PageContent>
            <Alert variant="destructive">
              <AlertDescription>
                {t('recurring.loadError')}: {error.message}
              </AlertDescription>
            </Alert>
          </PageContent>
        </PageContainer>
      );
    }
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t('recurring.loadError')}: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Embedded list body (group/friend) — keep Alert + default tabs behavior
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
            active.map((item) => renderSelectableCard(item as RecurringExpense))
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
            paused.map((item) => renderSelectableCard(item as RecurringExpense))
          )}
        </TabsContent>
      </Tabs>

      <EditRecurringDialog
        open={!!editingRecurring}
        onOpenChange={(open) => {
          if (!open) setEditingRecurring(null);
        }}
        recurring={editingRecurring}
      />
    </div>
  );

  // Standalone page — list first; analytics only in a Sheet (no page scroll for charts)
  if (isStandalonePage) {
    const summaryLine =
      recurring.length === 0
        ? null
        : t(
            'recurring.listSummary',
            '{{active}} active · {{paused}} paused',
            { active: active.length, paused: paused.length },
          );

    return (
      <PageContainer padding="none" variant="default">
        <PageContent>
          <PageHeader
            title={t('recurring.pageTitle', 'Recurring Expenses')}
            description={t(
              'recurring.pageDescriptionListFirst',
              'Schedules that auto-create expenses. Open Insights for totals.',
            )}
            action={
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recurring.length === 0}
                      onClick={() => tap()}
                    >
                      <PieChartIcon className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">
                        {t('analytics.insights', 'Insights')}
                      </span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>{t('analytics.insights', 'Insights')}</SheetTitle>
                      <SheetDescription>
                        {t(
                          'recurring.insightsDescription',
                          'Monthly totals and category breakdown. Close to return to your list.',
                        )}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 px-1 pb-6">
                      <RecurringExpensesAnalytics variant="full" />
                    </div>
                  </SheetContent>
                </Sheet>
                <Button variant="outline" size="sm" onClick={handleExportCalendar}>
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">
                    {t('calendar.downloadICS', 'ICS')}
                  </span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    tap();
                    setShowCreateDialog(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t('recurring.create.title', 'Create')}
                </Button>
              </div>
            }
          />

          {summaryLine ? (
            <p className="text-sm text-muted-foreground -mt-2">{summaryLine}</p>
          ) : null}

          {recurring.length === 0 ? (
            <EmptyState
              icon={<RepeatIcon />}
              title={t('recurring.noRecurring')}
              description={t('recurring.noRecurringDescription')}
            />
          ) : (
            <div className="space-y-4">
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="text-xs text-muted-foreground mr-1">
                    {t('recurring.selectedCount', '{{count}} selected', { count: selectedIds.size })}
                  </span>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleBulkPause}>
                    <PauseIcon className="h-3.5 w-3.5" />
                    {t('recurring.pauseSelected', 'Pause')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleBulkResume}>
                    <PlayIcon className="h-3.5 w-3.5" />
                    {t('recurring.resumeSelected', 'Resume')}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelectedIds(new Set())}>
                    {t('common.clear', 'Clear')}
                  </Button>
                </div>
              )}

              <Tabs
                value={statusTab}
                onValueChange={(v) => {
                  tap();
                  setStatusTab(v);
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    {t('recurring.activeTab', { count: active.length })}
                  </TabsTrigger>
                  <TabsTrigger value="paused">
                    {t('recurring.pausedTab', { count: paused.length })}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-3 mt-4">
                  {active.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t('recurring.noActiveRecurring')}
                      </p>
                    </div>
                  ) : (
                    active.map((item) => renderSelectableCard(item as RecurringExpense, true))
                  )}
                </TabsContent>

                <TabsContent value="paused" className="space-y-3 mt-4">
                  {paused.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t('recurring.noPausedRecurring')}
                      </p>
                    </div>
                  ) : (
                    paused.map((item) => renderSelectableCard(item as RecurringExpense, true))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          <EditRecurringDialog
            open={!!editingRecurring}
            onOpenChange={(open) => {
              if (!open) setEditingRecurring(null);
            }}
            recurring={editingRecurring}
          />

          <CreateRecurringDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          />
        </PageContent>
      </PageContainer>
    );
  }

  // Embedded mode — just the content (used inside ExpandableCard in group/friend pages)
  return content;
}
