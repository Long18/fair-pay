import { useMemo } from "react";
import { useSpendingComparison } from "./use-spending-comparison";
import { useTopCategories } from "./use-top-categories";
import { useSpendingSummary, DateRangePreset, DateRange } from "./use-spending-summary";

export interface SpendingInsight {
  id: string;
  type: "info" | "warning" | "success" | "trend";
  title: string;
  description: string;
  value?: string;
  icon?: string;
}

export interface UseSpendingInsightsOptions {
  preset?: DateRangePreset;
  customRange?: DateRange;
  groupId?: string;
}

export const useSpendingInsights = (options: UseSpendingInsightsOptions = {}) => {
  const { preset = "this_month", customRange, groupId } = options;

  const { summary } = useSpendingSummary(preset, customRange, groupId);

  const dateRange = customRange || getDateRangeForPreset(preset);

  const { data: comparison, isLoading: comparisonLoading } = useSpendingComparison({
    currentStart: dateRange.start,
    currentEnd: dateRange.end,
    groupId,
  });

  const { data: topCategories, isLoading: categoriesLoading } = useTopCategories({
    startDate: dateRange.start,
    endDate: dateRange.end,
    groupId,
    limit: 3,
  });

  const insights = useMemo<SpendingInsight[]>(() => {
    const result: SpendingInsight[] = [];

    if (comparison) {
      if (comparison.trend === "increasing" && comparison.percentage_change > 10) {
        result.push({
          id: "spending-increase",
          type: "warning",
          title: "Spending Increased",
          description: `Your spending is up ${comparison.percentage_change.toFixed(1)}% compared to the previous period`,
          value: `+${comparison.percentage_change.toFixed(1)}%`,
          icon: "trending-up",
        });
      } else if (comparison.trend === "decreasing" && Math.abs(comparison.percentage_change) > 10) {
        result.push({
          id: "spending-decrease",
          type: "success",
          title: "Spending Decreased",
          description: `Great job! Your spending is down ${Math.abs(comparison.percentage_change).toFixed(1)}% compared to the previous period`,
          value: `-${Math.abs(comparison.percentage_change).toFixed(1)}%`,
          icon: "trending-down",
        });
      } else if (comparison.trend === "stable") {
        result.push({
          id: "spending-stable",
          type: "info",
          title: "Consistent Spending",
          description: "Your spending pattern is stable compared to the previous period",
          icon: "minus",
        });
      }
    }

    if (topCategories && topCategories.length > 0) {
      const topCategory = topCategories[0];
      if (topCategory.percentage > 40) {
        result.push({
          id: "top-category",
          type: "info",
          title: `${topCategory.category} Dominates`,
          description: `${topCategory.percentage.toFixed(1)}% of your spending is in ${topCategory.category}`,
          value: `${topCategory.percentage.toFixed(1)}%`,
          icon: "pie-chart",
        });
      }
    }

    if (summary.averageExpense > 0) {
      if (summary.largestExpense > summary.averageExpense * 3) {
        result.push({
          id: "large-expense",
          type: "warning",
          title: "Large Expense Detected",
          description: `Your largest expense is ${(summary.largestExpense / summary.averageExpense).toFixed(1)}x your average`,
          icon: "alert-circle",
        });
      }
    }

    if (summary.netBalance < -1000) {
      result.push({
        id: "negative-balance",
        type: "warning",
        title: "High Outstanding Balance",
        description: "You have significant outstanding debts to settle",
        icon: "alert-triangle",
      });
    } else if (summary.netBalance > 1000) {
      result.push({
        id: "positive-balance",
        type: "success",
        title: "Money to Collect",
        description: "You have money to collect from others",
        icon: "check-circle",
      });
    }

    if (summary.expenseCount === 0) {
      result.push({
        id: "no-expenses",
        type: "info",
        title: "No Expenses",
        description: "No expenses recorded in this period",
        icon: "inbox",
      });
    }

    return result.slice(0, 5);
  }, [comparison, topCategories, summary]);

  return {
    insights,
    isLoading: comparisonLoading || categoriesLoading,
  };
};

function getDateRangeForPreset(preset: DateRangePreset): DateRange {
  const now = new Date();

  switch (preset) {
    case "this_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case "this_year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31),
      };
    case "last_year":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31),
      };
    case "all_time":
      return {
        start: new Date(2020, 0, 1),
        end: now,
      };
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
  }
}

