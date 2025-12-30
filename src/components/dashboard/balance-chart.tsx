import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/locale-utils";
import { useBalanceHistory } from "@/hooks/use-balance-history";
import { format } from "date-fns";
import { useMemo } from "react";
import { Loader2Icon } from "@/components/ui/icons";

interface BalanceChartProps {
  currentBalance: number;
  startDate?: Date;
  endDate?: Date;
  currency?: string;
}

export const BalanceChart = ({
  currentBalance,
  startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate = new Date(),
  currency = "USD",
}: BalanceChartProps) => {
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
        <CardTitle className="text-base font-semibold text-foreground">
          Balance Trend
        </CardTitle>
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
