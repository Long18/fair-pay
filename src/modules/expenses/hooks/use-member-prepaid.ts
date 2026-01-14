import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type {
  MemberPrepaidInput,
  RecordMemberPrepaidResult,
  RecordMultiMemberPrepaidResult,
} from '../types/prepaid';

interface RecordMemberPrepaidParams {
  recurringExpenseId: string;
  userId: string;
  months: number;
  paidByUserId?: string;
}

interface RecordMultiMemberPrepaidParams {
  recurringExpenseId: string;
  memberMonths: MemberPrepaidInput[];
  paidByUserId?: string;
}

export function useMemberPrepaid() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);

  const recordSingleMember = async (params: RecordMemberPrepaidParams) => {
    setIsRecording(true);
    try {
      const { data, error } = await supabaseClient.rpc('record_member_prepaid', {
        p_recurring_expense_id: params.recurringExpenseId,
        p_user_id: params.userId,
        p_months: params.months,
        p_paid_by_user_id: params.paidByUserId || null,
      });

      if (error) throw error;

      const result = data as RecordMemberPrepaidResult;

      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['member_prepaid_info'] }),
      ]);

      toast.success(
        t('prepaid.recordSuccess', 'Prepaid {{months}} month(s) for member', {
          months: params.months,
        })
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Error recording member prepaid:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('prepaid.recordError', 'Failed to record prepaid: {{error}}', {
        error: errorMessage,
      }));
      return { success: false, error };
    } finally {
      setIsRecording(false);
    }
  };

  const recordMultiMember = async (params: RecordMultiMemberPrepaidParams) => {
    setIsRecording(true);
    try {
      const { data, error } = await supabaseClient.rpc('record_multi_member_prepaid', {
        p_recurring_expense_id: params.recurringExpenseId,
        p_member_months: params.memberMonths,
        p_paid_by_user_id: params.paidByUserId || null,
      });

      if (error) throw error;

      const result = data as RecordMultiMemberPrepaidResult;

      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['member_prepaid_info'] }),
      ]);

      // Show appropriate success message
      if (result.success_count === params.memberMonths.length) {
        toast.success(
          t('prepaid.multiRecordSuccess', 'Prepaid recorded for {{count}} member(s)', {
            count: result.success_count,
          })
        );
      } else if (result.success_count > 0) {
        toast.warning(
          t('prepaid.partialSuccess', 'Prepaid recorded for {{success}} of {{total}} member(s)', {
            success: result.success_count,
            total: params.memberMonths.length,
          })
        );
      } else {
        toast.error(t('prepaid.allFailed', 'Failed to record prepaid for all members'));
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Error recording multi-member prepaid:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(t('prepaid.recordError', 'Failed to record prepaid: {{error}}', {
        error: errorMessage,
      }));
      return { success: false, error };
    } finally {
      setIsRecording(false);
    }
  };

  return {
    recordSingleMember,
    recordMultiMember,
    isRecording,
  };
}
