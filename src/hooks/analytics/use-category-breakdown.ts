import { useList, useGetIdentity } from '@refinedev/core';
import { useMemo } from 'react';
import { Expense } from '@/modules/expenses/types';
import { Profile } from '@/modules/profile/types';
import { isWithinInterval } from 'date-fns';
import { DateRange, DateRangePreset } from './analytics/use-spending-summary';
import { getCategoryMeta, EXPENSE_CATEGORIES } from '@/modules/expenses';

export interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

function getDateRangeForPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  switch (preset) {
    case 'this_month':
      return { start: startOfMonth, end: endOfMonth };
    case 'last_month':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: lastMonth, end: lastMonthEnd };
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
    case 'last_year':
      const lastYear = now.getFullYear() - 1;
      return { start: new Date(lastYear, 0, 1), end: new Date(lastYear, 11, 31) };
    case 'all_time':
      return { start: new Date(2020, 0, 1), end: now };
    default:
      return { start: startOfMonth, end: endOfMonth };
  }
}

export function useCategoryBreakdown(
  preset: DateRangePreset = 'this_month',
  customRange?: DateRange,
  groupId?: string
) {
  const { data: identity } = useGetIdentity<Profile>();

  const dateRange = customRange || getDateRangeForPreset(preset);

  const expenseFilters = [];
  if (groupId) {
    expenseFilters.push({ field: 'group_id', operator: 'eq' as const, value: groupId });
  }

  const { query } = useList<Expense>({
    resource: 'expenses',
    filters: expenseFilters,
    pagination: { mode: 'off' },
    meta: {
      select: '*, expense_splits(*)',
    },
    queryOptions: {
      staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on window focus
    },
  });

  const breakdown = useMemo<CategoryData[]>(() => {
    const expenses = (query.data?.data || []) as Expense[];
    const userId = identity?.id;

    if (!userId) {
      return [];
    }

    const filteredExpenses = expenses.filter((expense) =>
      isWithinInterval(new Date(expense.expense_date), {
        start: dateRange.start,
        end: dateRange.end,
      })
    );

    const categoryMap = new Map<string, { amount: number; count: number }>();

    EXPENSE_CATEGORIES.forEach(cat => {
      categoryMap.set(cat, { amount: 0, count: 0 });
    });

    filteredExpenses.forEach((expense: any) => {
      const mySplit = expense.expense_splits?.find((split: any) => split.user_id === userId);

      if (mySplit) {
        const category = expense.category || 'other';
        const current = categoryMap.get(category) || { amount: 0, count: 0 };
        categoryMap.set(category, {
          amount: current.amount + mySplit.computed_amount,
          count: current.count + 1,
        });
      }
    });

    const total = Array.from(categoryMap.values()).reduce((sum, { amount }) => sum + amount, 0);

    const result: CategoryData[] = Array.from(categoryMap.entries())
      .map(([category, { amount, count }]) => {
        const categoryMeta = getCategoryMeta(category);
        return {
          category,
          amount,
          count,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: categoryMeta?.color || '#gray',
        };
      })
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return result;
  }, [query.data, identity, dateRange]);

  return {
    breakdown,
    isLoading: query.isLoading,
    error: query.error,
  };
}
