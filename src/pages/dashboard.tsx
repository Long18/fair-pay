import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
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
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageContent } from "@/components/ui/page-content";
import { useAggregatedDebts } from "@/hooks/balance/use-aggregated-debts";
import { useEnhancedActivity } from "@/hooks/use-enhanced-activity";
import { usePersistedState } from "@/hooks/settings/use-persisted-state";
import { useTranslation } from "react-i18next";
import { DashboardTracker } from "@/lib/analytics/index";
import { journeyTracking } from "@/lib/journey-tracking";
import { CACHE_CONFIG } from "@/lib/cache-config";
import { WalletIcon, ActivityIcon, HistoryIcon } from "@/components/ui/icons";
import {
  BALANCE_TABLE_GLASS_PANEL,
  BALANCE_TABLE_GLASS_PANEL_WITH_NOTCH,
} from "@/components/dashboard/balance/balance-table-surface";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollRevealStack, StorySection } from "@/lib/motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ensureScrollTrigger } from "@/lib/motion/gsap-scroll";
import { FloatingDecoration } from "@/components/ui/floating-decoration";
import { CoinShape, ChartLineShape, CircleShape, HexagonShape, WalletShape } from "@/components/ui/decorative-shapes";
import { GuestLandingHero } from "@/components/landing";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useDashboardParallelLoad } from "@/hooks/dashboard/use-dashboard-parallel-load";

const DashboardPond = lazy(() =>
  import("@/components/pond-hero").then((m) => ({ default: m.DashboardPond })),
);

export const Dashboard = () => {
  const { data: identity, isLoading: identityLoading } = useGetIdentity<Profile>();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [activeTab, setActiveTab] = usePersistedState<"balances" | "activity" | "history">("dashboard-tab", "balances");
  const [historyView, setHistoryView] = usePersistedState<"transactions" | "people">(
    "dashboard-history-view",
    "transactions"
  );
  const [mobilePondEnabled, setMobilePondEnabled] = usePersistedState(
    "dashboard-mobile-pond-enabled",
    false,
  );
  const [loading, setLoading] = useState(true);
  const visibilityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefetchTimeRef = useRef<number>(0);

  const showDashboardPond = !isMobile || mobilePondEnabled;

  const { historyPrefetchReady } = useDashboardParallelLoad({
    userId: identity?.id,
    isMobile,
  });

  useEffect(() => {
    if (!showDashboardPond || !isMobile) return;
    void import("@/components/pond-hero");
  }, [showDashboardPond, isMobile]);

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
  const historyDataEnabled =
    !!identity?.id && (activeTab === "history" || historyPrefetchReady);

  const { data: historyDebts = [], isLoading: historyLoading } = useAggregatedDebts({
    includeHistory: true,
    enabled: historyDataEnabled,
  });

  // Load recent activity in parallel with balances (same mount) so tab badges and Activity tab are ready.
  const {
    activities,
    isLoading: activitiesLoading
  } = useEnhancedActivity({ limit: 50, enabled: !!identity?.id });
  const {
    activities: historyActivities,
    isLoading: historyActivitiesLoading,
  } = useEnhancedActivity({ limit: "all", enabled: historyDataEnabled });

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
    if (loading || debtsLoading || activitiesLoading) return;
    ensureScrollTrigger();
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [loading, activeTab, debtsLoading, activitiesLoading]);

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

  if (isGuest) {
    return (
      <PageContainer padding="none" variant="default">
        <PageContent>
          <GuestLandingHero />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer padding="none" variant="default">

          <PageContent
            className="relative dashboard-story-scroll"
          >
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

            <StorySection tight className="flex flex-col justify-start gap-4">
            {/* Tab Switcher — above fold; shell + brand curtain handle first paint */}
            <Tabs
              variant="pill"
              value={activeTab}
              onValueChange={(value) => {
                tap();
                const tab = value as "balances" | "activity" | "history";
                journeyTracking.trackEvent({
                  event_name: "dashboard_tab_changed",
                  event_category: "dashboard",
                  page_path: window.location.pathname,
                  flow_name: "dashboard",
                  step_name: tab,
                  properties: { tab },
                });
                setActiveTab(tab);
              }}
              className="gap-4"
            >
              <div className="flex w-full items-center justify-center px-1 sm:px-0">
                <TabsList
                  data-onboarding-target="dashboard-tabs"
                  aria-label={t("dashboard.tabsLabel", "Dashboard sections")}
                  className="grid h-auto w-full max-w-md grid-cols-3 gap-1 overflow-hidden rounded-xl border border-border bg-muted/40 p-1 sm:max-w-lg sm:min-w-[320px]"
                >
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
                        aria-label={tab.label}
                        className="min-h-9 gap-1 rounded-md px-1.5 text-[10px] focus-visible:ring-offset-0 sm:min-h-10 sm:gap-1.5 sm:px-2 sm:text-xs"
                      >
                        <Icon className="size-3.5 shrink-0 sm:size-4" />
                        <span className="truncate">{tab.label}</span>
                        {tab.count > 0 && (
                          <span className="ml-0.5 shrink-0 rounded-full bg-primary/10 px-1 py-0 text-[9px] leading-4 text-primary tabular-nums sm:px-1.5 sm:text-[10px]">
                            {tab.count}
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </Tabs>

            {/* Tab Content */}
            <div className="mt-2 sm:mt-3">
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
                    <div className="flex flex-col gap-4">
                      {debtsError && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                          {t('dashboard.errorLoadingDebts', 'Failed to load debts. Please try again.')}
                        </div>
                      )}
                      <ScrollRevealStack direction="up" parallax parallaxDistance={40}>
                      <section
                        className={BALANCE_TABLE_GLASS_PANEL_WITH_NOTCH}
                        aria-label={t("balances.title", "Balances")}
                      >
                        <BalanceTable
                          balances={balances}
                          disabled={isGuest}
                          showHistory={false}
                          showExpenseBreakdown={true}
                          isLoading={!!identity?.id && debtsLoading}
                        />
                      </section>
                      </ScrollRevealStack>
                      {showDashboardPond ? (
                        <Suspense fallback={null}>
                          <DashboardPond className="mt-8 border-t border-border/40 pt-8 md:mt-10 md:pt-10" />
                        </Suspense>
                      ) : isMobile ? (
                        <div className="mt-8 border-t border-border/40 pt-8 text-center">
                          <p className="mb-3 text-xs text-muted-foreground px-4">
                            {t(
                              "dashboard.pond.mobileOptInHint",
                              "Hiệu ứng ao vịt dùng GPU — bật nếu máy bạn ổn định.",
                            )}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-10"
                            onClick={() => {
                              tap();
                              setMobilePondEnabled(true);
                            }}
                          >
                            {t("dashboard.pond.mobileOptInCta", "Bật hiệu ứng ao")}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {activeTab === "activity" && (
                    <ScrollRevealStack direction="up" parallax>
                    <section
                      className={BALANCE_TABLE_GLASS_PANEL_WITH_NOTCH}
                      aria-label={t("dashboard.recentActivity", "Recent Activity")}
                    >
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
                    </section>
                    </ScrollRevealStack>
                  )}

                  {activeTab === "history" && (
                    <ScrollRevealStack direction="up" parallax>
                    <Tabs
                      variant="pill"
                      value={historyView}
                      onValueChange={(value) => setHistoryView(value as "transactions" | "people")}
                      className="gap-4"
                    >
                      <div className="flex w-full items-center justify-center px-1 sm:px-0">
                        <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 overflow-hidden rounded-xl border border-border bg-muted/40 p-1 sm:w-auto sm:min-w-[320px]">
                          <TabsTrigger
                            value="transactions"
                            className="min-h-9 rounded-md px-3 text-xs focus-visible:ring-offset-0 sm:text-sm"
                          >
                            {t("history.transactions", "Giao dịch")}
                          </TabsTrigger>
                          <TabsTrigger
                            value="people"
                            className="min-h-9 rounded-md px-3 text-xs focus-visible:ring-offset-0 sm:text-sm"
                          >
                            {t("history.byPerson", "Theo người")}
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="transactions" className="mt-0">
                        <section
                          className={BALANCE_TABLE_GLASS_PANEL}
                          aria-label={t("history.transactions", "Transactions")}
                        >
                          <HistoryLedgerList
                            activities={historyActivities}
                            currentUserId={identity?.id || ""}
                            isLoading={historyActivitiesLoading}
                            pageSize={10}
                          />
                        </section>
                      </TabsContent>

                      <TabsContent value="people" className="mt-0">
                        <section
                          className={BALANCE_TABLE_GLASS_PANEL}
                          aria-label={t("history.byPerson", "By person")}
                        >
                          <SettledHistoryList
                            debts={historyDebts}
                            isLoading={historyLoading}
                          />
                        </section>
                      </TabsContent>
                    </Tabs>
                    </ScrollRevealStack>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            </StorySection>
          </PageContent>
        </PageContainer>

      <FloatingActionButton disabled={isGuest} />
    </>
  );
};
