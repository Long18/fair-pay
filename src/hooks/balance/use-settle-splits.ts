import { useState, useCallback, useRef } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { dispatchSettlementEvent } from '@/lib/settlement-events';
import { useUndoableMutation } from '@/hooks/use-undoable-mutation';

export function useSettleSplits() {
  const { t } = useTranslation();
  const [isSettling, setIsSettling] = useState(false);
  const onSettledRef = useRef<(() => void) | null>(null);

  const { mutate: undoableSettle } = useUndoableMutation<string[], unknown>({
    mutationFn: async (splitIds) => {
      setIsSettling(true);
      try {
        const { data, error } = await supabaseClient.rpc('settle_splits_batch', {
          p_split_ids: splitIds,
        });
        if (error) throw error;
        dispatchSettlementEvent();
        onSettledRef.current?.();
        return data;
      } finally {
        setIsSettling(false);
      }
    },
    pendingMessage: (splitIds) =>
      t('debts.settlingPending', 'Settling {{count}} expense(s)... Click Undo to cancel', {
        count: splitIds.length,
      }),
    successMessage: (splitIds) =>
      t('debts.settledSuccess', '{{count}} expense(s) marked as settled', {
        count: splitIds.length,
      }),
    errorMessage: () => t('debts.settleError', 'Failed to settle expenses'),
  });

  const settle = useCallback(
    async (splitIds: string[], onSettled?: () => void) => {
      if (splitIds.length === 0) {
        toast.error(t('debts.noSplitsSelected', 'No expenses selected'));
        return { success: false };
      }
      onSettledRef.current = onSettled || null;
      undoableSettle(splitIds);
      return { success: true };
    },
    [t, undoableSettle]
  );

  return { settle, isSettling };
}
