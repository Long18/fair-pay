"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useTranslation } from "react-i18next";
import { formatNumber } from "@/lib/locale-utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface BarChartData {
  label: string;
  value: number;
  comparisonValue?: number;
  fill?: string;
}

interface BarChartProps {
  data: BarChartData[];
  title?: string;
  showComparison?: boolean;
  horizontal?: boolean;
}

export function BarChart({
  data,
  title,
  showComparison = false,
  horizontal = false,
}: BarChartProps) {
  const { t } = useTranslation();
  const chartTitle = title ?? t("analytics.barChart");

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t("reports.noData")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    value: {
      label: t("analytics.currentPeriod"),
      color: "var(--chart-1)",
    },
    comparisonValue: {
      label: t("analytics.previousPeriod"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const totalComparison = showComparison
    ? data.reduce((sum, item) => sum + (item.comparisonValue || 0), 0)
    : 0;

  const layout = horizontal ? "horizontal" : "vertical";

  return (
    <Card className="flex flex-col border-border shadow-sm">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg md:text-xl">{chartTitle}</CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          {showComparison
            ? `${t("analytics.currentPeriod")}: ${formatNumber(totalValue)} ₫ • ${t("analytics.previousPeriod")}: ${formatNumber(totalComparison)} ₫`
            : `${t("analytics.total")}: ${formatNumber(totalValue)} ₫`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] md:h-[350px] w-full">
          <RechartsBarChart
            data={data}
            layout={layout}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid vertical={false} />
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: "var(--font-size-chart-sm)", fontFamily: "var(--font-sans)" }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: "var(--font-size-chart-sm)", fontFamily: "var(--font-sans)" }}
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: "var(--font-size-chart-sm)", fontFamily: "var(--font-sans)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: "var(--font-size-chart-sm)", fontFamily: "var(--font-sans)" }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  width={40}
                />
              </>
            )}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              radius={4}
            />
            {showComparison && (
              <Bar
                dataKey="comparisonValue"
                fill="var(--color-comparisonValue)"
                radius={4}
              />
            )}
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
