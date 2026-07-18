import { useState } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import type { RecurringFrequency } from "../types/recurring";

export interface UpdateRecurringExpenseFullParams {
  recurringExpenseId: string;
  amount?: number;
  description?: string;
  frequency?: RecurringFrequency;
  interval?: number;
  endDate?: string | null;
  clearEndDate?: boolean;
  /** When true, also sync past generated instances + prepaid. Default false (future-only). */
  updateGeneratedInstances?: boolean;
}

export interface UpdateRecurringExpenseFullResult {
  success: boolean;
  error?: string;
  recurring_id?: string;
  template_id?: string;
  amount?: number;
}

/**
 * Atomically update recurring template (amount/description + splits) and schedule
 * via the update_recurring_expense RPC. Allowed for template creator, group admin,
 * friendship participant, or platform admin.
 */
export function useUpdateRecurringExpenseFull() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateFull = async (
    params: UpdateRecurringExpenseFullParams
  ): Promise<UpdateRecurringExpenseFullResult> => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabaseClient.rpc("update_recurring_expense", {
        p_recurring_expense_id: params.recurringExpenseId,
        p_amount: params.amount ?? null,
        p_description: params.description ?? null,
        p_frequency: params.frequency ?? null,
        p_interval: params.interval ?? null,
        p_end_date: params.endDate ?? null,
        p_clear_end_date: params.clearEndDate ?? false,
        p_update_generated_instances: params.updateGeneratedInstances ?? false,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as UpdateRecurringExpenseFullResult | null;
      if (!result?.success) {
        return {
          success: false,
          error: result?.error ?? "Unknown error",
        };
      }

      return result;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateFull,
    isUpdating,
  };
}
