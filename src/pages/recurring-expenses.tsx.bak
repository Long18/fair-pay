import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageContent } from "@/components/ui/page-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BottomNavigation, BottomNavigationItem, BottomNavigationSpacer } from "@/components/ui/bottom-navigation";
import { MobileOnly, DesktopOnly } from "@/components/ui/responsive";
import { MobileAppBar } from "@/components/ui/mobile-app-bar";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useRecurringExpenses } from "@/modules/expenses/hooks/use-recurring-expenses";
import { RecurringExpenseCard } from "@/modules/expenses/components/recurring-expense-card";
import { CreateRecurringDialog } from "@/modules/expenses/components/create-recurring-dialog";
import { EditRecurringDialog } from "@/modules/expenses/components/edit-recurring-dialog";
import { RecurringExpensesAnalytics } from "@/components/analytics/recurring-expenses-analytics";
import { EmptyState } from "@/components/refine-ui/empty-state";
import { RecurringExpense } from "@/modules/expenses/types/recurring";
import { BulkCalendarExport } from "@/components/calendar/bulk-calendar-export";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HomeIcon,
  RepeatIcon,
  WalletIcon,
  UsersIcon,
  PlusIcon,
  InfoIcon,
} from "@/components/ui/icons";

export function RecurringExpensesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = usePersistedState<"active" | "paused" | "analytics">(
    "recurring-expenses-tab",
    "active"
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringExpense | null>(null);

  const { recurring, active, paused, isLoading, error } = useRecurringExpenses({});

  const handleEdit = (recurring: RecurringExpense) => {
    setSelectedRecurring(recurring);
    setEditDialogOpen(true);
  };

  // Keyboard shortcuts
  useKeyboardShortcut([
    {
      key: "1",
      callback: () => setActiveTab("active"),
      description: "Switch to Active tab",
    },
    {
      key: "2",
      callback: () => setActiveTab("paused"),
      description: "Switch to Paused tab",
    },
    {
      key: "3",
      callback: () => setActiveTab("analytics"),
      description: "Switch to Analytics tab",
    },
    {
      key: "n",
      callback: () => setCreateDialogOpen(true),
      description: "Create new recurring expense",
    },
  ]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMonthly = active.reduce((sum, r) => {
      const amount = r.template_expense?.amount || r.expenses?.amount || 0;
      // Simple monthly normalization - can be improved
      let monthlyAmount = amount;

      switch (r.frequency) {
        case 'weekly':
          monthlyAmount = amount * 4.33; // Average weeks per month
          break;
        case 'bi_weekly':
          monthlyAmount = amount * 2.165;
          break;
        case 'monthly':
          monthlyAmount = amount;
          break;
        case 'quarterly':
          monthlyAmount = amount / 3;
          break;
        case 'yearly':
          monthlyAmount = amount / 12;
          break;
      }

      return sum + (monthlyAmount / (r.interval || 1));
    }, 0);

    return {
      total: recurring.length,
      active: active.length,
      paused: paused.length,
      monthlyTotal: totalMonthly,
    };
  }, [recurring, active, paused]);

  // Get upcoming expenses (next 7 days)
  const upcomingExpenses = useMemo(() => {
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return active.filter(r => {
      const nextDate = new Date(r.next_occurrence);
      return nextDate >= today && nextDate <= sevenDaysLater;
    });
  }, [active]);

  if (isLoading) {
    return (
      <>
        <MobileOnly>
          <MobileAppBar title={t('recurring.title', 'Recurring Expenses')} />
        </MobileOnly>

        <PageContainer variant="default">
          <DesktopOnly>
            <PageHeader
              title={t('recurring.title', 'Recurring Expenses')}
              description={t('recurring.description', 'Manage your automatic recurring payments')}
            />
          </DesktopOnly>

          <PageContent>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </PageContent>
          <BottomNavigationSpacer />
        </PageContainer>

        <MobileOnly>
          <BottomNavigation>
            <BottomNavigationItem to="/dashboard" icon={<HomeIcon />} label={t('navigation.home', 'Home')} />
            <BottomNavigationItem to="/recurring-expenses" icon={<RepeatIcon />} label={t('navigation.recurring', 'Recurring')} />
            <BottomNavigationItem to="/balances" icon={<WalletIcon />} label={t('navigation.balances', 'Balances')} />
            <BottomNavigationItem to="/groups" icon={<UsersIcon />} label={t('navigation.groups', 'Groups')} />
          </BottomNavigation>
        </MobileOnly>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MobileOnly>
          <MobileAppBar title={t('recurring.title', 'Recurring Expenses')} />
        </MobileOnly>

        <PageContainer variant="default">
          <DesktopOnly>
            <PageHeader title={t('recurring.title', 'Recurring Expenses')} />
          </DesktopOnly>

          <PageContent>
            <Alert variant="destructive">
              <AlertDescription>
                {t('recurring.loadError', 'Failed to load recurring expenses')}: {error.message}
              </AlertDescription>
            </Alert>
          </PageContent>
          <BottomNavigationSpacer />
        </PageContainer>

        <MobileOnly>
          <BottomNavigation>
            <BottomNavigationItem to="/dashboard" icon={<HomeIcon />} label={t('navigation.home', 'Home')} />
            <BottomNavigationItem to="/recurring-expenses" icon={<RepeatIcon />} label={t('navigation.recurring', 'Recurring')} />
            <BottomNavigationItem to="/balances" icon={<WalletIcon />} label={t('navigation.balances', 'Balances')} />
            <BottomNavigationItem to="/groups" icon={<UsersIcon />} label={t('navigation.groups', 'Groups')} />
          </BottomNavigation>
        </MobileOnly>
      </>
    );
  }

  return (
    <>
      <MobileOnly>
        <MobileAppBar
          title={t('recurring.title', 'Recurring Expenses')}
          action={
            <Button size="sm" variant="ghost" onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          }
        />
      </MobileOnly>

      <PageContainer variant="default">
        <DesktopOnly>
          <PageHeader
            title={t('recurring.title', 'Recurring Expenses')}
            description={t('recurring.description', 'Manage your automatic recurring payments')}
            action={
              <div className="flex items-center gap-2">
                <BulkCalendarExport expenses={recurring} />
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t('recurring.create', 'Create Recurring')}
                </Button>
              </div>
            }
          />
        </DesktopOnly>

        <PageContent>
          {/* Stats Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {t('recurring.stats.total', 'Total')}
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {t('recurring.stats.active', 'Active')}
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {t('recurring.stats.paused', 'Paused')}
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.paused}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                {t('recurring.stats.monthly', 'Monthly Total')}
              </div>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(stats.monthlyTotal)}
              </div>
            </div>
          </div>

          {/* Upcoming Preview */}
          {upcomingExpenses.length > 0 && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">
                  {t('recurring.upcoming.title', 'Upcoming This Week')}
                </div>
                <div className="text-sm">
                  {t('recurring.upcoming.description', {
                    count: upcomingExpenses.length,
                    defaultValue: `${upcomingExpenses.length} recurring expense(s) will be created in the next 7 days.`,
                  })}
                </div>
                <div className="mt-2 space-y-1">
                  {upcomingExpenses.slice(0, 3).map(e => (
                    <div key={e.id} className="text-xs">
                      • {e.template_expense?.description || e.expenses?.description || 'Unnamed'} -{' '}
                      {new Date(e.next_occurrence).toLocaleDateString()}
                    </div>
                  ))}
                  {upcomingExpenses.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{upcomingExpenses.length - 3} more
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Main List */}
          {recurring.length === 0 ? (
            <EmptyState
              icon={<RepeatIcon />}
              title={t('recurring.empty.title', 'No Recurring Expenses')}
              description={t(
                'recurring.empty.description',
                'Create your first recurring expense to automate repetitive payments like rent, subscriptions, and utilities.'
              )}
              action={{
                label: t('recurring.create', 'Create Recurring'),
                onClick: () => setCreateDialogOpen(true),
              }}
            />
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "paused" | "analytics")}>
              <div className="flex items-center justify-center w-full">
                <TabsList>
                  <TabsTrigger value="active" className="px-6">
                    {t('recurring.tabs.active', 'Active')} ({active.length})
                  </TabsTrigger>
                  <TabsTrigger value="paused" className="px-6">
                    {t('recurring.tabs.paused', 'Paused')} ({paused.length})
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="px-6">
                    {t('recurring.tabs.analytics', 'Analytics')}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="active" className="space-y-4 mt-6">
                {active.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('recurring.empty.activeTab', 'No active recurring expenses')}
                    </p>
                  </div>
                ) : (
                  active.map((item) => (
                    <RecurringExpenseCard key={item.id} recurring={item} onEdit={handleEdit} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="paused" className="space-y-4 mt-6">
                {paused.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('recurring.empty.pausedTab', 'No paused recurring expenses')}
                    </p>
                  </div>
                ) : (
                  paused.map((item) => (
                    <RecurringExpenseCard key={item.id} recurring={item} onEdit={handleEdit} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <RecurringExpensesAnalytics />
              </TabsContent>
            </Tabs>
          )}
        </PageContent>
        <BottomNavigationSpacer />
      </PageContainer>

      <MobileOnly>
        <BottomNavigation>
          <BottomNavigationItem
            to="/dashboard"
            icon={<HomeIcon />}
            label={t('navigation.home', 'Home')}
          />
          <BottomNavigationItem
            to="/recurring-expenses"
            icon={<RepeatIcon />}
            label={t('navigation.recurring', 'Recurring')}
            badge={upcomingExpenses.length > 0 ? upcomingExpenses.length : undefined}
          />
          <BottomNavigationItem
            to="/balances"
            icon={<WalletIcon />}
            label={t('navigation.balances', 'Balances')}
          />
          <BottomNavigationItem
            to="/groups"
            icon={<UsersIcon />}
            label={t('navigation.groups', 'Groups')}
          />
        </BottomNavigation>
      </MobileOnly>

      <CreateRecurringDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <EditRecurringDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        recurring={selectedRecurring}
      />
    </>
  );
}
