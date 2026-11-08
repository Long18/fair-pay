import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";

interface DebtPaymentPayee {
  payeeId: string;
  payeeName: string;
  allowSepay: boolean;
}

interface IOweExpenseRef {
  expense_id: string;
  my_share: number;
  settled_amount: number;
  direction: "i_owe" | "they_owe";
  is_settled: boolean;
}

/**
 * Resolves the VietQR/SePay recipient for aggregate debt payment (matches expense detail payout RPC).
 */
export function useDebtPaymentPayee(
  counterpartyId: string | undefined,
  counterpartyName: string | undefined,
  expenses: IOweExpenseRef[],
  totalIOwe: number,
): DebtPaymentPayee | null {
  const primaryExpenseId = useMemo(() => {
    const openIOwe = expenses.filter(
      (expense) =>
        expense.direction === "i_owe" &&
        !expense.is_settled &&
        expense.my_share > (expense.settled_amount || 0),
    );
    if (openIOwe.length === 0) return null;
    return openIOwe.reduce((largest, expense) =>
      expense.my_share > largest.my_share ? expense : largest,
    ).expense_id;
  }, [expenses]);

  const fallback = useMemo((): DebtPaymentPayee | null => {
    if (!counterpartyId || !counterpartyName || totalIOwe <= 0) return null;
    return {
      payeeId: counterpartyId,
      payeeName: counterpartyName,
      allowSepay: true,
    };
  }, [counterpartyId, counterpartyName, totalIOwe]);

  const { data } = useQuery({
    queryKey: ["debt", "payment-payee", counterpartyId, primaryExpenseId],
    queryFn: async (): Promise<DebtPaymentPayee> => {
      if (!counterpartyId || !counterpartyName) {
        throw new Error("Missing counterparty");
      }

      const base: DebtPaymentPayee = {
        payeeId: counterpartyId,
        payeeName: counterpartyName,
        allowSepay: true,
      };

      if (!primaryExpenseId) return base;

      const { data: rpcData, error } = await supabaseClient.rpc("get_expense_payout_recipient", {
        p_expense_id: primaryExpenseId,
      });

      if (error || !rpcData) return base;

      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!row?.user_id) return base;

      return {
        payeeId: row.user_id as string,
        payeeName: (row.full_name as string) || counterpartyName,
        allowSepay: row.uses_moderator_payout !== true,
      };
    },
    enabled: Boolean(counterpartyId && counterpartyName && totalIOwe > 0),
    staleTime: 60_000,
    placeholderData: fallback ?? undefined,
  });

  return data ?? fallback;
}
