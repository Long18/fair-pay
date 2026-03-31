import { useState, useCallback, useRef } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { dispatchSettlementEvent } from '@/lib/settlement-events';
import { useUndoManager } from '@/contexts/undo-manager';

export function useSettleSplits() {
  const { t } = useTranslation();
  const [isSettling, setIsSettling] = useState(false);
  const onSettledRef = useRef<(() => void) | null>(null);
  const { registerUndo } = useUndoManager();

  const settle = useCallback(
    async (splitIds: string[], onSettled?: () => void) => {
      if (splitIds.length === 0) {
        toast.error(t('debts.noSplitsSelected', 'No expenses selected'));
        return { success: false };
      }

      onSettledRef.current = onSettled || null;
      setIsSettling(true);

      try {
        const { data, error } = await supabaseClient.rpc('settle_splits_batch', {
          p_split_ids: splitIds,
        });
        if (error) throw error;

        dispatchSettlementEvent();
        onSettledRef.current?.();

        // Register undo — revert settlement by unsettling the splits
        registerUndo({
          key: `settle:${splitIds.join(',')}`,
          actionType: 'update',
          message: t('debts.settledSuccess', '{{count}} expense(s) settled. Undo?', {
            count: splitIds.length,
          }),
          undoFn: async () => {
            const { error: undoError } = await supabaseClient
              .from('expense_splits')
              .update({ is_settled: false, settled_at: null, settled_amount: 0 })
              .in('id', splitIds);
            if (undoError) throw undoError;
            dispatchSettlementEvent();
            onSettledRef.current?.();
          },
        });

        return { success: true, data };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast.error(t('debts.settleError', 'Failed to settle expenses: {{message}}', { message }));
        return { success: false };
      } finally {
        setIsSettling(false);
      }
    },
    [t, registerUndo],
  );

  return { settle, isSettling };
}
