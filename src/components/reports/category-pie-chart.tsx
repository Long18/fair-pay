"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Label } from 'recharts';
import { CategoryData } from '@/hooks/use-category-breakdown';
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

/**
 * Resolved color values for each known expense category.
 *
 * These are concrete OKLCH values drawn from App.css so they render
 * correctly inside Recharts cells (which cannot resolve Tailwind utility
 * classes or undefined CSS custom properties).
 *
 * Mapping rationale against the project palette:
 *   Food & Drink   → --chart-3 (Orange)
 *   Transportation → --chart-2 (Blue)
 *   Accommodation  → Purple   (matches bgColor: bg-purple-100 in categories.ts)
 *   Entertainment  → Pink     (matches bgColor: bg-pink-100)
 *   Shopping       → --chart-4 (Green)
 *   Utilities      → --chart-5 (Yellow)
 *   Healthcare     → --destructive (Red)
 *   Education      → --chart-1 (Primary Blue / Indigo)
 *   Other          → Muted gray
 */
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Drink':   'oklch(0.531 0.380 24.6)',   // chart-3 / Orange
  'Transportation': 'oklch(0.678 0.376 213.1)',  // chart-2 / Light Blue
  'Accommodation':  'oklch(0.65  0.22  300)',     // Purple
  'Entertainment':  'oklch(0.65  0.22  340)',     // Pink
  'Shopping':       'oklch(0.65  0.15  160)',     // chart-4 / Green
  'Utilities':      'oklch(0.75  0.15  80)',      // chart-5 / Yellow
  'Healthcare':     'oklch(0.577 0.245 27.325)',  // destructive / Red
  'Education':      'oklch(0.598 0.365 217.2)',   // chart-1 / Primary Blue
  'Other':          'oklch(0.556 0 0)',           // muted-foreground / Gray
};

/** Return a resolved color for any category, falling back to chart-N cycling. */
function resolveColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] ?? `oklch(0.6 0.15 ${(index * 40) % 360})`;
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
              label={({ percent }) => {
                if (percent < 0.08) return null;
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
