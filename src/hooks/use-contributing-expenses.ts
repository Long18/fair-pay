import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';

interface ContributingExpense {
  id: string; // split ID (used for settlement)
  split_id: string;
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  group_id?: string | null;
  group_name?: string | null;
  category?: string | null;
  my_share: number;
  direction: 'i_owe' | 'they_owe'; // whether I owe them or they owe me
  status: 'paid' | 'unpaid' | 'partial';
  is_settled: boolean;
}

export function useContributingExpenses(counterpartyId: string) {
  const { data: identity } = useGetIdentity<Profile>();
  const [expenses, setExpenses] = useState<ContributingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!identity?.id || !counterpartyId) return;

    async function fetchExpenses() {
      setIsLoading(true);
      setError(null);

      try {
        // Query expenses where counterparty paid and current user has a split (I owe them)
        // OR current user paid and counterparty has a split (they owe me)
        const { data: expensesPaidByCounterparty, error: paidByCounterpartyError } = await supabaseClient
          .from('expense_splits')
          .select(`
            id,
            computed_amount,
            is_settled,
            settled_amount,
            expenses!inner (
              id,
              description,
              amount,
              currency,
              category,
              expense_date,
              group_id,
              paid_by_user_id,
              groups (name)
            )
          `)
          .eq('user_id', identity!.id)
          .eq('expenses.paid_by_user_id', counterpartyId);

        if (paidByCounterpartyError) throw paidByCounterpartyError;

        // Query expenses where current user paid and counterparty has a split
        const { data: expensesPaidByMe, error: paidByMeError } = await supabaseClient
          .from('expense_splits')
          .select(`
            id,
            computed_amount,
            is_settled,
            settled_amount,
            expenses!inner (
              id,
              description,
              amount,
              currency,
              category,
              expense_date,
              group_id,
              paid_by_user_id,
              groups (name)
            )
          `)
          .eq('user_id', counterpartyId)
          .eq('expenses.paid_by_user_id', identity!.id);

        if (paidByMeError) throw paidByMeError;

        // Transform data - expenses where counterparty paid (I owe them)
        const iOweExpenses: ContributingExpense[] = (expensesPaidByCounterparty || [])
          .map(split => {
            const expense = split.expenses as any;
            const myShare = Number(split.computed_amount);
            const settledAmount = Number(split.settled_amount || 0);
            const isFullySettled = split.is_settled;
            const isPartiallySettled = settledAmount > 0 && !isFullySettled;

            return {
              id: split.id, // split ID for settlement
              split_id: split.id,
              expense_id: expense.id,
              description: expense.description,
              amount: Number(expense.amount),
              currency: expense.currency,
              expense_date: expense.expense_date,
              group_id: expense.group_id,
              group_name: expense.groups?.name || null,
              category: expense.category || null,
              my_share: myShare,
              direction: 'i_owe' as const,
              status: isFullySettled ? 'paid' : isPartiallySettled ? 'partial' : 'unpaid',
              is_settled: isFullySettled,
            };
          });

        // Transform data - expenses where I paid (they owe me)
        const theyOweExpenses: ContributingExpense[] = (expensesPaidByMe || [])
          .map(split => {
            const expense = split.expenses as any;
            const theirShare = Number(split.computed_amount);
            const settledAmount = Number(split.settled_amount || 0);
            const isFullySettled = split.is_settled;
            const isPartiallySettled = settledAmount > 0 && !isFullySettled;

            return {
              id: split.id, // split ID for settlement
              split_id: split.id,
              expense_id: expense.id,
              description: expense.description,
              amount: Number(expense.amount),
              currency: expense.currency,
              expense_date: expense.expense_date,
              group_id: expense.group_id,
              group_name: expense.groups?.name || null,
              category: expense.category || null,
              my_share: theirShare, // This is what they owe
              direction: 'they_owe' as const,
              status: isFullySettled ? 'paid' : isPartiallySettled ? 'partial' : 'unpaid',
              is_settled: isFullySettled,
            };
          });

        // Combine both lists - no deduplication needed because:
        // Query 1 returns expenses paid by counterparty, Query 2 returns expenses paid by me.
        // Since each expense has a single paid_by_user_id, these sets are mutually exclusive.
        const contributingExpenses = [...iOweExpenses, ...theyOweExpenses];

        // Sort by date (newest first)
        contributingExpenses.sort((a, b) =>
          new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
        );

        setExpenses(contributingExpenses);
      } catch (err) {
        console.error('Error fetching contributing expenses:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExpenses();
  }, [identity?.id, counterpartyId, refreshKey]);

  return {
    expenses,
    isLoading,
    error,
    refetch: () => setRefreshKey(k => k + 1)
  };
}
