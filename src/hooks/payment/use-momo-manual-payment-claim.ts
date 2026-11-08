import { useCallback, useState } from 'react';
import { supabaseClient } from '@/utility/supabaseClient';

export type ReportMomoManualPaymentClaimArgs = {
  payeeId: string;
  amount: number;
  expenseSplitId?: string | null;
  expenseId?: string | null;
  currency?: string;
};

export type ReportMomoManualPaymentClaimResult = {
  success: boolean;
  alreadyPending?: boolean;
  notificationSent?: boolean;
  error?: string;
};

function isValidUuid(id: string | null | undefined): id is string {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function buildMomoManualClaimRpcArgs(args: ReportMomoManualPaymentClaimArgs) {
  const splitId = isValidUuid(args.expenseSplitId) ? args.expenseSplitId : null;
  const expenseId = isValidUuid(args.expenseId) ? args.expenseId : null;
  const isDebtPlaceholder = Boolean(splitId && expenseId && splitId === expenseId);

  return {
    p_payee_id: args.payeeId,
    p_amount: args.amount,
    p_expense_split_id: isDebtPlaceholder ? null : splitId,
    p_expense_id: isDebtPlaceholder ? null : expenseId,
    p_currency: args.currency ?? 'VND',
  };
}

export function useMomoManualPaymentClaim() {
  const [isReporting, setIsReporting] = useState(false);

  const reportPaymentClaim = useCallback(
    async (args: ReportMomoManualPaymentClaimArgs): Promise<ReportMomoManualPaymentClaimResult> => {
      setIsReporting(true);
      try {
        const { data, error } = await supabaseClient.rpc(
          'report_momo_manual_payment_claim',
          buildMomoManualClaimRpcArgs(args),
        );

        if (error) {
          return { success: false, error: error.message };
        }

        const payload = data as {
          success?: boolean;
          already_pending?: boolean;
          notification_sent?: boolean;
          error?: string;
        };

        if (!payload?.success) {
          return { success: false, error: payload?.error ?? 'Failed to report payment' };
        }

        return {
          success: true,
          alreadyPending: payload.already_pending === true,
          notificationSent: payload.notification_sent === true,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to report payment';
        return { success: false, error: message };
      } finally {
        setIsReporting(false);
      }
    },
    [],
  );

  return { reportPaymentClaim, isReporting };
}
