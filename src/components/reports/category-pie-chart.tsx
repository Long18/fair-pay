"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Label } from 'recharts';
import { CategoryData } from '@/hooks/use-category-breakdown';
import { getCategoryMeta } from '@/modules/expenses';
import { formatNumber } from '@/lib/locale-utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface CategoryPieChartProps {
  data: CategoryData[];
  title?: string;
}

export function CategoryPieChart({ data, title = 'Chi tiêu theo danh mục' }: CategoryPieChartProps) {
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

  const chartConfig: ChartConfig = data.reduce((config, item, index) => {
    const categoryMeta = getCategoryMeta(item.category);
    const categoryKey = item.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    config[categoryKey] = {
      label: categoryMeta?.name || item.category,
      color: categoryMeta?.color || `var(--chart-${(index % 5) + 1})`,
    };
    return config;
  }, {} as ChartConfig);

  const chartData = data.map(item => {
    const categoryKey = item.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
      category: categoryKey,
      value: item.amount,
      count: item.count,
      fill: `var(--color-${categoryKey})`,
    };
  });

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="flex flex-col border-border shadow-sm">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg md:text-xl">{title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          Tổng: {formatNumber(totalAmount)} ₫
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px] sm:max-h-[300px] md:max-h-[350px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelKey="category"
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
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius="0%"
              outerRadius="80%"
              label={({ payload, percent }) => {
                const config = chartConfig[payload.category];
                return `${config?.label} ${(percent * 100).toFixed(0)}%`;
              }}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="category" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
