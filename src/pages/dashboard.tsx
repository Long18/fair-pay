import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGetIdentity } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";
import { Profile } from "@/modules/profile/types";
import { FloatingActionButton } from "@/components/dashboard/core/FloatingActionButton";
import { DashboardLoadingBeam } from "@/components/dashboard/core/DashboardLoadingBeam";
import { BalanceTable } from "@/components/dashboard/balance/BalanceTable";
import { SettledHistoryList } from "@/components/dashboard/activity/SettledHistoryList";
import { EnhancedActivityList } from "@/components/dashboard/activity/enhanced-activity";
import { HistoryLedgerList } from "@/components/dashboard/activity/history-ledger-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AnimatePresence, motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { FloatingDecoration } from "@/components/ui/floating-decoration";
import { CoinShape, ChartLineShape, CircleShape, HexagonShape, WalletShape } from "@/components/ui/decorative-shapes";

export const Dashboard = () => {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [activeTab, setActiveTab] = usePersistedState<"balances" | "activity" | "history">("dashboard-tab", "balances");
  const [historyView, setHistoryView] = usePersistedState<"transactions" | "people">(
    "dashboard-history-view",
    "transactions"
  );

  const tabOrder = ["balances", "activity", "history"] as const;
  const currentIndex = tabOrder.indexOf(activeTab);
  const prevIndexRef = useRef(currentIndex);
  const directionRef = useRef(0);

  useEffect(() => {
    directionRef.current = currentIndex > prevIndexRef.current ? 1 : -1;
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Active debts (no history) — only fetch once we have an authenticated identity
  const { data: debts = [], isLoading: debtsLoading, refetch: refetchDebts, error: debtsError } = useAggregatedDebts({
    includeHistory: false,
    enabled: !!identity?.id,
  });

  // History debts (only fetched when history tab is active and user is authenticated)
  const { data: historyDebts = [], isLoading: historyLoading } = useAggregatedDebts({
    includeHistory: activeTab === "history",
    enabled: !!identity?.id && activeTab === "history",
  });

  const {
    activities,
    isLoading: activitiesLoading
  } = useEnhancedActivity({ limit: 50, enabled: !!identity?.id && activeTab === "activity" });
  const {
    activities: historyActivities,
    isLoading: historyActivitiesLoading,
  } = useEnhancedActivity({ limit: "all", enabled: !!identity?.id && activeTab === "history" });

  const [loading, setLoading] = useState(true);
  const visibilityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    // Show dashboard shell immediately so Balances can paint row skeletons
    // while Supabase debts load (instead of blocking on DashboardLoadingBeam).
    const timer = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!debtsLoading && identity?.id && debts.length > 0) {
      DashboardTracker.balanceChecked({
        hasDebts: true,
        debtCount: debts.length,
      });
    }
  }, [debtsLoading, identity?.id, debts.length]);

  const isGuest = !identityLoading && !identity;

  // Process debts for balance table (active only)
  const balances = useMemo(() => {
    return debts.map(d => ({
      counterparty_id: d.counterparty_id,
      counterparty_name: d.counterparty_name,
      counterparty_avatar_url: d.counterparty_avatar_url,
      counterparty_email: d.counterparty_email,
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

  if (loading) {
    return <DashboardLoadingBeam />;
  }

  return (
    <>
      <PageContainer padding="none" variant="default">

          <PageContent className="relative">
            {/* Floating Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <FloatingDecoration speed="slow" top="10%" right="5%" opacity={0.06} delay={0}>
                <CoinShape size={40} className="text-primary" />
              </FloatingDecoration>
              <FloatingDecoration speed="medium" top="30%" left="3%" opacity={0.05} delay={1.5}>
                <ChartLineShape size={48} className="text-primary" />
              </FloatingDecoration>
              <FloatingDecoration speed="fast" top="55%" right="8%" opacity={0.04} delay={0.8}>
                <CircleShape size={32} className="text-primary" />
              </FloatingDecoration>
              <FloatingDecoration speed="slow" top="75%" left="6%" opacity={0.07} delay={2}>
                <HexagonShape size={36} className="text-primary" />
              </FloatingDecoration>
              <FloatingDecoration speed="medium" top="85%" right="12%" opacity={0.05} delay={1}>
                <WalletShape size={44} className="text-primary" />
              </FloatingDecoration>
            </div>

            {/* Tab Switcher */}
            <ScrollReveal direction="up">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                tap();
                setActiveTab(value as "balances" | "activity" | "history");
              }}
              className="gap-0"
            >
              <div className="flex items-center justify-center w-full">
                <TabsList data-onboarding-target="dashboard-tabs">
                  {([
                    { key: "balances" as const, label: t('balances.title', 'Balances'), icon: WalletIcon, count: balances.length },
                    { key: "activity" as const, label: t('dashboard.recentActivity', 'Activity'), icon: ActivityIcon, count: activities.length },
                    { key: "history" as const, label: t('history.title', 'History'), icon: HistoryIcon, count: historyActivities.length },
                  ]).map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.key}
                        value={tab.key}
                        data-track-id={`nav:dashboard-tab:${tab.key}`}
                        data-track-event="nav_click"
                        data-track-type="tab"
                        data-track-category="navigation"
                        data-track-flow="dashboard"
                        data-track-step={tab.key}
                        className="gap-2 px-4"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                              activeTab === tab.key
                                ? "bg-primary/10 text-primary"
                                : "bg-muted-foreground/10 text-muted-foreground"
                            )}
                          >
                            {tab.count}
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </Tabs>
            </ScrollReveal>

            {/* Tab Content */}
            <div className="mt-6">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: directionRef.current > 0 ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: directionRef.current > 0 ? -20 : 20 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="space-y-4"
                >
                  {activeTab === "balances" && (
                    <>
                      {debtsError && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                          {t('dashboard.errorLoadingDebts', 'Failed to load debts. Please try again.')}
                        </div>
                      )}
                      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                        <BalanceTable
                          balances={balances}
                          disabled={isGuest}
                          showHistory={false}
                          showExpenseBreakdown={true}
                          isLoading={!!identity?.id && debtsLoading}
                        />
                      </div>
                    </>
                  )}

                  {activeTab === "activity" && (
                    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
                      <EnhancedActivityList
                        activities={activities}
                        currentUserId={identity?.id || ""}
                        currency="VND"
                        isLoading={activitiesLoading}
                        showSummary={false}
                        showFilters={true}
                        showSort={true}
                        showTimeGrouping={true}
                        showActions={false}
                        variant="dashboard"
                        compactControls={true}
                        paginationMode="pagination"
                        pageSize={10}
                      />
                    </div>
                  )}

                  {activeTab === "history" && (
                    <Tabs
                      value={historyView}
                      onValueChange={(value) => setHistoryView(value as "transactions" | "people")}
                      className="space-y-4"
                    >
                      <TabsList className="grid w-full grid-cols-2 rounded-lg md:w-fit md:min-w-[320px]">
                        <TabsTrigger value="transactions" className="rounded-md">
                          {t("history.transactions", "Giao dịch")}
                        </TabsTrigger>
                        <TabsTrigger value="people" className="rounded-md">
                          {t("history.byPerson", "Theo người")}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="transactions" className="mt-0">
                        <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                          <HistoryLedgerList
                            activities={historyActivities}
                            currentUserId={identity?.id || ""}
                            isLoading={historyActivitiesLoading}
                            pageSize={10}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="people" className="mt-0">
                        <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                          <SettledHistoryList
                            debts={historyDebts}
                            isLoading={historyLoading}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </PageContent>
        </PageContainer>

      <FloatingActionButton disabled={isGuest} />
    </>
  );
};
