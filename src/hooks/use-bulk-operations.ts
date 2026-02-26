import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { createElement } from "react";
import { UndoableNotification } from "@/components/refine-ui/notification/undoable-notification";

const UNDO_TIMEOUT = 10;

// Helper: wraps an async fn with an undoable delay toast
function undoableDelay<T>(
  message: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let cancelled = false;
    const toastId = `undoable-bulk-${Date.now()}`;

    const cancel = () => {
      cancelled = true;
      toast.dismiss(toastId);
      reject(new UndoCancelledError());
    };

    toast(
      () =>
        createElement(UndoableNotification, {
          message,
          undoableTimeout: UNDO_TIMEOUT,
          cancelMutation: cancel,
          onClose: () => toast.dismiss(toastId),
        }),
      { id: toastId, duration: UNDO_TIMEOUT * 1000 + 500, unstyled: true }
    );

    setTimeout(async () => {
      toast.dismiss(toastId);
      if (cancelled) return;
      try {
        resolve(await fn());
      } catch (err) {
        reject(err);
      }
    }, UNDO_TIMEOUT * 1000);
  });
}

/** Sentinel error for cancelled undo operations */
class UndoCancelledError extends Error {
  constructor() {
    super("Action cancelled by user");
    this.name = "UndoCancelledError";
  }
}

interface SettleAllGroupDebtsParams {
  groupId: string;
}

interface SettleAllGroupDebtsResponse {
  success: boolean;
  group_id: string;
  splits_settled: number;
  expenses_settled: number;
  total_amount: number;
  message: string;
}

interface BulkDeleteExpensesParams {
  expenseIds: string[];
}

interface BulkDeleteExpensesResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

interface Payment {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  description?: string;
  group_id?: string;
  friendship_id?: string;
}

interface BatchRecordPaymentsParams {
  payments: Payment[];
}

interface BatchRecordPaymentsResponse {
  success: boolean;
  created_count: number;
  payment_ids: string[];
  message: string;
}

/**
 * Hook to settle all outstanding debts in a group (with 10s undo)
 */
export const useSettleAllGroupDebts = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation<SettleAllGroupDebtsResponse, Error, SettleAllGroupDebtsParams>({
    mutationFn: (params) =>
      undoableDelay(
        t("bulk.settleAllPending", "Settling all group debts... Click Undo to cancel"),
        async () => {
          const { data, error } = await supabaseClient.rpc("settle_all_group_debts", {
            p_group_id: params.groupId,
          });
          if (error) throw new Error(error.message);
          return data as SettleAllGroupDebtsResponse;
        }
      ),
    onSuccess: (data) => {
      toast.success(
        t(
          "bulk.settleAllSuccess",
          `Settled ${data.splits_settled} debts totaling ₫${data.total_amount.toLocaleString()}`
        )
      );
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (error) => {
      if (error instanceof UndoCancelledError) {
        toast.info(t("common.actionCancelled", "Action cancelled"));
        return;
      }
      toast.error(
        t("bulk.settleAllError", "Failed to settle debts: {{error}}", {
          error: error.message,
        })
      );
    },
  });
};

/**
 * Hook to delete multiple expenses at once (with 10s undo)
 */
export const useBulkDeleteExpenses = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteExpensesResponse, Error, BulkDeleteExpensesParams>({
    mutationFn: (params) => {
      if (params.expenseIds.length === 0) {
        return Promise.reject(new Error("No expenses selected"));
      }
      if (params.expenseIds.length > 50) {
        return Promise.reject(new Error("Cannot delete more than 50 expenses at once"));
      }

      return undoableDelay(
        t("bulk.deletePending", "Deleting {{count}} expense(s)... Click Undo to cancel", {
          count: params.expenseIds.length,
        }),
        async () => {
          const { data, error } = await supabaseClient.rpc("bulk_delete_expenses", {
            p_expense_ids: params.expenseIds,
          });
          if (error) throw new Error(error.message);
          return data as BulkDeleteExpensesResponse;
        }
      );
    },
    onSuccess: (data) => {
      toast.success(
        t("bulk.deleteSuccess", `Deleted ${data.deleted_count} expense(s)`)
      );
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (error) => {
      if (error instanceof UndoCancelledError) {
        toast.info(t("common.actionCancelled", "Action cancelled"));
        return;
      }
      toast.error(
        t("bulk.deleteError", "Failed to delete expenses: {{error}}", {
          error: error.message,
        })
      );
    },
  });
};

/**
 * Hook to record multiple payments in one transaction (with 10s undo)
 */
export const useBatchRecordPayments = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation<BatchRecordPaymentsResponse, Error, BatchRecordPaymentsParams>({
    mutationFn: (params) => {
      if (params.payments.length === 0) {
        return Promise.reject(new Error("No payments to record"));
      }
      if (params.payments.length > 50) {
        return Promise.reject(new Error("Cannot record more than 50 payments at once"));
      }

      return undoableDelay(
        t("bulk.paymentsPending", "Recording {{count}} payment(s)... Click Undo to cancel", {
          count: params.payments.length,
        }),
        async () => {
          const { data, error } = await supabaseClient.rpc("batch_record_payments", {
            p_payments: params.payments,
          });
          if (error) throw new Error(error.message);
          return data as BatchRecordPaymentsResponse;
        }
      );
    },
    onSuccess: (data) => {
      toast.success(
        t("bulk.paymentsSuccess", `Recorded ${data.created_count} payment(s)`)
      );
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (error) => {
      if (error instanceof UndoCancelledError) {
        toast.info(t("common.actionCancelled", "Action cancelled"));
        return;
      }
      toast.error(
        t("bulk.paymentsError", "Failed to record payments: {{error}}", {
          error: error.message,
        })
      );
    },
  });
};
