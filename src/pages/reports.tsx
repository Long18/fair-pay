import { useState, useRef, useMemo } from "react";
import { useList } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DateRange as DateRangeType,
  DateRangePreset,
  useSpendingSummary,
} from "@/hooks/analytics/use-spending-summary";
import { useCategoryBreakdown } from "@/hooks/analytics/use-category-breakdown";
import { useSpendingTrend } from "@/hooks/analytics/use-spending-trend";
import { useSpendingComparison } from "@/hooks/analytics/use-spending-comparison";
import { useTopCategories } from "@/hooks/analytics/use-top-categories";
import { useTopSpenders } from "@/hooks/analytics/use-top-spenders";
import { useSpendingInsights } from "@/hooks/analytics/use-spending-insights";
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
import { Group } from "@/modules/groups/types";
import { DateRange } from "react-day-picker";
import { exportEnhancedReportToCSV } from "@/utils/export-csv-enhanced";
import { exportToPDF } from "@/utils/export-pdf";
import { DownloadIcon, Loader2Icon, CalendarIcon, FileTextIcon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LoadingBeam } from "@/components/ui/loading-beam";

export function ReportsPage() {
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customRange, setCustomRange] = useState<DateRange>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [showComparison, setShowComparison] = useState(false);

  const chartsRef = useRef<HTMLDivElement>(null);

  const { query: groupsQuery } = useList<Group>({
    resource: "groups",
    pagination: { mode: "off" },
    meta: {
      select: "id, name",
    },
  });

  const groups = groupsQuery.data?.data || [];

  const dateRange: DateRangeType | undefined =
    customRange?.from && customRange?.to
      ? { start: customRange.from, end: customRange.to }
      : undefined;

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

  const actualDateRange = useMemo(
    () => dateRange || getDateRangeForPreset(preset),
    [dateRange, preset]
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

  const handlePresetChange = (value: string) => {
    setPreset(value as DateRangePreset);
    if (value !== "custom") {
      setCustomRange(undefined);
    }
  };

  const handleExportCSV = () => {
    exportEnhancedReportToCSV(
      {
        summary: [
          { label: "Total Spent", value: `${summary.totalSpent} ₫` },
          { label: "Total Received", value: `${summary.totalReceived} ₫` },
          { label: "Net Balance", value: `${summary.netBalance} ₫` },
          { label: "Expense Count", value: `${summary.expenseCount}` },
          { label: "Average Expense", value: `${summary.averageExpense} ₫` },
        ],
        categoryBreakdown: breakdown,
        trendData: trend.map((t) => ({
          period: t.label,
          amount: t.amount,
          count: t.count,
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
      `spending-report-${format(new Date(), "yyyy-MM-dd")}`
    );
  };

  const handleExportPDF = async () => {
    const chartElements: HTMLElement[] = [];
    if (chartsRef.current) {
      const charts = chartsRef.current.querySelectorAll("[data-chart]");
      charts.forEach((chart) => {
        if (chart instanceof HTMLElement) {
          chartElements.push(chart);
        }
      });
    }

    await exportToPDF({
      title: "Spending Report",
      dateRange: actualDateRange,
      chartElements,
      summary: [
        { label: "Total Spent", value: `${summary.totalSpent} ₫` },
        { label: "Total Received", value: `${summary.totalReceived} ₫` },
        { label: "Net Balance", value: `${summary.netBalance} ₫` },
        { label: "Expense Count", value: `${summary.expenseCount}` },
        { label: "Average Expense", value: `${Math.round(summary.averageExpense)} ₫` },
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

  const isLoading =
    summaryLoading ||
    breakdownLoading ||
    trendLoading ||
    comparisonLoading ||
    topCategoriesLoading ||
    insightsLoading;

  return (
    <div className="container max-w-7xl mx-auto py-4 md:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Spending Reports</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
              Analyze your spending patterns and trends
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              disabled={isLoading || breakdown.length === 0}
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
              disabled={isLoading || breakdown.length === 0}
              className="w-full sm:w-auto"
            >
              <FileTextIcon className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="time-period" className="text-xs sm:text-sm font-medium">Time Period</Label>
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

            {preset === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="date-range" className="text-xs sm:text-sm font-medium">Date Range</Label>
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
                            {format(customRange.from, "dd MMM yyyy", { locale: vi })} -{" "}
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

            <div className="space-y-2">
              <Label htmlFor="group-select" className="text-xs sm:text-sm font-medium">Group</Label>
              <Select
                value={selectedGroupId || "all"}
                onValueChange={(value) =>
                  setSelectedGroupId(value === "all" ? undefined : value)
                }
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

            <div className="space-y-2">
              <Label htmlFor="chart-type" className="text-xs sm:text-sm font-medium">Chart Type</Label>
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

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-comparison" className="text-xs sm:text-sm font-medium cursor-pointer">
                Show period comparison
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

      {isLoading && (
        <LoadingBeam text="Đang tải báo cáo..." />
      )}

      {!isLoading && (
        <>
          <SpendingSummaryStats summary={summary} />

          {showComparison && (
            <ComparisonChart data={comparison} isLoading={comparisonLoading} />
          )}

          <InsightsPanel insights={insights} isLoading={insightsLoading} />

          <div ref={chartsRef}>
            <Tabs defaultValue="charts" className="space-y-4 md:space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="charts" className="text-xs sm:text-sm">Charts</TabsTrigger>
                <TabsTrigger value="breakdown" className="text-xs sm:text-sm">Breakdown</TabsTrigger>
                {selectedGroupId && <TabsTrigger value="spenders" className="text-xs sm:text-sm">Top Spenders</TabsTrigger>}
              </TabsList>

              <TabsContent value="charts" className="space-y-4 md:space-y-6 mt-4">
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
                    <SpendingTrendChart data={trend} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="breakdown" className="mt-4">
                <CategoryBreakdownTable data={topCategories} isLoading={topCategoriesLoading} />
              </TabsContent>

              {selectedGroupId && (
                <TabsContent value="spenders" className="mt-4">
                  <TopSpenders data={topSpenders} isLoading={topSpendersLoading} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

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
      return {
        start: new Date(2020, 0, 1),
        end: now,
      };
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
  }
}
