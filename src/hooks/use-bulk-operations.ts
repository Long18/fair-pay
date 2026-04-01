import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useUndoManager } from "@/contexts/undo-manager";

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

interface SettleAllResult extends SettleAllGroupDebtsResponse {
  _splitIds: string[];
  _expenseIds: string[];
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
 * Hook to settle all outstanding debts in a group (instant-apply with undo)
 */
export const useSettleAllGroupDebts = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { registerUndo } = useUndoManager();

  return useMutation<SettleAllResult, Error, SettleAllGroupDebtsParams>({
    mutationFn: async (params) => {
      // Pre-fetch affected expense IDs
      const { data: affectedExpenses } = await supabaseClient
        .from("expenses")
        .select("id")
        .eq("group_id", params.groupId)
        .eq("is_payment", false);
      const expenseIds = affectedExpenses?.map((e) => e.id) ?? [];

      // Pre-fetch affected split IDs
      let splitIds: string[] = [];
      if (expenseIds.length > 0) {
        const { data: affectedSplits } = await supabaseClient
          .from("expense_splits")
          .select("id")
          .in("expense_id", expenseIds)
          .eq("is_settled", false);
        splitIds = affectedSplits?.map((s) => s.id) ?? [];
      }

      // Execute RPC immediately
      const { data, error } = await supabaseClient.rpc("settle_all_group_debts", {
        p_group_id: params.groupId,
      });
      if (error) throw new Error(error.message);
      return { ...(data as SettleAllGroupDebtsResponse), _splitIds: splitIds, _expenseIds: expenseIds };
    },
    onSuccess: (data) => {
      registerUndo({
        key: `settle-all:${data.group_id}`,
        actionType: "update",
        message: t(
          "bulk.settleAllSuccess",
          `Settled ${data.splits_settled} debts totaling ₫${data.total_amount.toLocaleString()}`
        ),
        undoFn: async () => {
          if (data._splitIds.length > 0) {
            const { error: splitError } = await supabaseClient
              .from("expense_splits")
              .update({ is_settled: false, settled_at: null, settled_amount: 0 })
              .in("id", data._splitIds);
            if (splitError) throw splitError;
          }
          if (data._expenseIds.length > 0) {
            const { error: expError } = await supabaseClient
              .from("expenses")
              .update({ is_payment: false, updated_at: new Date().toISOString() })
              .in("id", data._expenseIds);
            if (expError) throw expError;
          }
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({ queryKey: ["balance"] });
        },
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (error) => {
      toast.error(
        t("bulk.settleAllError", "Failed to settle debts: {{error}}", {
          error: error.message,
        })
      );
    },
  });
};

/**
 * Hook to delete multiple expenses at once (hard delete, no undo)
 */
export const useBulkDeleteExpenses = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteExpensesResponse, Error, BulkDeleteExpensesParams>({
    mutationFn: async (params) => {
      if (params.expenseIds.length === 0) {
        throw new Error("No expenses selected");
      }
      if (params.expenseIds.length > 50) {
        throw new Error("Cannot delete more than 50 expenses at once");
      }

      const { data, error } = await supabaseClient.rpc("bulk_delete_expenses", {
        p_expense_ids: params.expenseIds,
      });
      if (error) throw new Error(error.message);
      return data as BulkDeleteExpensesResponse;
    },
    onSuccess: (data) => {
      toast.success(
        t("bulk.deleteSuccess", `Deleted ${data.deleted_count} expense(s)`)
      );
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (error) => {
      toast.error(
        t("bulk.deleteError", "Failed to delete expenses: {{error}}", {
          error: error.message,
        })
      );
    },
  });
};

/**
 * Hook to record multiple payments in one transaction (instant-apply with undo)
 */
export const useBatchRecordPayments = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { registerUndo } = useUndoManager();

  return useMutation<BatchRecordPaymentsResponse, Error, BatchRecordPaymentsParams>({
    mutationFn: async (params) => {
      if (params.payments.length === 0) {
        throw new Error("No payments to record");
      }
      if (params.payments.length > 50) {
        throw new Error("Cannot record more than 50 payments at once");
      }

      const { data, error } = await supabaseClient.rpc("batch_record_payments", {
        p_payments: params.payments,
      });
      if (error) throw new Error(error.message);
      return data as BatchRecordPaymentsResponse;
    },
    onSuccess: (data) => {
      registerUndo({
        key: `batch-payments:${data.payment_ids.join(",")}`,
        actionType: "create",
        message: t("bulk.paymentsSuccess", `Recorded ${data.created_count} payment(s)`),
        undoFn: async () => {
          const { error } = await supabaseClient
            .from("expenses")
            .delete()
            .in("id", data.payment_ids);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({ queryKey: ["balance"] });
        },
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });
    },
    onError: (error) => {
      toast.error(
        t("bulk.paymentsError", "Failed to record payments: {{error}}", {
          error: error.message,
        })
      );
    },
  });
};
