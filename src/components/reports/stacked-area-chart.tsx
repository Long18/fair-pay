"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatNumber } from "@/lib/locale-utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface StackedAreaChartData {
  label: string;
  [key: string]: string | number;
}

interface StackedAreaChartProps {
  data: StackedAreaChartData[];
  categories: { key: string; name: string; color: string }[];
  title?: string;
}

export function StackedAreaChart({
  data,
  categories,
  title = "Spending Breakdown Over Time",
}: StackedAreaChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = categories.reduce((config, category, index) => {
    config[category.key] = {
      label: category.name,
      color: category.color || `var(--chart-${(index % 5) + 1})`,
    };
    return config;
  }, {} as ChartConfig);

  const totalAmount = data.reduce((sum, item) => {
    return sum + categories.reduce((catSum, cat) => {
      return catSum + (typeof item[cat.key] === 'number' ? (item[cat.key] as number) : 0);
    }, 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Total: {formatNumber(totalAmount)} ₫
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              {categories.map((category) => (
                <linearGradient
                  key={category.key}
                  id={`color-${category.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={category.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={category.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: "var(--font-size-chart-md)", fontFamily: "var(--font-sans)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: "var(--font-size-chart-md)", fontFamily: "var(--font-sans)" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                  )}
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
                      return (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{label}</span>
                          <span className="text-xs text-muted-foreground">
                            Total: {formatNumber(total)} ₫
                          </span>
                        </div>
                      );
                    }
                    return label;
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {categories.map((category) => (
              <Area
                key={category.key}
                type="monotone"
                dataKey={category.key}
                stackId="1"
                stroke={category.color}
                fill={`url(#color-${category.key})`}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
