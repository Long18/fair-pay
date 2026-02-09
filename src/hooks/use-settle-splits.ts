import { useState } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useSettleSplits() {
  const { t } = useTranslation();
  const [isSettling, setIsSettling] = useState(false);

  const settle = async (splitIds: string[]) => {
    if (splitIds.length === 0) {
      toast.error(t('debts.noSplitsSelected', 'No expenses selected'));
      return { success: false };
    }

    setIsSettling(true);

    try {
      // Use RPC to properly set settled_amount = computed_amount
      const { data, error } = await supabaseClient.rpc('settle_splits_batch', {
        p_split_ids: splitIds,
      });

      if (error) throw error;

      toast.success(
        t('debts.settledSuccess', '{{count}} expense(s) marked as settled', {
          count: splitIds.length,
        })
      );

      return { success: true };
    } catch (error) {
      console.error('Error settling splits:', error);
      toast.error(t('debts.settleError', 'Failed to settle expenses'));
      return { success: false };
    } finally {
      setIsSettling(false);
    }
  };

  return { settle, isSettling };
}
