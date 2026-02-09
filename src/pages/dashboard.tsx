import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { FloatingActionButton } from "@/components/dashboard/FloatingActionButton";
import { DashboardSkeleton } from "@/components/dashboard/DashboardStates";
import { BalanceTable } from "@/components/dashboard/BalanceTable";
import { EnhancedActivityList } from "@/components/dashboard/enhanced-activity";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageContent } from "@/components/ui/page-content";
import { HistoryIcon } from "@/components/ui/icons";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { useTranslation } from "react-i18next";
import { DashboardTracker } from "@/lib/analytics/index";

export const Dashboard = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const [showHistory, setShowHistory] = useState(false);
  const { data: debts = [], isLoading: debtsLoading, refetch: refetchDebts, error: debtsError } = useAggregatedDebts({
    includeHistory: showHistory
  });
  const {
    activities,
    isLoading: activitiesLoading
  } = useEnhancedActivity({ limit: 50 });

  const [loading, setLoading] = useState(true);
  const visibilityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefetchTimeRef = useRef<number>(0);

  // Handle history toggle
  const handleHistoryToggle = (checked: boolean) => {
    setShowHistory(checked);
    // Track toggle event
    DashboardTracker.viewToggled(`show_settled_${checked}`);
  };

  // Refetch data when component mounts or becomes visible (with debounce and stale time check)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && identity?.id) {
        // Only refetch if data is stale (older than 30 seconds)
        const now = Date.now();
        const timeSinceLastRefetch = now - lastRefetchTimeRef.current;
        const STALE_TIME = 30 * 1000; // 30 seconds

        if (timeSinceLastRefetch > STALE_TIME) {
          // Clear any pending debounce
          if (visibilityDebounceRef.current) {
            clearTimeout(visibilityDebounceRef.current);
          }

          // Debounce the refetch
          visibilityDebounceRef.current = setTimeout(() => {
            console.log('Dashboard visible, refetching stale data...');
            lastRefetchTimeRef.current = Date.now();
            refetchDebts();
          }, 1000); // 1 second debounce
        } else {
          console.log('Dashboard visible, but data is still fresh, skipping refetch');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (visibilityDebounceRef.current) {
        clearTimeout(visibilityDebounceRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.id]); // Removed refetchDebts from dependencies to prevent infinite loop

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
  // Zero-balance filtering is handled by backend SQL (HAVING clause) and hook layer
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
        <PageContainer variant="default">
          <PageHeader title={t('dashboard.title', 'Dashboard')} />

          <PageContent>
            {/* Balances - Primary Content */}
            <div className="space-y-4">
              {isAuthenticated && showHistory && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                  <HistoryIcon className="h-4 w-4" />
                  <span>{t('dashboard.showingSettledDebts', 'Showing settled debts')}</span>
                  <button
                    onClick={() => handleHistoryToggle(false)}
                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Hide settled debts"
                  >
                    ✕
                  </button>
                </div>
              )}
              {debtsError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {t('dashboard.errorLoadingDebts', 'Failed to load debts. Please try again.')}
                </div>
              )}
              <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <BalanceTable balances={balances} disabled={!isAuthenticated} showHistory={showHistory} showExpenseBreakdown={!showHistory} />
              </div>
            </div>

            {/* Activity - Secondary Content */}
            <div className="space-y-3 mt-8">
              <h2 className="text-lg font-semibold text-foreground">
                {t('dashboard.recentActivity', 'Activity')}
              </h2>
              <div className="bg-card border rounded-lg shadow-sm overflow-hidden p-4">
                <EnhancedActivityList
                  activities={activities}
                  currentUserId={identity?.id || ""}
                  currency="VND"
                  isLoading={activitiesLoading}
                  showSummary={true}
                  showFilters={true}
                  showSort={true}
                  showTimeGrouping={true}
                />
              </div>
            </div>
          </PageContent>
        </PageContainer>
      )}

      <FloatingActionButton disabled={!isAuthenticated} />
    </>
  );
};
