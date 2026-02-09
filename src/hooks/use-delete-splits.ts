import { useState } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useDeleteSplits() {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteSplits = async (splitIds: string[]) => {
    if (splitIds.length === 0) {
      toast.error(t('debts.noSplitsSelected', 'No expenses selected'));
      return { success: false };
    }

    setIsDeleting(true);

    try {
      // Get unique expense IDs for these splits
      const { data: splits, error: fetchError } = await supabaseClient
        .from('expense_splits')
        .select('expense_id')
        .in('id', splitIds);

      if (fetchError) throw fetchError;

      const expenseIds = [...new Set(splits?.map(s => s.expense_id) || [])];

      if (expenseIds.length === 0) {
        throw new Error('No expenses found for selected splits');
      }

      // Use bulk_delete_expenses RPC (handles RLS + cascade)
      const { data, error } = await supabaseClient.rpc(
        'bulk_delete_expenses',
        { p_expense_ids: expenseIds }
      );

      if (error) throw error;

      toast.success(
        t('debts.deleteSuccess', '{{count}} expense(s) deleted', {
          count: data?.deleted_count || expenseIds.length,
        })
      );

      return { success: true };
    } catch (error) {
      console.error('Error deleting splits:', error);
      toast.error(t('debts.deleteError', 'Failed to delete expenses'));
      return { success: false };
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteSplits, isDeleting };
}
