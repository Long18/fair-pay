import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/locale-utils";
import { useBalanceHistory } from "@/hooks/use-balance-history";
import { format, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { Loader2Icon } from "@/components/ui/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const chartColor = isPositive ? "#10b981" : "#ef4444";

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
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Balance Trend
          </CardTitle>
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeOption)}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs" aria-label="Select date range for balance chart">
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
      <CardContent>
        <div className="space-y-4">
          <div>
            <div
              className={`text-2xl md:text-3xl font-bold ${
                isPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {formatNumber(currentBalance)} ₫
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {chartData.length > 0
                ? `From ${chartData[0].date} to ${chartData[chartData.length - 1].date}`
                : "Current balance"}
            </div>
          </div>
          <div className="h-[120px] md:h-[150px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    className="text-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${formatNumber(value)} ₫`, "Balance"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke={chartColor}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
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
