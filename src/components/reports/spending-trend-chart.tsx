"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendDataPoint } from '@/hooks/use-spending-trend';
import { formatNumber } from '@/lib/locale-utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface SpendingTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
}

export function SpendingTrendChart({ data, title = 'Xu hướng chi tiêu' }: SpendingTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Không có dữ liệu
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    amount: {
      label: "Số tiền",
      color: "var(--chart-1)",
    },
    count: {
      label: "Số lượng",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="flex flex-col border-border shadow-sm">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg md:text-xl">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          {totalCount} chi tiêu • {formatNumber(totalAmount)} ₫
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] md:h-[350px] w-full">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                      <span className="text-xs text-muted-foreground">
                        {item.payload.count} chi tiêu
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="var(--color-amount)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
