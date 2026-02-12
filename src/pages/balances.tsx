import React, { useMemo, useState, useRef } from "react";
import { useGetIdentity, useGo, useList } from "@refinedev/core";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

// Hooks – balance & debts
import { useAggregatedDebts, type AggregatedDebt } from "@/hooks/use-aggregated-debts";
import { useBalance } from "@/hooks/useBalance";
import { usePersistedState } from "@/hooks/use-persisted-state";

// Hooks – spending / reports
import {
  DateRange as DateRangeType,
  DateRangePreset,
  useSpendingSummary,
} from "@/hooks/use-spending-summary";
import { useCategoryBreakdown } from "@/hooks/use-category-breakdown";
import { useSpendingTrend } from "@/hooks/use-spending-trend";
import { useSpendingComparison } from "@/hooks/use-spending-comparison";
import { useTopCategories } from "@/hooks/use-top-categories";
import { useTopSpenders } from "@/hooks/use-top-spenders";
import { useSpendingInsights } from "@/hooks/use-spending-insights";

// Layout primitives
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { PageContent } from "@/components/ui/page-content";

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Report chart components (DO NOT modify)
import {
  CategoryPieChart,
  SpendingTrendChart,
  SpendingSummaryStats,
} from "@/components/reports";
import { BarChart } from "@/components/reports/bar-chart";
import { ComparisonChart } from "@/components/reports/comparison-chart";
import { CategoryBreakdownTable } from "@/components/reports/category-breakdown-table";
import { InsightsPanel } from "@/components/reports/insights-panel";
import { TopSpenders } from "@/components/reports/top-spenders";

// Dashboard components (DO NOT modify)
import { SimplifiedDebts } from "@/components/dashboard/simplified-debts";

// Types & utilities
import { Profile } from "@/modules/profile/types";
import { Group } from "@/modules/groups/types";
import { formatNumber } from "@/lib/locale-utils";
import { exportEnhancedReportToCSV } from "@/utils/export-csv-enhanced";
import { exportToPDF } from "@/utils/export-pdf";

// Icons
import {
  RefreshCwIcon,
  AlertCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircle2Icon,
  PlusIcon,
  DownloadIcon,
  FileTextIcon,
  CalendarIcon,
  ActivityIcon,
  TrendingUpIcon,
  FilterIcon,
} from "@/components/ui/icons";

import { dispatchSettlementEvent } from "@/lib/settlement-events";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SortField = "amount" | "name";
type SortDirection = "asc" | "desc";
type MergedTab = "charts" | "breakdown" | "balances" | "spenders";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDateRangeForPreset(preset: DateRangePreset): DateRangeType {
  const now = new Date();
  switch (preset) {
    case "this_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case "this_year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31),
      };
    case "last_year":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31),
      };
    case "all_time":
      return { start: new Date(2020, 0, 1), end: now };
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Unified Reports & Balances page.
 *
 * Merges all functionality from the former ReportsPage and BalancesPage into
 * a single view at /balances.  A shared date-range filter drives both the
 * spending-analytics charts and the balance/settlement cards.
 *
 * @deprecated reports.tsx – functionality migrated here.
 */
export const BalancesPage = () => {
  // ── identity & navigation ──────────────────────────────────────────────
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const { t } = useTranslation();
  const chartsRef = useRef<HTMLDivElement>(null);

  // ── filter state (from reports) ────────────────────────────────────────
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customRange, setCustomRange] = useState<DateRange>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [showComparison, setShowComparison] = useState(false);

  // ── balances state ─────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("amount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [settleAllDialogOpen, setSettleAllDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [activeTab, setActiveTab] = usePersistedState<MergedTab>(
    "balances-merged-tab",
    "charts"
  );
  // sub-tab inside the Balances tab
  const [balancesSubTab, setBalancesSubTab] = usePersistedState<"you-owe" | "owed-to-you">(
    "balances-sub-tab",
    "you-owe"
  );

  // ── derived date range ─────────────────────────────────────────────────
  const dateRange: DateRangeType | undefined =
    customRange?.from && customRange?.to
      ? { start: customRange.from, end: customRange.to }
      : undefined;

  const actualDateRange = useMemo(
    () => dateRange || getDateRangeForPreset(preset),
    [dateRange, preset]
  );

  // ── groups list ────────────────────────────────────────────────────────
  const { query: groupsQuery } = useList<Group>({
    resource: "groups",
    pagination: { mode: "off" },
    meta: { select: "id, name" },
  });
  const groups = groupsQuery.data?.data || [];

  // ── spending / reports hooks ───────────────────────────────────────────
  const { summary, isLoading: summaryLoading } = useSpendingSummary(
    preset,
    dateRange,
    selectedGroupId
  );
  const { breakdown, isLoading: breakdownLoading } = useCategoryBreakdown(
    preset,
    dateRange,
    selectedGroupId
  );
  const { trend, isLoading: trendLoading } = useSpendingTrend(
    preset,
    dateRange,
    selectedGroupId
  );
  const { data: comparison, isLoading: comparisonLoading } = useSpendingComparison({
    currentStart: actualDateRange.start,
    currentEnd: actualDateRange.end,
    groupId: selectedGroupId,
  });
  const { data: topCategories, isLoading: topCategoriesLoading } = useTopCategories({
    startDate: actualDateRange.start,
    endDate: actualDateRange.end,
    groupId: selectedGroupId,
    limit: 10,
  });
  const { data: topSpenders = [], isLoading: topSpendersLoading } = useTopSpenders({
    groupId: selectedGroupId || "",
    startDate: actualDateRange.start,
    endDate: actualDateRange.end,
    limit: 10,
  });
  const { insights, isLoading: insightsLoading } = useSpendingInsights({
    preset,
    customRange: dateRange,
    groupId: selectedGroupId,
  });

  // ── balance / debts hooks (dateRange wired; server-side filtering pending) ─
  const { data: debts = [], isLoading: debtsLoading, error: debtsError, refetch } = useAggregatedDebts({
    dateRange: dateRange,
  });
  const { totalOwedToMe, totalIOwe, netBalance, refetch: refetchBalance } = useBalance();

  // ── derived balance data ───────────────────────────────────────────────
  const sortedDebts = useMemo(() => {
    const sorted = [...debts];
    sorted.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortField === "amount") {
        aVal = a.amount;
        bVal = b.amount;
      } else {
        aVal = a.counterparty_name.toLowerCase();
        bVal = b.counterparty_name.toLowerCase();
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [debts, sortField, sortDirection]);

  const iOwe = sortedDebts.filter((d: AggregatedDebt) => d.i_owe_them);
  const owedToMe = sortedDebts.filter((d: AggregatedDebt) => !d.i_owe_them);

  // ── aggregate loading flags ───────────────────────────────────────────
  const isReportsLoading =
    summaryLoading || breakdownLoading || trendLoading || comparisonLoading || topCategoriesLoading || insightsLoading;
  const isBalancesLoading = debtsLoading;

  // ── handlers ───────────────────────────────────────────────────────────
  const handlePresetChange = (value: string) => {
    setPreset(value as DateRangePreset);
    if (value !== "custom") setCustomRange(undefined);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchBalance()]);
      toast.success(t("balances.refreshSuccess", "Balances refreshed successfully"));
    } catch {
      toast.error(t("balances.refreshError", "Failed to refresh balances"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSettleAll = async () => {
    if (!identity?.id || iOwe.length === 0) return;
    setIsSettling(true);
    try {
      const { supabaseClient } = await import("@/utility/supabaseClient");
      const settleableDebts = iOwe.filter((debt) => debt.counterparty_id != null);
      await Promise.all(
        settleableDebts.map((debt) =>
          supabaseClient.rpc("settle_all_debts_with_person", {
            p_counterparty_id: debt.counterparty_id,
          })
        )
      );
      toast.success(t("balances.settleAllSuccess", "All debts settled successfully"));
      setSettleAllDialogOpen(false);
      dispatchSettlementEvent();
      refetch();
      refetchBalance();
    } catch {
      toast.error(t("balances.settleAllError", "Failed to settle all debts"));
    } finally {
      setIsSettling(false);
    }
  };

  // ── export handlers ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    exportEnhancedReportToCSV(
      {
        summary: [
          { label: "Total Spent", value: `${summary.totalSpent} ₫` },
          { label: "Total Received", value: `${summary.totalReceived} ₫` },
          { label: "Net Balance", value: `${summary.netBalance} ₫` },
          { label: "Expense Count", value: `${summary.expenseCount}` },
          { label: "Average Expense", value: `${summary.averageExpense} ₫` },
          { label: "You Owe", value: `${totalIOwe} ₫` },
          { label: "Owed to You", value: `${totalOwedToMe} ₫` },
        ],
        categoryBreakdown: breakdown,
        trendData: trend.map((item) => ({
          period: item.label,
          amount: item.amount,
          count: item.count,
        })),
        topSpenders: selectedGroupId
          ? topSpenders.map((s) => ({
              name: s.user_name,
              amount: s.total_spent,
              count: s.expense_count,
              percentage: s.percentage,
            }))
          : undefined,
      },
      `reports-balances-${format(new Date(), "yyyy-MM-dd")}`
    );
  };

  const handleExportPDF = async () => {
    const chartElements: HTMLElement[] = [];
    if (chartsRef.current) {
      chartsRef.current.querySelectorAll("[data-chart]").forEach((el) => {
        if (el instanceof HTMLElement) chartElements.push(el);
      });
    }
    await exportToPDF({
      title: "Reports & Balances",
      dateRange: actualDateRange,
      chartElements,
      summary: [
        { label: "Total Spent", value: `${summary.totalSpent} ₫` },
        { label: "Total Received", value: `${summary.totalReceived} ₫` },
        { label: "Net Balance", value: `${summary.netBalance} ₫` },
        { label: "Expense Count", value: `${summary.expenseCount}` },
        { label: "Average Expense", value: `${Math.round(summary.averageExpense)} ₫` },
        { label: "You Owe", value: `${totalIOwe} ₫` },
        { label: "Owed to You", value: `${totalOwedToMe} ₫` },
      ],
      tables: [
        {
          title: "Category Breakdown",
          headers: ["Category", "Amount", "Count", "Percentage"],
          rows: breakdown.map((item) => [
            item.category,
            `${item.amount} ₫`,
            `${item.count}`,
            `${item.percentage.toFixed(2)}%`,
          ]),
        },
      ],
    });
  };

  // Determine whether Top Spenders tab should be visible
  const showSpenders = !!selectedGroupId;

  // If user is on "spenders" tab but group is deselected, fall back to charts
  React.useEffect(() => {
    if (activeTab === "spenders" && !showSpenders) {
      setActiveTab("charts");
    }
  }, [activeTab, showSpenders, setActiveTab]);

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <PageContainer variant="default" withBackground fullHeight>
      {/* ──────────────────────────────────────────────────────────────────
          PAGE HEADER – title row with refresh + export actions
      ────────────────────────────────────────────────────────────────── */}
      <PageHeader
        title={t("balances.reportsAndBalancesTitle", "Insights")}
        description={t(
          "balances.reportsAndBalancesDescription",
          "Spending analytics and balance overview"
        )}
        titleId="balances-page-title"
        descriptionId="balances-page-description"
        action={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleExportCSV}
              variant="ghost"
              size="sm"
              disabled={isReportsLoading || breakdown.length === 0}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              aria-label={t("reports.exportCSV", "Export CSV")}
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">CSV</span>
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="ghost"
              size="sm"
              disabled={isReportsLoading || breakdown.length === 0}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              aria-label={t("reports.exportPDF", "Export PDF")}
            >
              <FileTextIcon className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isBalancesLoading}
              className="gap-2"
              aria-label={t("balances.refresh", "Refresh")}
              aria-describedby="balances-page-description"
            >
              <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="hidden sm:inline text-xs">{t("balances.refresh", "Refresh")}</span>
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* ──────────────────────────────────────────────────────────────
            ERROR BANNER
        ────────────────────────────────────────────────────────────── */}
        {debtsError && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {t("balances.loadError", "Failed to load balances. Please try refreshing the page.")}
            </AlertDescription>
          </Alert>
        )}

        {/* ──────────────────────────────────────────────────────────────
            FILTER TOOLBAR – compact horizontal bar
        ────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FilterIcon className="h-4 w-4" />
            <span>{t("reports.filters", "Filters")}</span>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {/* Time Period */}
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger
                id="time-period"
                className="h-8 w-auto min-w-[130px] text-xs border-border bg-card rounded-lg px-3 shadow-none focus:ring-1 focus:ring-primary/30"
              >
                <CalendarIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom date picker – only when "custom" preset */}
            {preset === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant="outline"
                    className={cn(
                      "h-8 text-xs justify-start font-normal rounded-lg shadow-none border-border focus:ring-1 focus:ring-primary/30",
                      !customRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    {customRange?.from ? (
                      customRange.to ? (
                        <>
                          {format(customRange.from, "dd MMM", { locale: vi })} – {format(customRange.to, "dd MMM yyyy", { locale: vi })}
                        </>
                      ) : (
                        format(customRange.from, "dd MMM yyyy", { locale: vi })
                      )
                    ) : (
                      <span>Pick dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customRange?.from}
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={2}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Group */}
            <Select
              value={selectedGroupId || "all"}
              onValueChange={(v) => setSelectedGroupId(v === "all" ? undefined : v)}
            >
              <SelectTrigger
                id="group-select"
                className="h-8 w-auto min-w-[110px] text-xs border-border bg-card rounded-lg px-3 shadow-none focus:ring-1 focus:ring-primary/30"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Chart Type – only relevant on charts tab */}
            {activeTab === "charts" && (
              <Select value={chartType} onValueChange={(v) => setChartType(v as "pie" | "bar")}>
                <SelectTrigger
                  id="chart-type"
                  className="h-8 w-auto min-w-[100px] text-xs border-border bg-card rounded-lg px-3 shadow-none focus:ring-1 focus:ring-primary/30"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Comparison toggle – only relevant on charts tab */}
            {activeTab === "charts" && (
              <div className="flex items-center gap-2 ml-auto sm:ml-2 pl-3 border-l border-border">
                <Label htmlFor="show-comparison" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  {t("reports.showComparison", "Compare")}
                </Label>
                <Switch
                  id="show-comparison"
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                  className="h-4 w-7"
                />
              </div>
            )}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────
            LOADING SKELETONS (reports section)
        ────────────────────────────────────────────────────────────── */}
        {isReportsLoading && (
          <>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-sm animate-pulse">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-7 w-7 rounded-lg" />
                    </div>
                    <Skeleton className="h-7 w-28 mb-2" />
                    <Skeleton className="h-2.5 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i} className="border-0 shadow-sm animate-pulse">
                  <CardContent className="pt-5 pb-4">
                    <Skeleton className="h-4 w-36 mb-1.5" />
                    <Skeleton className="h-3 w-24 mb-4" />
                    <Skeleton className="h-[280px] w-full rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* ──────────────────────────────────────────────────────────────
            MAIN TABBED CONTENT
        ────────────────────────────────────────────────────────────── */}
        {!isReportsLoading && (
          <>
            {/* Spending summary stats row */}
            <SpendingSummaryStats summary={summary} />

            {/* Period comparison (conditional) */}
            {showComparison && (
              <ComparisonChart data={comparison} isLoading={comparisonLoading} />
            )}

            {/* Insights panel */}
            <InsightsPanel insights={insights} isLoading={insightsLoading} />

            {/* Tabs – underline style via custom overrides */}
            <div ref={chartsRef}>
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as MergedTab)}
                className="space-y-4 md:space-y-6"
              >
                {/* Custom tab header: pills on left, export on right */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <TabsList className="bg-transparent p-0 h-auto border-b border-border rounded-none w-full sm:w-auto">
                    <TabsTrigger
                      value="charts"
                      className="text-xs sm:text-sm px-4 py-2.5 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent transition-colors duration-200"
                    >
                      {t("reports.charts", "Charts")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="breakdown"
                      className="text-xs sm:text-sm px-4 py-2.5 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent transition-colors duration-200"
                    >
                      {t("reports.breakdown", "Breakdown")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="balances"
                      className="text-xs sm:text-sm px-4 py-2.5 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent transition-colors duration-200"
                    >
                      {t("balances.title", "Balances")}
                      {debts.length > 0 && (
                        <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5">
                          {debts.length}
                        </span>
                      )}
                    </TabsTrigger>
                    {showSpenders && (
                      <TabsTrigger
                        value="spenders"
                        className="text-xs sm:text-sm px-4 py-2.5 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent transition-colors duration-200"
                      >
                        {t("reports.topSpenders", "Top Spenders")}
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                {/* ─── Charts Tab ──────────────────────────────────── */}
                <TabsContent value="charts" className="space-y-4 md:space-y-6 mt-2 animate-fade-in">
                  {breakdown.length === 0 ? (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="py-16 text-center">
                        <div className="space-y-3 max-w-sm mx-auto">
                          <div className="flex justify-center">
                            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                              <ActivityIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {t("reports.noSpendingData", "No spending data")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("reports.noSpendingDataHint", "Try adjusting the time period or group filter")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                      <div data-chart className="w-full">
                        {chartType === "pie" ? (
                          <CategoryPieChart data={breakdown} />
                        ) : (
                          <BarChart
                            data={breakdown.map((item) => ({
                              label: item.category,
                              value: item.amount,
                            }))}
                            title="Spending by Category"
                          />
                        )}
                      </div>
                      <div data-chart className="w-full">
                        {trend.length === 0 ? (
                          <Card className="border-0 shadow-sm">
                            <CardContent className="py-16 text-center">
                              <div className="space-y-3 max-w-sm mx-auto">
                                <div className="flex justify-center">
                                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                                    <TrendingUpIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                </div>
                                <p className="text-sm font-medium text-foreground">
                                  {t("reports.noTrendData", "No trend data")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("reports.noTrendDataHint", "Trend data appears after multiple periods of activity")}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <SpendingTrendChart data={trend} />
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ─── Breakdown Tab ─────────────────────────────────── */}
                <TabsContent value="breakdown" className="mt-2 animate-fade-in">
                  {topCategories && topCategories.length === 0 && !topCategoriesLoading ? (
                    <Card className="border-0 shadow-sm">
                      <CardContent className="py-16 text-center">
                        <div className="space-y-3 max-w-sm mx-auto">
                          <div className="flex justify-center">
                            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center">
                              <ActivityIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {t("reports.noBreakdownData", "No category data")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("reports.noBreakdownDataHint", "Try a different date range to see category breakdowns")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <CategoryBreakdownTable data={topCategories} isLoading={topCategoriesLoading} />
                  )}
                </TabsContent>

                {/* ─── Balances Tab ──────────────────────────────────── */}
                <TabsContent value="balances" className="space-y-4 mt-2 animate-fade-in">
                  {isBalancesLoading ? (
                    <Card className="border-0 shadow-sm animate-pulse">
                      <CardContent className="pt-5 space-y-4">
                        <Skeleton className="h-4 w-32" />
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3 py-2">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-3.5 w-3/4" />
                              <Skeleton className="h-2.5 w-1/2" />
                            </div>
                            <Skeleton className="h-3.5 w-16" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : debts.length === 0 ? (
                    /* empty / all settled – congratulations state */
                    <Card className="border-0 shadow-sm">
                      <CardContent className="py-20 text-center">
                        <div className="space-y-4 max-w-sm mx-auto">
                          <div className="flex justify-center">
                            <div className="h-20 w-20 rounded-2xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                              <span className="text-4xl">🎉</span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                              {t("balances.congratsDebtFree", "Chúc mừng, bạn đã hết nợ!")}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t("balances.noOneOwesYou", "Không ai đang nợ bạn và bạn cũng không nợ ai.")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* sub-tabs: You Owe / Owed to You */
                    <Tabs
                      value={balancesSubTab}
                      onValueChange={(v) => setBalancesSubTab(v as "you-owe" | "owed-to-you")}
                      className="space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <TabsList className="bg-muted/60 dark:bg-muted/40 rounded-lg p-0.5 h-auto w-full sm:w-auto">
                          <TabsTrigger
                            value="you-owe"
                            className="text-xs sm:text-sm rounded-md data-[state=active]:shadow-sm transition-all duration-200"
                          >
                            {t("balances.youOwe", "You Owe")}
                            {iOwe.length > 0 && (
                              <span className="ml-1.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-full px-1.5 py-0.5">
                                {iOwe.length}
                              </span>
                            )}
                          </TabsTrigger>
                          <TabsTrigger
                            value="owed-to-you"
                            className="text-xs sm:text-sm rounded-md data-[state=active]:shadow-sm transition-all duration-200"
                          >
                            {t("balances.owedToYou", "Owed to You")}
                            {owedToMe.length > 0 && (
                              <span className="ml-1.5 text-xs bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400 rounded-full px-1.5 py-0.5">
                                {owedToMe.length}
                              </span>
                            )}
                          </TabsTrigger>
                        </TabsList>

                        {/* Sort selector */}
                        <Select
                          value={`${sortField}-${sortDirection}`}
                          onValueChange={(value) => {
                            const [field, dir] = value.split("-") as [SortField, SortDirection];
                            setSortField(field);
                            setSortDirection(dir);
                          }}
                        >
                          <SelectTrigger
                            className="w-full sm:w-[140px] h-8 text-xs border-border bg-card rounded-lg shadow-none"
                            aria-label={t("balances.sortBy", "Sort by")}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount-desc">
                              <div className="flex items-center gap-1.5">
                                {t("balances.amount", "Amount")}
                                <ArrowDownIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </SelectItem>
                            <SelectItem value="amount-asc">
                              <div className="flex items-center gap-1.5">
                                {t("balances.amount", "Amount")}
                                <ArrowUpIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </SelectItem>
                            <SelectItem value="name-asc">
                              <div className="flex items-center gap-1.5">
                                {t("balances.name", "Name")}
                                <ArrowUpIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </SelectItem>
                            <SelectItem value="name-desc">
                              <div className="flex items-center gap-1.5">
                                {t("balances.name", "Name")}
                                <ArrowDownIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* You Owe sub-tab */}
                      <TabsContent value="you-owe" className="space-y-3 mt-0">
                        {iOwe.length > 0 ? (
                          <>
                            {/* Settle All banner */}
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/20 dark:to-transparent border border-red-100 dark:border-red-900/30">
                              <p className="text-sm text-foreground">
                                <span className="text-muted-foreground">{t("balances.youOweTotal", "You owe")}</span>{" "}
                                <span className="font-bold tabular-nums text-red-600 dark:text-red-400">
                                  {formatNumber(totalIOwe)} ₫
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  {t("balances.toPeople", "to {{count}} people", { count: iOwe.length })}
                                </span>
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSettleAllDialogOpen(true)}
                                className="gap-1.5 h-8 text-xs shrink-0 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800/40 dark:text-green-400 dark:hover:bg-green-950/30"
                                aria-label={t("balances.settleAll", "Settle All")}
                              >
                                <CheckCircle2Icon className="h-3.5 w-3.5" />
                                {t("balances.settleAll", "Settle All")}
                              </Button>
                            </div>
                            <SimplifiedDebts debts={iOwe} isLoading={isBalancesLoading} />
                          </>
                        ) : (
                          <Card className="border-0 shadow-sm">
                            <CardContent className="py-12 text-center">
                              <div className="space-y-2.5">
                                <div className="flex justify-center">
                                  <div className="h-12 w-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                                    <CheckCircle2Icon className="h-5.5 w-5.5 text-green-500 dark:text-green-400" />
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {t("balances.youDontOweAnyone", "You don't owe anyone")}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      {/* Owed to You sub-tab */}
                      <TabsContent value="owed-to-you" className="space-y-3 mt-0">
                        {owedToMe.length > 0 ? (
                          <SimplifiedDebts debts={owedToMe} isLoading={isBalancesLoading} />
                        ) : (
                          <Card className="border-0 shadow-sm">
                            <CardContent className="py-12 text-center">
                              <div className="space-y-2.5">
                                <div className="flex justify-center">
                                  <div className="h-12 w-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                                    <CheckCircle2Icon className="h-5.5 w-5.5 text-green-500 dark:text-green-400" />
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {t("balances.noOneOwesYou", "No one owes you")}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </TabsContent>

                {/* ─── Top Spenders Tab (group-gated) ────────────────── */}
                {showSpenders && (
                  <TabsContent value="spenders" className="mt-2 animate-fade-in">
                    <TopSpenders data={topSpenders} isLoading={topSpendersLoading} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </>
        )}

        {/* ──────────────────────────────────────────────────────────────
            SETTLE ALL DIALOG
        ────────────────────────────────────────────────────────────── */}
        <AlertDialog open={settleAllDialogOpen} onOpenChange={setSettleAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("balances.settleAllTitle", "Settle All Debts?")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("balances.settleAllDescription", {
                  count: iOwe.length,
                  amount: formatNumber(totalIOwe),
                  defaultValue: `Are you sure you want to settle all ${iOwe.length} debts totaling ₫${formatNumber(totalIOwe)}? This action cannot be undone.`,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSettling}>
                {t("common.cancel", "Cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSettleAll}
                disabled={isSettling}
                className="bg-primary text-primary-foreground"
              >
                {isSettling ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                    {t("balances.settling", "Settling...")}
                  </>
                ) : (
                  t("balances.confirmSettle", "Settle All")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContent>
    </PageContainer>
  );
};
