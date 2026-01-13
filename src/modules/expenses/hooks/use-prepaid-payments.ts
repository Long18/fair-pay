import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { RecurringPrepaidPayment } from '../types/recurring';

/**
 * Response from get_prepaid_payment_history RPC
 */
interface PrepaidPaymentHistoryRow {
  id: string;
  payment_date: string;
  periods_covered: number;
  amount: number;
  coverage_from: string;
  coverage_to: string;
  expense_id: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  total_prepaid_amount: number;
}

/**
 * Extended prepaid payment with creator name
 */
export interface PrepaidPaymentWithCreator extends RecurringPrepaidPayment {
  created_by_name: string;
}

interface UsePrepaidPaymentsResult {
  payments: PrepaidPaymentWithCreator[];
  totalPrepaidAmount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch prepaid payment history for a recurring expense
 * 
 * @param recurringExpenseId - The ID of the recurring expense
 * @returns Prepaid payments, total amount, loading state, and error
 * 
 * Requirements: 6.2, 6.4
 */
export function usePrepaidPayments(
  recurringExpenseId: string | undefined
): UsePrepaidPaymentsResult {
  const [payments, setPayments] = useState<PrepaidPaymentWithCreator[]>([]);
  const [totalPrepaidAmount, setTotalPrepaidAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!recurringExpenseId) {
      setPayments([]);
      setTotalPrepaidAmount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabaseClient.rpc(
        'get_prepaid_payment_history',
        { p_recurring_expense_id: recurringExpenseId }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const historyRows = (data || []) as PrepaidPaymentHistoryRow[];

      // Map to PrepaidPaymentWithCreator format
      const mappedPayments: PrepaidPaymentWithCreator[] = historyRows.map((row) => ({
        id: row.id,
        recurring_expense_id: recurringExpenseId,
        payment_date: row.payment_date,
        periods_covered: row.periods_covered,
        amount: row.amount,
        coverage_from: row.coverage_from,
        coverage_to: row.coverage_to,
        expense_id: row.expense_id,
        created_by: row.created_by,
        created_by_name: row.created_by_name,
        created_at: row.created_at,
      }));

      setPayments(mappedPayments);

      // Total is the same for all rows, take from first row or default to 0
      const total = historyRows.length > 0 ? historyRows[0].total_prepaid_amount : 0;
      setTotalPrepaidAmount(total);
    } catch (err) {
      console.error('Error fetching prepaid payments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch prepaid payments'));
    } finally {
      setIsLoading(false);
    }
  }, [recurringExpenseId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    totalPrepaidAmount,
    isLoading,
    error,
    refetch: fetchPayments,
  };
}
