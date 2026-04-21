"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell } from 'recharts';
import { CategoryData } from '@/hooks/analytics/use-category-breakdown';
import { getCategoryMeta } from '@/modules/expenses';
import { formatNumber } from '@/lib/locale-utils';
import { useTranslation } from 'react-i18next';
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

function resolveColor(category: string, index: number): string {
  const meta = getCategoryMeta(category);
  return meta.chartColor || `var(--chart-${(index % 5) + 1})`;
}

export function CategoryPieChart({ data, title }: CategoryPieChartProps) {
  const { t } = useTranslation();
  const chartTitle = title || t('analytics.spendingByCategory');

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t('reports.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build chartConfig with concrete color values so ChartContainer emits
  // correct --color-{key} custom properties for the legend swatches.
  const chartConfig: ChartConfig = data.reduce((config, item, index) => {
    const categoryMeta = getCategoryMeta(item.category);
    const categoryKey = item.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    config[categoryKey] = {
      label: categoryMeta?.name || item.category,
      color: resolveColor(item.category, index),
    };
    return config;
  }, {} as ChartConfig);

  // Each data point carries its own resolved fill so Recharts <Cell> can use
  // it directly — no dependency on CSS custom property resolution at paint time.
  const chartData = data.map((item, index) => {
    const categoryKey = item.category.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
      category: categoryKey,
      value: item.amount,
      count: item.count,
      fill: resolveColor(item.category, index),
    };
  });

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className="flex flex-col border-border shadow-sm">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg md:text-xl">{chartTitle}</CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          {t('analytics.total')}: {formatNumber(totalAmount)} ₫
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 sm:pb-6 px-4 sm:px-6">
        <ChartContainer config={chartConfig} className="mx-auto w-full min-h-[240px] max-h-[280px] sm:min-h-[280px] sm:max-h-[320px] md:min-h-[300px] md:max-h-[350px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelKey="category"
                  formatter={(value, _name, item) => (
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{formatNumber(Number(value))} ₫</span>
                      <span className="text-xs text-muted-foreground">
                        {item.payload.count} {t('analytics.expenses')}
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
              label={({ percent }: { percent?: number }) => {
                if (!percent || percent < 0.08) return null;
                return `${(percent * 100).toFixed(0)}%`;
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
