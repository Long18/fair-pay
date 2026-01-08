import React, { useState, useEffect, useMemo } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { FloatingActionButton } from "@/components/dashboard/FloatingActionButton";
import { DashboardSkeleton } from "@/components/dashboard/DashboardStates";
import { BalanceTable } from "@/components/dashboard/BalanceTable";
import { ActivityTable } from "@/components/dashboard/ActivityTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HistoryIcon, Loader2Icon } from "@/components/ui/icons";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { usePaginatedActivities } from "@/hooks/use-paginated-activities";
import { useTranslation } from "react-i18next";
import { DashboardTracker } from "@/lib/analytics/index";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const [isTogglingHistory, setIsTogglingHistory] = useState(false);
  const { data: debts = [], isLoading: debtsLoading, refetch: refetchDebts, error: debtsError } = useAggregatedDebts({
    includeHistory: showHistory
  });
  const {
    items: activities,
    metadata: activitiesMetadata,
    setPage: setActivitiesPage,
    isLoading: activitiesLoading
  } = usePaginatedActivities({ pageSize: 10 });

  const [loading, setLoading] = useState(true);

  // Handle history toggle with loading state
  const handleHistoryToggle = async (checked: boolean) => {
    setIsTogglingHistory(true);
    setShowHistory(checked);

    // Track toggle event
    DashboardTracker.viewToggled(`show_settled_${checked}`);

    setTimeout(() => setIsTogglingHistory(false), 500);
  };

  // Refetch data when component mounts or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && identity?.id) {
        console.log('Dashboard visible, refetching data...');
        refetchDebts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [identity?.id, refetchDebts]);

  useEffect(() => {
    if (!debtsLoading && !activitiesLoading) {
      const timer = setTimeout(() => {
        setLoading(false);

        // Track balance check when data is loaded
        if (identity?.id && debts.length > 0) {
          DashboardTracker.balanceChecked({
            hasDebts: true,
            debtCount: debts.length,
          });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [debtsLoading, activitiesLoading, identity?.id, debts.length]);

  const isAuthenticated = !!identity;

  // Process debts for balance table
  const balances = useMemo(() => {
    return debts.map(d => ({
      counterparty_id: d.counterparty_id,
      counterparty_name: d.counterparty_name,
      counterparty_avatar_url: d.counterparty_avatar_url,
      amount: d.amount,
      i_owe_them: d.i_owe_them,
      currency: d.currency,
      total_amount: d.total_amount,
      settled_amount: d.settled_amount,
      remaining_amount: d.remaining_amount,
      transaction_count: d.transaction_count,
      last_transaction_date: d.last_transaction_date,
    }));
  }, [debts]);

  return (
    <>
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Main Content Tabs */}
          <Tabs defaultValue="balances" className="space-y-6">
            <div className="flex items-center justify-center w-full">
              <TabsList>
                <TabsTrigger value="balances" className="px-6">
                  {t('balances.title', 'Balances')}
                </TabsTrigger>
                <TabsTrigger value="activity" className="px-6">
                  {t('dashboard.recentActivity', 'Activity')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="balances" className="space-y-4 mt-6">
              {isAuthenticated && (
                <div className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <HistoryIcon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <Label htmlFor="show-history" className="text-sm font-medium cursor-pointer">
                        {t('dashboard.showAllTransactions', 'Show all transactions (including settled)')}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('dashboard.showAllTransactionsTooltip', 'Include fully settled debts in the list')}
                      </p>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          {isTogglingHistory && (
                            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Switch
                            id="show-history"
                            checked={showHistory}
                            onCheckedChange={handleHistoryToggle}
                            disabled={isTogglingHistory}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          {t('dashboard.showAllTransactionsTooltip', 'Toggle to view your complete transaction history, including debts that have been fully settled')}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              {debtsError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {t('dashboard.errorLoadingDebts', 'Failed to load debts. Please try again.')}
                </div>
              )}
              <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <BalanceTable balances={balances} disabled={!isAuthenticated} showHistory={showHistory} />
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4 mt-6">
              <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <ActivityTable
                  activities={activities}
                  metadata={activitiesMetadata}
                  onPageChange={setActivitiesPage}
                  disabled={!isAuthenticated}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <FloatingActionButton disabled={!isAuthenticated} />
    </>
  );
};
