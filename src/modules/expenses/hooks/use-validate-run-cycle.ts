import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { RecurringExpense } from '../types/recurring';

export interface ValidateRunCycleResult {
  success: boolean;
  skipped: boolean;
  alreadyExecuted: boolean;
  instance_id?: string;
  cycle_date?: string;
  next_occurrence?: string;
  deactivated?: boolean;
  reason?: string;
  error?: string;
}

export function useValidateRunCycle() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const validateAndRun = async (
    recurring: RecurringExpense,
    cycleDate?: string
  ): Promise<ValidateRunCycleResult> => {
    setIsRunning(true);

    try {
      // Target cycle date — defaults to next_occurrence (the pending cycle)
      const targetDate = cycleDate ?? recurring.next_occurrence.split('T')[0];

      const { data, error } = await supabaseClient.rpc(
        'process_single_recurring_instance',
        {
          p_recurring_expense_id: recurring.id,
          p_cycle_date: targetDate,
        }
      );

      if (error) throw error;

      const result = data as Record<string, unknown>;

      if (!result.success) {
        const errMsg = (result.error as string) ?? t('recurring.cycle.unknownError', 'Unknown error occurred');
        toast.error(t('recurring.cycle.executionFailed', 'Cycle execution failed: {{error}}', { error: errMsg }));
        return {
          success: false,
          skipped: false,
          alreadyExecuted: false,
          error: errMsg,
          cycle_date: targetDate,
        };
      }

      // Invalidate queries so the card refreshes with updated next_occurrence + last_created_at
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      ]);

      if (result.skipped) {
        toast.info(
          t('recurring.cycle.alreadyExecuted', 'Cycle already executed — no duplicate created')
        );
        return {
          success: true,
          skipped: true,
          alreadyExecuted: true,
          cycle_date: targetDate,
          reason: result.reason as string | undefined,
        };
      }

      toast.success(
        t('recurring.cycle.executionSuccess', 'Cycle executed successfully for {{date}}', {
          date: targetDate,
        })
      );

      return {
        success: true,
        skipped: false,
        alreadyExecuted: false,
        instance_id: result.instance_id as string | undefined,
        cycle_date: targetDate,
        next_occurrence: result.next_occurrence as string | undefined,
        deactivated: result.deactivated as boolean | undefined,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('recurring.cycle.executionFailed', 'Cycle execution failed: {{error}}', { error: errMsg }));
      return {
        success: false,
        skipped: false,
        alreadyExecuted: false,
        error: errMsg,
      };
    } finally {
      setIsRunning(false);
    }
  };

  return { validateAndRun, isRunning };
}
