import { useMemo } from "react";
import type { Balance } from "./balance-types";

export interface BalanceTotals {
  youOwe: number;
  owedToYou: number;
  net: number;
  currency: string;
}

export function getBalanceTotals(balances: Balance[]): BalanceTotals {
  let youOwe = 0;
  let owedToYou = 0;
  for (const balance of balances) {
    const amount = Number(
      balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount,
    );
    if (balance.i_owe_them) {
      youOwe += amount;
    } else {
      owedToYou += amount;
    }
  }
  return {
    youOwe,
    owedToYou,
    net: owedToYou - youOwe,
    currency: balances[0]?.currency || "VND",
  };
}

export function useBalanceTotals(balances: Balance[]): BalanceTotals {
  return useMemo(() => getBalanceTotals(balances), [balances]);
}
