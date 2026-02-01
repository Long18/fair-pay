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
} from "@/components/ui/icons";

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
      await Promise.all(
        iOwe.map((debt) =>
          supabaseClient.rpc("settle_all_debts_with_person", {
            p_counterparty_id: debt.counterparty_id,
          })
        )
      );
      toast.success(t("balances.settleAllSuccess", "All debts settled successfully"));
      setSettleAllDialogOpen(false);
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
        { label: "Average Expense", value: `${summary.averageExpense.toFixed(2)} ₫` },
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
      <PageHeader
        title={t("balances.reportsAndBalancesTitle", "Reports & Balances")}
        description={t(
          "balances.reportsAndBalancesDescription",
          "Unified spending analytics and balance overview"
        )}
        titleId="balances-page-title"
        descriptionId="balances-page-description"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isBalancesLoading}
            className="gap-2 w-full sm:w-auto"
            aria-label={t("balances.refresh", "Refresh")}
            aria-describedby="balances-page-description"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {t("balances.refresh", "Refresh")}
          </Button>
        }
      />

      <PageContent>
        {/* ----------------------------------------------------------------
            FILTER CARD
        ---------------------------------------------------------------- */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">
              {t("reports.filters", "Filters")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Time Period */}
              <div className="space-y-2">
                <Label htmlFor="time-period" className="text-xs sm:text-sm font-medium">
                  {t("reports.timePeriod", "Time Period")}
                </Label>
                <Select value={preset} onValueChange={handlePresetChange}>
                  <SelectTrigger id="time-period" className="h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="all_time">All Time</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom date picker – only when "custom" preset */}
              {preset === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="date-range" className="text-xs sm:text-sm font-medium">
                    {t("reports.dateRange", "Date Range")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9 text-xs sm:text-sm",
                          !customRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customRange?.from ? (
                          customRange.to ? (
                            <>
                              {format(customRange.from, "dd MMM yyyy", { locale: vi })} –{" "}
                              {format(customRange.to, "dd MMM yyyy", { locale: vi })}
                            </>
                          ) : (
                            format(customRange.from, "dd MMM yyyy", { locale: vi })
                          )
                        ) : (
                          <span>Pick a date</span>
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
                </div>
              )}

              {/* Group */}
              <div className="space-y-2">
                <Label htmlFor="group-select" className="text-xs sm:text-sm font-medium">
                  {t("reports.group", "Group")}
                </Label>
                <Select
                  value={selectedGroupId || "all"}
                  onValueChange={(v) => setSelectedGroupId(v === "all" ? undefined : v)}
                >
                  <SelectTrigger id="group-select" className="h-9 text-xs sm:text-sm">
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
              </div>

              {/* Chart Type */}
              <div className="space-y-2">
                <Label htmlFor="chart-type" className="text-xs sm:text-sm font-medium">
                  {t("reports.chartType", "Chart Type")}
                </Label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as "pie" | "bar")}>
                  <SelectTrigger id="chart-type" className="h-9 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparison toggle */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-comparison" className="text-xs sm:text-sm font-medium cursor-pointer">
                  {t("reports.showComparison", "Show period comparison")}
                </Label>
                <Switch
                  id="show-comparison"
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ----------------------------------------------------------------
            ERROR BANNER
        ---------------------------------------------------------------- */}
        {debtsError && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {t("balances.loadError", "Failed to load balances. Please try refreshing the page.")}
            </AlertDescription>
          </Alert>
        )}

        {/* ----------------------------------------------------------------
            BALANCE SUMMARY CARDS – always visible
        ---------------------------------------------------------------- */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          role="region"
          aria-label={t("balances.summaryCards", "Balance summary")}
        >
          {/* Net Balance */}
          <Card
            className={`border-2 ${
              netBalance > 0
                ? "border-green-500/30 dark:border-green-700/30 bg-green-50 dark:bg-green-950/20"
                : netBalance < 0
                  ? "border-red-500/30 dark:border-red-700/30 bg-red-50 dark:bg-red-950/20"
                  : "border-border bg-muted/20"
            }`}
          >
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t("balances.netBalance", "Net Balance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl md:text-3xl font-bold ${
                  netBalance > 0
                    ? "text-green-600 dark:text-green-400"
                    : netBalance < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                }`}
              >
                {netBalance >= 0 ? "+" : ""}
                {formatNumber(netBalance)} ₫
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {netBalance > 0
                  ? t("balances.youAreOwedOverall", "You are owed overall")
                  : netBalance < 0
                    ? t("balances.youOweOverall", "You owe overall")
                    : t("balances.allSettledUp", "All settled up")}
              </p>
            </CardContent>
          </Card>

          {/* You Owe */}
          <Card className="border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/10">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t("balances.youOwe", "You Owe")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold text-red-600 dark:text-red-400">
                {formatNumber(totalIOwe)} ₫
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("balances.toPeople", {
                  count: iOwe.length,
                  defaultValue: `to ${iOwe.length} ${iOwe.length === 1 ? "person" : "people"}`,
                })}
              </p>
            </CardContent>
          </Card>

          {/* Owed to You */}
          <Card className="border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-950/10">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t("balances.owedToYou", "Owed to You")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                {formatNumber(totalOwedToMe)} ₫
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("balances.fromPeople", {
                  count: owedToMe.length,
                  defaultValue: `from ${owedToMe.length} ${owedToMe.length === 1 ? "person" : "people"}`,
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ----------------------------------------------------------------
            EXPORT BUTTONS
        ---------------------------------------------------------------- */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            disabled={isReportsLoading || breakdown.length === 0}
            className="w-full sm:w-auto"
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            disabled={isReportsLoading || breakdown.length === 0}
            className="w-full sm:w-auto"
          >
            <FileTextIcon className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>

        {/* ----------------------------------------------------------------
            LOADING SKELETONS (reports section)
        ---------------------------------------------------------------- */}
        {isReportsLoading && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-border animate-pulse">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i} className="border-border animate-pulse">
                  <CardHeader className="pb-4">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* ----------------------------------------------------------------
            MAIN TABBED CONTENT
        ---------------------------------------------------------------- */}
        {!isReportsLoading && (
          <>
            {/* Spending summary stats row (from reports) */}
            <SpendingSummaryStats summary={summary} />

            {/* Period comparison (conditional) */}
            {showComparison && (
              <ComparisonChart data={comparison} isLoading={comparisonLoading} />
            )}

            {/* Insights panel */}
            <InsightsPanel insights={insights} isLoading={insightsLoading} />

            {/* Tabs */}
            <div ref={chartsRef}>
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as MergedTab)}
                className="space-y-4 md:space-y-6"
              >
                <TabsList className={`grid w-full ${showSpenders ? "grid-cols-4" : "grid-cols-3"}`}>
                  <TabsTrigger value="charts" className="text-xs sm:text-sm">
                    {t("reports.charts", "Charts")}
                  </TabsTrigger>
                  <TabsTrigger value="breakdown" className="text-xs sm:text-sm">
                    {t("reports.breakdown", "Breakdown")}
                  </TabsTrigger>
                  <TabsTrigger value="balances" className="text-xs sm:text-sm">
                    {t("balances.title", "Balances")}
                  </TabsTrigger>
                  {showSpenders && (
                    <TabsTrigger value="spenders" className="text-xs sm:text-sm">
                      {t("reports.topSpenders", "Top Spenders")}
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* ─── Charts Tab ──────────────────────────────────────── */}
                <TabsContent value="charts" className="space-y-4 md:space-y-6 mt-4">
                  {breakdown.length === 0 ? (
                    <Card className="border-border">
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          {t("reports.noSpendingData", "No spending data for selected period")}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
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
                          <Card className="border-border">
                            <CardContent className="py-12 text-center">
                              <p className="text-muted-foreground">
                                {t("reports.noTrendData", "No trend data available")}
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          <SpendingTrendChart data={trend} />
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ─── Breakdown Tab ───────────────────────────────────── */}
                <TabsContent value="breakdown" className="mt-4">
                  {topCategories && topCategories.length === 0 && !topCategoriesLoading ? (
                    <Card className="border-border">
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          {t("reports.noBreakdownData", "No category data for selected period. Try a different date range.")}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <CategoryBreakdownTable data={topCategories} isLoading={topCategoriesLoading} />
                  )}
                </TabsContent>

                {/* ─── Balances Tab ────────────────────────────────────── */}
                <TabsContent value="balances" className="space-y-4 mt-4">
                  {isBalancesLoading ? (
                    /* skeleton while debts load */
                    <Card className="border-border animate-pulse">
                      <CardHeader>
                        <Skeleton className="h-5 w-40" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : debts.length === 0 ? (
                    /* empty / all settled */
                    <Card className="border-border">
                      <CardContent className="py-16 text-center">
                        <div className="space-y-4 max-w-md mx-auto">
                          <div className="flex justify-center">
                            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                              <CheckCircle2Icon className="h-10 w-10 text-green-600 dark:text-green-400" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold text-foreground">
                              {t("balances.allSettledUp", "All Settled Up!")}
                            </h3>
                            <p className="text-muted-foreground">
                              {t("balances.noOutstandingDebts", "You have no outstanding debts or credits")}
                            </p>
                          </div>
                          {identity && (
                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                              <Button
                                onClick={() => go({ to: "/expenses/create" })}
                                className="gap-2"
                              >
                                <PlusIcon className="h-4 w-4" />
                                {t("balances.addExpense", "Add Expense")}
                              </Button>
                            </div>
                          )}
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
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <TabsList className="grid w-full sm:w-auto grid-cols-2">
                            <TabsTrigger value="you-owe" className="text-xs sm:text-sm">
                              {t("balances.youOwe", "You Owe")}{" "}
                              {iOwe.length > 0 && `(${iOwe.length})`}
                            </TabsTrigger>
                            <TabsTrigger value="owed-to-you" className="text-xs sm:text-sm">
                              {t("balances.owedToYou", "Owed to You")}{" "}
                              {owedToMe.length > 0 && `(${owedToMe.length})`}
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
                              className="w-full sm:w-[160px] h-9 text-xs sm:text-sm"
                              aria-label={t("balances.sortBy", "Sort by")}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount-desc">
                                <div className="flex items-center gap-2">
                                  {t("balances.amount", "Amount")}
                                  <ArrowDownIcon className="h-3 w-3" />
                                </div>
                              </SelectItem>
                              <SelectItem value="amount-asc">
                                <div className="flex items-center gap-2">
                                  {t("balances.amount", "Amount")}
                                  <ArrowUpIcon className="h-3 w-3" />
                                </div>
                              </SelectItem>
                              <SelectItem value="name-asc">
                                <div className="flex items-center gap-2">
                                  {t("balances.name", "Name")}
                                  <ArrowUpIcon className="h-3 w-3" />
                                </div>
                              </SelectItem>
                              <SelectItem value="name-desc">
                                <div className="flex items-center gap-2">
                                  {t("balances.name", "Name")}
                                  <ArrowDownIcon className="h-3 w-3" />
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* You Owe sub-tab */}
                      <TabsContent value="you-owe" className="space-y-4 mt-4">
                        {iOwe.length > 0 ? (
                          <>
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSettleAllDialogOpen(true)}
                                className="gap-2 w-full sm:w-auto"
                                aria-label={t("balances.settleAll", "Settle All")}
                              >
                                <CheckCircle2Icon className="h-4 w-4" />
                                {t("balances.settleAll", "Settle All")}
                              </Button>
                            </div>
                            <SimplifiedDebts debts={iOwe} isLoading={isBalancesLoading} />
                          </>
                        ) : (
                          <Card className="border-border">
                            <CardContent className="py-12 text-center">
                              <div className="space-y-3">
                                <div className="flex justify-center">
                                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                                    <CheckCircle2Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                                  </div>
                                </div>
                                <p className="text-muted-foreground">
                                  {t("balances.youDontOweAnyone", "You don't owe anyone")}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      {/* Owed to You sub-tab */}
                      <TabsContent value="owed-to-you" className="space-y-4 mt-4">
                        {owedToMe.length > 0 ? (
                          <SimplifiedDebts debts={owedToMe} isLoading={isBalancesLoading} />
                        ) : (
                          <Card className="border-border">
                            <CardContent className="py-12 text-center">
                              <div className="space-y-3">
                                <div className="flex justify-center">
                                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                                    <CheckCircle2Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
                                  </div>
                                </div>
                                <p className="text-muted-foreground">
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

                {/* ─── Top Spenders Tab (group-gated) ──────────────────── */}
                {showSpenders && (
                  <TabsContent value="spenders" className="mt-4">
                    <TopSpenders data={topSpenders} isLoading={topSpendersLoading} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </>
        )}

        {/* ----------------------------------------------------------------
            SETTLE ALL DIALOG
        ---------------------------------------------------------------- */}
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
