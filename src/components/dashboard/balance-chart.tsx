import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatNumber } from "@/lib/locale-utils";
import { useBalanceHistory } from "@/hooks/use-balance-history";
import { format, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { Loader2Icon } from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface BalanceChartProps {
  currentBalance: number;
  startDate?: Date;
  endDate?: Date;
  currency?: string;
}

type DateRangeOption = '7d' | '30d' | '90d' | 'all';

export const BalanceChart = ({
  currentBalance,
  startDate: initialStartDate,
  endDate: initialEndDate,
  currency = "USD",
}: BalanceChartProps) => {
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');

  const { startDate, endDate } = useMemo(() => {
    const end = initialEndDate || new Date();
    let start: Date;

    switch (dateRange) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      case 'all':
        start = initialStartDate || subDays(end, 365);
        break;
      default:
        start = subDays(end, 30);
    }

    return { startDate: start, endDate: end };
  }, [dateRange, initialStartDate, initialEndDate]);

  const { data: historyData, isLoading } = useBalanceHistory({
    startDate,
    endDate,
    currency,
  });

  const chartData = useMemo(() => {
    return historyData.map((point) => ({
      date: format(new Date(point.snapshot_date), "M/d"),
      balance: point.net_balance,
    }));
  }, [historyData]);

  const isPositive = currentBalance >= 0;

  // Chart config with theme support for light/dark mode
  const chartConfig = useMemo(() => {
    return {
      balance: {
        label: "Balance",
        theme: {
          light: isPositive ? "#10b981" : "#ef4444",
          dark: isPositive ? "#22c55e" : "#f87171",
        },
      },
    } satisfies ChartConfig;
  }, [isPositive]);

  if (isLoading) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Balance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">
            Balance Trend
          </CardTitle>
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeOption)}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs sm:text-sm" aria-label="Select date range for balance chart">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <div
              className={`text-xl sm:text-2xl md:text-3xl font-bold ${
                isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {formatNumber(currentBalance)} ₫
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">
              {chartData.length > 0
                ? `From ${chartData[0].date} to ${chartData[chartData.length - 1].date}`
                : "Current balance"}
            </div>
          </div>
          <div className="h-[150px] sm:h-[180px] md:h-[200px] w-full">
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <RechartsBarChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{
                      fontSize: "var(--font-size-chart-xs)",
                      fontFamily: "var(--font-sans)",
                      fill: "currentColor",
                    }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: "var(--font-size-chart-xs)", fontFamily: "var(--font-sans)" }}
                    width={40}
                    tickFormatter={(value) => {
                      const absValue = Math.abs(value);
                      if (absValue >= 1000000) {
                        return `${(value / 1000000).toFixed(1)}M`;
                      }
                      if (absValue >= 1000) {
                        return `${(value / 1000).toFixed(0)}k`;
                      }
                      return value.toString();
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="balance"
                    fill="var(--color-balance)"
                    radius={4}
                  />
                </RechartsBarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No historical data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
