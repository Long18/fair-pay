import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRecurringExpenses } from "@/modules/expenses/hooks/use-recurring-expenses";
import { TrendingUpIcon, PieChartIcon, CalendarIcon, ActivityIcon } from "@/components/ui/icons";

export function RecurringExpensesAnalytics() {
  const { t } = useTranslation();
  const { recurring, active, paused } = useRecurringExpenses({});

  // Calculate monthly total normalized from all frequencies
  const monthlyTotal = useMemo(() => {
    return active.reduce((sum, r) => {
      const amount = r.template_expense?.amount || r.expenses?.amount || 0;
      let monthlyAmount = amount;

      switch (r.frequency) {
        case "weekly":
          monthlyAmount = amount * 4.33;
          break;
        case "bi_weekly":
          monthlyAmount = amount * 2.165;
          break;
        case "monthly":
          monthlyAmount = amount;
          break;
        case "quarterly":
          monthlyAmount = amount / 3;
          break;
        case "yearly":
          monthlyAmount = amount / 12;
          break;
      }

      return sum + monthlyAmount / (r.interval || 1);
    }, 0);
  }, [active]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, { count: number; total: number }> = {};

    active.forEach((r) => {
      const template = r.template_expense || r.expenses;
      const category = template?.category || t("common.uncategorized", "Uncategorized");
      const amount = template?.amount || 0;

      // Normalize to monthly
      let monthlyAmount = amount;
      switch (r.frequency) {
        case "weekly":
          monthlyAmount = amount * 4.33;
          break;
        case "bi_weekly":
          monthlyAmount = amount * 2.165;
          break;
        case "monthly":
          monthlyAmount = amount;
          break;
        case "quarterly":
          monthlyAmount = amount / 3;
          break;
        case "yearly":
          monthlyAmount = amount / 12;
          break;
      }

      if (!categories[category]) {
        categories[category] = { count: 0, total: 0 };
      }

      categories[category].count += 1;
      categories[category].total += monthlyAmount / (r.interval || 1);
    });

    return Object.entries(categories)
      .map(([category, data]) => ({
        category,
        ...data,
        percentage: monthlyTotal > 0 ? (data.total / monthlyTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // Top 5 categories
  }, [active, monthlyTotal, t]);

  // Frequency distribution
  const frequencyDistribution = useMemo(() => {
    const frequencies: Record<string, number> = {};

    active.forEach((r) => {
      const freq = r.frequency;
      frequencies[freq] = (frequencies[freq] || 0) + 1;
    });

    return Object.entries(frequencies).map(([frequency, count]) => ({
      frequency,
      count,
      percentage: active.length > 0 ? (count / active.length) * 100 : 0,
    }));
  }, [active]);

  // Projected yearly cost
  const yearlyTotal = monthlyTotal * 12;

  // Active vs Paused ratio
  const activePercentage = recurring.length > 0 ? (active.length / recurring.length) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: t("recurring.weekly", "Weekly"),
      bi_weekly: t("recurring.biweekly", "Bi-weekly"),
      monthly: t("recurring.monthly", "Monthly"),
      quarterly: t("recurring.quarterly", "Quarterly"),
      yearly: t("recurring.yearly", "Yearly"),
    };
    return labels[frequency] || frequency;
  };

  if (recurring.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Monthly Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">
              {t("analytics.monthlyOverview", "Monthly Overview")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-muted-foreground">
                {t("analytics.monthlyTotal", "Monthly Total")}
              </span>
              <span className="text-2xl font-bold">{formatCurrency(monthlyTotal)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {t("analytics.yearlyProjection", "Yearly projection")}: {formatCurrency(yearlyTotal)}
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("analytics.activeExpenses", "Active")}</span>
              <Badge variant="default">{active.length}</Badge>
            </div>
            <Progress value={activePercentage} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("analytics.pausedExpenses", "Paused")}</span>
              <Badge variant="secondary">{paused.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">
              {t("analytics.categoryBreakdown", "Category Breakdown")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("analytics.noData", "No data available")}
            </p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {item.count} {item.count === 1 ? "expense" : "expenses"}
                      </span>
                      <span className="font-medium min-w-[80px] text-right">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frequency Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">
              {t("analytics.frequencyDistribution", "Frequency Distribution")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {frequencyDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("analytics.noData", "No data available")}
            </p>
          ) : (
            <div className="space-y-3">
              {frequencyDistribution.map((item) => (
                <div key={item.frequency} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{getFrequencyLabel(item.frequency)}</span>
                    <Progress value={item.percentage} className="h-1.5 flex-1 max-w-[120px]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(item.percentage)}%
                    </span>
                    <Badge variant="outline" className="min-w-[40px] justify-center">
                      {item.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">
              {t("analytics.quickStats", "Quick Stats")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("analytics.totalExpenses", "Total Expenses")}
              </p>
              <p className="text-2xl font-bold">{recurring.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("analytics.averageCost", "Avg Monthly Cost")}
              </p>
              <p className="text-2xl font-bold">
                {active.length > 0 ? formatCurrency(monthlyTotal / active.length) : formatCurrency(0)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("analytics.categories", "Categories")}
              </p>
              <p className="text-2xl font-bold">{categoryBreakdown.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("analytics.activeRate", "Active Rate")}
              </p>
              <p className="text-2xl font-bold">{Math.round(activePercentage)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
