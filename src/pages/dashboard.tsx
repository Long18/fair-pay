import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { FloatingActionButton } from "@/components/dashboard/FloatingActionButton";
import { DashboardLoadingBeam } from "@/components/dashboard/DashboardLoadingBeam";
import { BalanceTable } from "@/components/dashboard/BalanceTable";
import { SettledHistoryList } from "@/components/dashboard/SettledHistoryList";
import { EnhancedActivityList } from "@/components/dashboard/enhanced-activity";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageContent } from "@/components/ui/page-content";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useTranslation } from "react-i18next";
import { DashboardTracker } from "@/lib/analytics/index";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = usePersistedState<"balances" | "activity" | "history">("dashboard-tab", "balances");

  // Active debts (no history)
  const { data: debts = [], isLoading: debtsLoading, refetch: refetchDebts, error: debtsError } = useAggregatedDebts({
    includeHistory: false
  });

  // History debts (only fetched when history tab is active)
  const { data: historyDebts = [], isLoading: historyLoading } = useAggregatedDebts({
    includeHistory: activeTab === "history"
  });

  const {
    activities,
    isLoading: activitiesLoading
  } = useEnhancedActivity({ limit: 50 });

  const [loading, setLoading] = useState(true);
  const visibilityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefetchTimeRef = useRef<number>(0);

  // Refetch data when component mounts or becomes visible (with debounce and stale time check)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && identity?.id) {
        const now = Date.now();
        const timeSinceLastRefetch = now - lastRefetchTimeRef.current;
        const STALE_TIME = 5 * 1000;

        if (timeSinceLastRefetch > STALE_TIME) {
          if (visibilityDebounceRef.current) {
            clearTimeout(visibilityDebounceRef.current);
          }
          visibilityDebounceRef.current = setTimeout(() => {
            lastRefetchTimeRef.current = Date.now();
            refetchDebts();
          }, 300);
        }
      }
    };

    const handleFocus = () => {
      if (identity?.id) {
        const now = Date.now();
        const timeSinceLastRefetch = now - lastRefetchTimeRef.current;
        const STALE_TIME = 5 * 1000;

        if (timeSinceLastRefetch > STALE_TIME) {
          lastRefetchTimeRef.current = Date.now();
          refetchDebts();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (visibilityDebounceRef.current) {
        clearTimeout(visibilityDebounceRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.id]);

  useEffect(() => {
    if (!debtsLoading && !activitiesLoading) {
      const timer = setTimeout(() => {
        setLoading(false);

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

  // Process debts for balance table (active only)
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
        <DashboardLoadingBeam />
      ) : (
        <PageContainer variant="default">
          <PageHeader title={t('dashboard.title', 'Dashboard')} />

          <PageContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "balances" | "activity" | "history")} className="space-y-6">
              <div className="flex items-center justify-center w-full">
                <TabsList>
                  <TabsTrigger value="balances" className="px-6">
                    {t('balances.title', 'Balances')}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="px-6">
                    {t('dashboard.recentActivity', 'Activity')}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="px-6">
                    {t('history.title', 'History')}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="balances" className="space-y-4 mt-6">
                {debtsError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    {t('dashboard.errorLoadingDebts', 'Failed to load debts. Please try again.')}
                  </div>
                )}
                <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                  <BalanceTable balances={balances} disabled={!isAuthenticated} showHistory={false} showExpenseBreakdown={true} />
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-6">
                <div className="bg-card border rounded-lg shadow-sm overflow-hidden p-4">
                  <EnhancedActivityList
                    activities={activities}
                    currentUserId={identity?.id || ""}
                    currency="VND"
                    isLoading={activitiesLoading}
                    showSummary={false}
                    showFilters={true}
                    showSort={true}
                    showTimeGrouping={false}
                    showActions={true}
                    paginationMode="pagination"
                    pageSize={10}
                  />
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-6">
                <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                  <SettledHistoryList
                    debts={historyDebts}
                    isLoading={historyLoading}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </PageContent>
        </PageContainer>
      )}

      <FloatingActionButton disabled={!isAuthenticated} />
    </>
  );
};
