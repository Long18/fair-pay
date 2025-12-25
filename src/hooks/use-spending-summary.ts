import { useList, useGetIdentity } from '@refinedev/core';
import { useMemo } from 'react';
import { Expense } from '@/modules/expenses/types';
import { Payment } from '@/modules/payments/types';
import { Profile } from '@/modules/profile/types';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

export type DateRangePreset = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'all_time' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SpendingSummary {
  totalSpent: number;
  totalReceived: number;
  netBalance: number;
  expenseCount: number;
  paymentCount: number;
  averageExpense: number;
  largestExpense: number;
  smallestExpense: number;
  currency: string;
}

function getDateRangeForPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  
  switch (preset) {
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) };
    case 'last_year':
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    case 'all_time':
      return { start: new Date(2020, 0, 1), end: now };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export function useSpendingSummary(
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

  const { query: expensesQuery } = useList<Expense>({
    resource: 'expenses',
    filters: expenseFilters,
    pagination: { mode: 'off' },
    meta: {
      select: '*, expense_splits(*)',
    },
  });

  const { query: paymentsQuery } = useList<Payment>({
    resource: 'payments',
    filters: groupId ? [{ field: 'group_id', operator: 'eq' as const, value: groupId }] : [],
    pagination: { mode: 'off' },
  });

  const summary = useMemo<SpendingSummary>(() => {
    const expenses = (expensesQuery.data?.data || []) as Expense[];
    const payments = (paymentsQuery.data?.data || []) as Payment[];
    const userId = identity?.id;

    if (!userId) {
      return {
        totalSpent: 0,
        totalReceived: 0,
        netBalance: 0,
        expenseCount: 0,
        paymentCount: 0,
        averageExpense: 0,
        largestExpense: 0,
        smallestExpense: 0,
        currency: 'VND',
      };
    }

    const filteredExpenses = expenses.filter((expense) =>
      isWithinInterval(new Date(expense.expense_date), {
        start: dateRange.start,
        end: dateRange.end,
      })
    );

    const filteredPayments = payments.filter((payment) =>
      isWithinInterval(new Date(payment.payment_date), {
        start: dateRange.start,
        end: dateRange.end,
      })
    );

    let totalSpent = 0;
    let totalReceived = 0;
    const expenseAmounts: number[] = [];

    filteredExpenses.forEach((expense: any) => {
      const mySplit = expense.expense_splits?.find((split: any) => split.user_id === userId);
      
      if (mySplit) {
        totalSpent += mySplit.computed_amount;
        expenseAmounts.push(mySplit.computed_amount);
      }

      if (expense.paid_by_user_id === userId) {
        totalReceived += expense.amount;
      }
    });

    filteredPayments.forEach((payment) => {
      if (payment.from_user === userId) {
        totalSpent += payment.amount;
      }
      if (payment.to_user === userId) {
        totalReceived += payment.amount;
      }
    });

    return {
      totalSpent,
      totalReceived,
      netBalance: totalReceived - totalSpent,
      expenseCount: filteredExpenses.length,
      paymentCount: filteredPayments.length,
      averageExpense: expenseAmounts.length > 0 
        ? expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length 
        : 0,
      largestExpense: expenseAmounts.length > 0 ? Math.max(...expenseAmounts) : 0,
      smallestExpense: expenseAmounts.length > 0 ? Math.min(...expenseAmounts) : 0,
      currency: 'VND',
    };
  }, [expensesQuery.data, paymentsQuery.data, identity, dateRange]);

  return {
    summary,
    isLoading: expensesQuery.isLoading || paymentsQuery.isLoading,
    error: expensesQuery.error || paymentsQuery.error,
  };
}

