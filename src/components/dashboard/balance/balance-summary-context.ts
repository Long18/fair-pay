import type { Balance } from "./balance-types";

export interface BalanceTotalsSummaryContext {
  peopleCount: number;
  topEntry?: {
    name: string;
    amount: number;
    youOwe: boolean;
  };
}

export function buildBalanceSummaryContext(
  balances: readonly Balance[],
): BalanceTotalsSummaryContext | undefined {
  if (balances.length === 0) return undefined;

  let top: Balance | undefined;
  let topAmt = -1;
  for (const balance of balances) {
    const amt = Math.abs(
      Number(
        balance.remaining_amount !== undefined ? balance.remaining_amount : balance.amount,
      ),
    );
    if (amt > topAmt) {
      topAmt = amt;
      top = balance;
    }
  }

  return {
    peopleCount: balances.length,
    topEntry: top
      ? {
          name: top.counterparty_name,
          amount: topAmt,
          youOwe: top.i_owe_them,
        }
      : undefined,
  };
}
