import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Response from record_prepaid_payment RPC
 */
interface RecordPrepaidPaymentResponse {
  success: boolean;
  payment_id: string;
  expense_id: string;
  coverage_from: string;
  coverage_to: string;
  prepaid_until: string;
  periods_covered: number;
  amount: number;
}

/**
 * Parameters for recording a prepaid payment
 */
interface RecordPrepaidPaymentParams {
  recurringExpenseId: string;
  periodsCount: number;
  amount: number;
  paidByUserId?: string;
}

/**
 * Result of the record prepaid payment operation
 */
interface RecordPrepaidPaymentResult {
  success: boolean;
  data?: RecordPrepaidPaymentResponse;
  error?: string;
}

interface UseRecordPrepaidPaymentResult {
  recordPayment: (params: RecordPrepaidPaymentParams) => Promise<RecordPrepaidPaymentResult>;
  isRecording: boolean;
}

/**
 * Hook to record a prepaid payment for a recurring expense
 * 
 * Calls the record_prepaid_payment RPC function which:
 * - Creates an expense record for the prepaid amount
 * - Creates a prepaid payment record
 * - Updates the recurring expense prepaid_until date
 * 
 * Requirements: 1.3, 1.4
 */
export function useRecordPrepaidPayment(): UseRecordPrepaidPaymentResult {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);

  const recordPayment = async (
    params: RecordPrepaidPaymentParams
  ): Promise<RecordPrepaidPaymentResult> => {
    const { recurringExpenseId, periodsCount, amount, paidByUserId } = params;

    // Client-side validation
    if (periodsCount < 1) {
      const errorMsg = t('prepaid.invalidPeriodCount', 'Period count must be at least 1');
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    if (amount <= 0) {
      const errorMsg = t('prepaid.invalidAmount', 'Amount must be greater than 0');
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsRecording(true);

    try {
      const { data, error: rpcError } = await supabaseClient.rpc(
        'record_prepaid_payment',
        {
          p_recurring_expense_id: recurringExpenseId,
          p_periods_count: periodsCount,
          p_amount: amount,
          p_paid_by_user_id: paidByUserId || null,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const response = data as RecordPrepaidPaymentResponse;

      if (!response.success) {
        throw new Error('Failed to record prepaid payment');
      }

      // Invalidate related queries to refresh data
      await Promise.all([
        // Invalidate recurring expenses list
        queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] }),
        // Invalidate specific recurring expense
        queryClient.invalidateQueries({ 
          queryKey: ['recurring_expenses', recurringExpenseId] 
        }),
        // Invalidate expenses list (new expense was created)
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      ]);

      toast.success(
        t('prepaid.recordSuccess', 'Prepaid {{count}} period(s) successfully', {
          count: periodsCount,
        })
      );

      return { success: true, data: response };
    } catch (err) {
      console.error('Error recording prepaid payment:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Handle specific error messages from the RPC function
      let userFriendlyMessage: string;
      if (errorMessage.includes('Period count must be at least 1')) {
        userFriendlyMessage = t('prepaid.invalidPeriodCount', 'Period count must be at least 1');
      } else if (errorMessage.includes('Amount must be greater than 0')) {
        userFriendlyMessage = t('prepaid.invalidAmount', 'Amount must be greater than 0');
      } else if (errorMessage.includes('Recurring expense not found')) {
        userFriendlyMessage = t('prepaid.recurringNotFound', 'Recurring expense not found');
      } else if (errorMessage.includes('inactive recurring expense')) {
        userFriendlyMessage = t('prepaid.inactiveRecurring', 'Cannot prepay for inactive recurring expense');
      } else if (errorMessage.includes('permission')) {
        userFriendlyMessage = t('prepaid.noPermission', 'You do not have permission to prepay this expense');
      } else {
        userFriendlyMessage = t('prepaid.recordError', 'Failed to record prepaid payment');
      }

      toast.error(userFriendlyMessage);
      return { success: false, error: userFriendlyMessage };
    } finally {
      setIsRecording(false);
    }
  };

  return {
    recordPayment,
    isRecording,
  };
}
