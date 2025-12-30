import { useCustomMutation } from "@refinedev/core";
import { supabaseClient } from "@/utility/supabaseClient";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
 * Hook to settle all outstanding debts in a group
 * Only group admins can perform this operation
 */
export const useSettleAllGroupDebts = () => {
  const { t } = useTranslation();

  return useCustomMutation<
    SettleAllGroupDebtsResponse,
    Error,
    SettleAllGroupDebtsParams
  >({
    mutationOptions: {
      mutationFn: async ({ groupId }) => {
        const { data, error } = await supabaseClient.rpc(
          "settle_all_group_debts",
          {
            p_group_id: groupId,
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        return data as SettleAllGroupDebtsResponse;
      },
      onSuccess: (data) => {
        toast.success(
          t(
            "bulk.settleAllSuccess",
            `Settled ${data.splits_settled} debts totaling ₫${data.total_amount.toLocaleString()}`
          )
        );
      },
      onError: (error) => {
        toast.error(
          t("bulk.settleAllError", "Failed to settle debts: {{error}}", {
            error: error.message,
          })
        );
      },
    },
  });
};

/**
 * Hook to delete multiple expenses at once
 * Max 50 expenses at a time
 * Only expense creators or group admins can delete
 */
export const useBulkDeleteExpenses = () => {
  const { t } = useTranslation();

  return useCustomMutation<
    BulkDeleteExpensesResponse,
    Error,
    BulkDeleteExpensesParams
  >({
    mutationOptions: {
      mutationFn: async ({ expenseIds }) => {
        if (expenseIds.length === 0) {
          throw new Error("No expenses selected");
        }

        if (expenseIds.length > 50) {
          throw new Error("Cannot delete more than 50 expenses at once");
        }

        const { data, error } = await supabaseClient.rpc(
          "bulk_delete_expenses",
          {
            p_expense_ids: expenseIds,
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        return data as BulkDeleteExpensesResponse;
      },
      onSuccess: (data) => {
        toast.success(
          t(
            "bulk.deleteSuccess",
            `Deleted ${data.deleted_count} expense(s)`
          )
        );
      },
      onError: (error) => {
        toast.error(
          t("bulk.deleteError", "Failed to delete expenses: {{error}}", {
            error: error.message,
          })
        );
      },
    },
  });
};

/**
 * Hook to record multiple payments in one transaction
 * Max 50 payments at a time
 */
export const useBatchRecordPayments = () => {
  const { t } = useTranslation();

  return useCustomMutation<
    BatchRecordPaymentsResponse,
    Error,
    BatchRecordPaymentsParams
  >({
    mutationOptions: {
      mutationFn: async ({ payments }) => {
        if (payments.length === 0) {
          throw new Error("No payments to record");
        }

        if (payments.length > 50) {
          throw new Error("Cannot record more than 50 payments at once");
        }

        const { data, error } = await supabaseClient.rpc(
          "batch_record_payments",
          {
            p_payments: payments,
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        return data as BatchRecordPaymentsResponse;
      },
      onSuccess: (data) => {
        toast.success(
          t(
            "bulk.paymentsSuccess",
            `Recorded ${data.created_count} payment(s)`
          )
        );
      },
      onError: (error) => {
        toast.error(
          t("bulk.paymentsError", "Failed to record payments: {{error}}", {
            error: error.message,
          })
        );
      },
    },
  });
};

