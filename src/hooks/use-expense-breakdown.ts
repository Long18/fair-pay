import { useMemo } from 'react';
import { Expense, ExpenseSplit } from '@/modules/expenses/types';

interface ExpenseBreakdownItem {
  id: string;
  description: string;
  amount: number;
  your_share: number;
  expense_date: string;
  category: string | null;
  paid_by_user_id: string;
  is_settled: boolean;
  settled_amount: number;
}

interface ExpenseBreakdownParams {
  expenses: Expense[];
  currentUserId: string;
  otherUserId: string;
}

interface ExpenseBreakdownResult {
  breakdown: ExpenseBreakdownItem[];
  total: number;
  settledTotal: number;
  unsettledTotal: number;
  expenseCount: number;
}

/**
 * Hook to calculate expense breakdown between current user and another user
 * Shows individual expenses contributing to the debt
 */
export function useExpenseBreakdown({
  expenses,
  currentUserId,
  otherUserId,
}: ExpenseBreakdownParams): ExpenseBreakdownResult {
  return useMemo(() => {
    if (!currentUserId || !otherUserId) {
      return {
        breakdown: [],
        total: 0,
        settledTotal: 0,
        unsettledTotal: 0,
        expenseCount: 0,
      };
    }

    // Filter expenses where other user paid and current user has a split
    const relevantExpenses = expenses.filter((expense) => {
      const splits = expense.expense_splits || [];
      const isPaidByOther = expense.paid_by_user_id === otherUserId;
      const currentUserHasSplit = splits.some(
        (s: ExpenseSplit) => s.user_id === currentUserId
      );
      return isPaidByOther && currentUserHasSplit;
    });

    // Calculate breakdown
    const breakdown: ExpenseBreakdownItem[] = relevantExpenses.map((expense) => {
      const userSplit = expense.expense_splits?.find(
        (s: ExpenseSplit) => s.user_id === currentUserId
      );

      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        your_share: userSplit?.computed_amount || 0,
        expense_date: expense.expense_date,
        category: expense.category,
        paid_by_user_id: expense.paid_by_user_id,
        is_settled: userSplit?.is_settled || false,
        settled_amount: userSplit?.settled_amount || 0,
      };
    });

    // Sort by date (newest first)
    breakdown.sort(
      (a, b) =>
        new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );

    const total = breakdown.reduce((sum, e) => sum + e.your_share, 0);
    const settledTotal = breakdown
      .filter((e) => e.is_settled)
      .reduce((sum, e) => sum + e.your_share, 0);
    const unsettledTotal = total - settledTotal;

    return {
      breakdown,
      total,
      settledTotal,
      unsettledTotal,
      expenseCount: breakdown.length,
    };
  }, [expenses, currentUserId, otherUserId]);
}
