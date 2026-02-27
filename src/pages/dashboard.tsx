import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { FloatingActionButton } from "@/components/dashboard/core/FloatingActionButton";
import { DashboardLoadingBeam } from "@/components/dashboard/core/DashboardLoadingBeam";
import { BalanceTable } from "@/components/dashboard/balance/BalanceTable";
import { SettledHistoryList } from "@/components/dashboard/activity/SettledHistoryList";
import { EnhancedActivityList } from "@/components/dashboard/activity/enhanced-activity";
import { PageContainer } from "@/components/ui/page-container";
import { PageContent } from "@/components/ui/page-content";
import { useAggregatedDebts } from "@/hooks/balance/use-aggregated-debts";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { usePersistedState } from "@/hooks/settings/use-persisted-state";
import { useTranslation } from "react-i18next";
import { DashboardTracker } from "@/lib/analytics/index";
import { CACHE_CONFIG } from "@/lib/cache-config";
import { WalletIcon, ActivityIcon, HistoryIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

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
  } = useEnhancedActivity({ limit: 50, enabled: activeTab === "activity" });

  const [loading, setLoading] = useState(true);
  const visibilityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefetchTimeRef = useRef<number>(0);

  // Refetch data when component mounts or becomes visible (with debounce and stale time check)
  useEffect(() => {
    const STALE_TIME = CACHE_CONFIG.balance.staleTime;

    const refetchIfStale = ({ debounce = false } = {}) => {
      if (!identity?.id) return;
      const timeSinceLastRefetch = Date.now() - lastRefetchTimeRef.current;
      if (timeSinceLastRefetch <= STALE_TIME) return;

      if (debounce) {
        if (visibilityDebounceRef.current) {
          clearTimeout(visibilityDebounceRef.current);
        }
        visibilityDebounceRef.current = setTimeout(() => {
          lastRefetchTimeRef.current = Date.now();
          refetchDebts();
        }, 300);
      } else {
        lastRefetchTimeRef.current = Date.now();
        refetchDebts();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) refetchIfStale({ debounce: true });
    };

    const handleFocus = () => refetchIfStale();

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
    if (!debtsLoading) {
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
  }, [debtsLoading, identity?.id, debts.length]);

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

          <PageContent>
            {/* Tab Switcher */}
            <div className="flex items-center justify-center w-full">
              <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
                {([
                  { key: "balances" as const, label: t('balances.title', 'Balances'), icon: WalletIcon, count: balances.length },
                  { key: "activity" as const, label: t('dashboard.recentActivity', 'Activity'), icon: ActivityIcon, count: activities.length },
                  { key: "history" as const, label: t('history.title', 'History'), icon: HistoryIcon, count: historyDebts.length },
                ]).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-muted-foreground/10 text-muted-foreground"
                          )}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4 mt-6">
              {activeTab === "balances" && (
                <>
                  {debtsError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {t('dashboard.errorLoadingDebts', 'Failed to load debts. Please try again.')}
                    </div>
                  )}
                  <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                    <BalanceTable balances={balances} disabled={!isAuthenticated} showHistory={false} showExpenseBreakdown={true} />
                  </div>
                </>
              )}

              {activeTab === "activity" && (
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
              )}

              {activeTab === "history" && (
                <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                  <SettledHistoryList
                    debts={historyDebts}
                    isLoading={historyLoading}
                  />
                </div>
              )}
            </div>
          </PageContent>
        </PageContainer>
      )}

      <FloatingActionButton disabled={!isAuthenticated} />
    </>
  );
};
