import { useState, useEffect } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { useContributingExpenses } from './use-contributing-expenses';

interface DebtSummary {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  total_i_owe: number;
  total_they_owe: number;
  net_amount: number;
  i_owe_them: boolean;
  currency: string;
  unpaid_count: number;
  partial_count: number;
  paid_count: number;
}

export function useDebtSummary(counterpartyId: string, counterpartyName: string, counterpartyAvatarUrl?: string | null) {
  const { data: identity } = useGetIdentity<Profile>();
  const { expenses, isLoading: expensesLoading, error: expensesError } = useContributingExpenses(counterpartyId);
  const [summary, setSummary] = useState<DebtSummary | null>(null);

  useEffect(() => {
    if (!identity?.id || !counterpartyId || expensesLoading) return;

    // Calculate summary from expenses
    let totalIOweThem = 0;
    let totalTheyOweMe = 0;
    let unpaidCount = 0;
    let partialCount = 0;
    let paidCount = 0;
    const currency = expenses[0]?.currency || 'VND';

    expenses.forEach(expense => {
      const myShare = expense.my_share;

      if (expense.status === 'paid') {
        paidCount++;
      } else if (expense.status === 'partial') {
        partialCount++;
      } else {
        unpaidCount++;
      }

      // Use the direction field to determine who owes whom
      if (!expense.is_settled) {
        if (expense.direction === 'i_owe') {
          totalIOweThem += myShare;
        } else if (expense.direction === 'they_owe') {
          totalTheyOweMe += myShare;
        }
      }
    });

    const netAmount = totalTheyOweMe - totalIOweThem;
    const iOweThem = netAmount < 0;

    setSummary({
      counterparty_id: counterpartyId,
      counterparty_name: counterpartyName,
      counterparty_avatar_url: counterpartyAvatarUrl,
      total_i_owe: totalIOweThem,
      total_they_owe: totalTheyOweMe,
      net_amount: Math.abs(netAmount),
      i_owe_them: iOweThem,
      currency,
      unpaid_count: unpaidCount,
      partial_count: partialCount,
      paid_count: paidCount,
    });
  }, [identity?.id, counterpartyId, counterpartyName, counterpartyAvatarUrl, expenses, expensesLoading]);

  const refetch = () => {
    // Summary will automatically update when expenses refetch
    setSummary(null);
  };

  return { summary, isLoading: expensesLoading, error: expensesError, refetch };
}
