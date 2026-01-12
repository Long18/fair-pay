import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';

interface ContributingExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  group_id?: string | null;
  group_name?: string | null;
  my_share: number;
  status: 'paid' | 'unpaid' | 'partial';
  is_settled: boolean;
}

export function useContributingExpenses(counterpartyId: string) {
  const { data: identity } = useGetIdentity<Profile>();
  const [expenses, setExpenses] = useState<ContributingExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!identity?.id || !counterpartyId) return;

    async function fetchExpenses() {
      setIsLoading(true);
      setError(null);

      try {
        // Query expenses where both current user and counterparty have splits
        const { data: myExpenses, error: myExpensesError } = await supabaseClient
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
              expense_date,
              group_id,
              paid_by_user_id,
              groups (name)
            )
          `)
          .eq('user_id', identity!.id);

        if (myExpensesError) throw myExpensesError;

        // Filter expenses to only include those where counterparty also has a split
        const expenseIds = myExpenses?.map(split => (split.expenses as any).id) || [];

        const { data: counterpartySplits, error: counterpartyError } = await supabaseClient
          .from('expense_splits')
          .select('expense_id')
          .eq('user_id', counterpartyId)
          .in('expense_id', expenseIds);

        if (counterpartyError) throw counterpartyError;

        const sharedExpenseIds = new Set(counterpartySplits?.map(s => s.expense_id) || []);

        // Transform data
        const contributingExpenses: ContributingExpense[] = (myExpenses || [])
          .filter(split => sharedExpenseIds.has((split.expenses as any).id))
          .map(split => {
            const expense = split.expenses as any;
            const myShare = Number(split.computed_amount);
            const settledAmount = Number(split.settled_amount || 0);
            const isFullySettled = split.is_settled;
            const isPartiallySettled = settledAmount > 0 && !isFullySettled;

            return {
              id: expense.id,
              description: expense.description,
              amount: Number(expense.amount),
              currency: expense.currency,
              expense_date: expense.expense_date,
              group_id: expense.group_id,
              group_name: expense.groups?.name || null,
              my_share: myShare,
              status: isFullySettled ? 'paid' : isPartiallySettled ? 'partial' : 'unpaid',
              is_settled: isFullySettled,
            };
          });

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
  }, [identity?.id, counterpartyId]);

  return { expenses, isLoading, error };
}
