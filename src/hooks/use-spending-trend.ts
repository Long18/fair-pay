import { useList, useGetIdentity } from '@refinedev/core';
import { useMemo } from 'react';
import { Expense } from '@/modules/expenses/types';
import { Profile } from '@/modules/profile/types';
import { format, startOfMonth, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DateRange, DateRangePreset } from './use-spending-summary';

export type TrendGranularity = 'day' | 'week' | 'month';

export interface TrendDataPoint {
  date: string;
  label: string;
  amount: number;
  count: number;
}

function getDateRangeForPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  switch (preset) {
    case 'this_month':
      return { start: startOfThisMonth, end: endOfThisMonth };
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
      return { start: startOfThisMonth, end: endOfThisMonth };
  }
}

function determineGranularity(dateRange: DateRange): TrendGranularity {
  const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days <= 31) return 'day';
  if (days <= 90) return 'week';
  return 'month';
}

export function useSpendingTrend(
  preset: DateRangePreset = 'this_month',
  customRange?: DateRange,
  groupId?: string,
  granularity?: TrendGranularity
) {
  const { data: identity } = useGetIdentity<Profile>();
  
  const dateRange = customRange || getDateRangeForPreset(preset);
  const actualGranularity = granularity || determineGranularity(dateRange);

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
  });

  const trend = useMemo<TrendDataPoint[]>(() => {
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

    let intervals: Date[];
    let formatStr: string;

    switch (actualGranularity) {
      case 'day':
        intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        formatStr = 'dd MMM';
        break;
      case 'week':
        intervals = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
        formatStr = "'Tuần' w";
        break;
      case 'month':
        intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
        formatStr = 'MMM yyyy';
        break;
    }

    const trendMap = new Map<string, { amount: number; count: number }>();

    intervals.forEach(interval => {
      const key = format(interval, 'yyyy-MM-dd');
      trendMap.set(key, { amount: 0, count: 0 });
    });

    filteredExpenses.forEach((expense: any) => {
      const expenseDate = new Date(expense.expense_date);
      let key: string;

      switch (actualGranularity) {
        case 'day':
          key = format(expenseDate, 'yyyy-MM-dd');
          break;
        case 'week':
          key = format(startOfMonth(expenseDate), 'yyyy-MM-dd');
          break;
        case 'month':
          key = format(new Date(expenseDate.getFullYear(), expenseDate.getMonth(), 1), 'yyyy-MM-dd');
          break;
      }

      const mySplit = expense.expense_splits?.find((split: any) => split.user_id === userId);
      
      if (mySplit) {
        const current = trendMap.get(key) || { amount: 0, count: 0 };
        trendMap.set(key, {
          amount: current.amount + mySplit.computed_amount,
          count: current.count + 1,
        });
      }
    });

    return intervals.map(interval => {
      const key = format(interval, 'yyyy-MM-dd');
      const data = trendMap.get(key) || { amount: 0, count: 0 };
      
      return {
        date: key,
        label: format(interval, formatStr, { locale: vi }),
        amount: data.amount,
        count: data.count,
      };
    });
  }, [query.data, identity, dateRange, actualGranularity]);

  return {
    trend,
    isLoading: query.isLoading,
    error: query.error,
    granularity: actualGranularity,
  };
}

