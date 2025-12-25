import { useMemo } from "react";
import { simplifyDebts, DebtEdge } from "@/lib/simplify-debts";
import { UserBalance } from "../types";

export interface SimplifiedBalance {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
}

interface UseSimplifiedBalancesProps {
  balances: UserBalance[];
  simplify?: boolean;
}

interface UseSimplifiedBalancesReturn {
  originalDebts: SimplifiedBalance[];
  simplifiedDebts: SimplifiedBalance[];
  transactionsSaved: number;
  activeDebts: SimplifiedBalance[];  // Either original or simplified based on setting
}

/**
 * Convert user balances to debt edges (who owes whom)
 * Uses greedy matching algorithm to create direct payment relationships
 */
function balancesToDebtEdges(balances: UserBalance[]): DebtEdge[] {
  const debts: DebtEdge[] = [];

  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

  // Create debt edges by matching debtors with creditors
  const creditorsCopy = creditors.map(c => ({ ...c }));
  const debtorsCopy = debtors.map(d => ({ ...d, balance: -d.balance })); // Convert to positive

  let ci = 0;
  let di = 0;

  while (ci < creditorsCopy.length && di < debtorsCopy.length) {
    const creditor = creditorsCopy[ci];
    const debtor = debtorsCopy[di];

    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > 0.01) {
      debts.push({
        from: debtor.user_id,
        to: creditor.user_id,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance < 0.01) ci++;
    if (debtor.balance < 0.01) di++;
  }

  return debts;
}

/**
 * Hook to calculate simplified debts from user balances
 * Optionally applies debt simplification algorithm
 */
export const useSimplifiedBalances = ({
  balances,
  simplify = false,
}: UseSimplifiedBalancesProps): UseSimplifiedBalancesReturn => {
  return useMemo(() => {
    // Convert balances to debt edges
    const originalEdges = balancesToDebtEdges(balances);

    // Apply simplification if enabled
    const { simplified: simplifiedEdges, transactionsSaved } = simplify
      ? simplifyDebts(originalEdges)
      : { simplified: originalEdges, transactionsSaved: 0 };

    // Helper to find user name
    const getUserName = (userId: string) => {
      const user = balances.find(b => b.user_id === userId);
      return user?.user_name || 'Unknown';
    };

    // Convert edges to simplified balance format
    const toSimplifiedBalance = (edge: DebtEdge): SimplifiedBalance => ({
      from_user_id: edge.from,
      from_user_name: getUserName(edge.from),
      to_user_id: edge.to,
      to_user_name: getUserName(edge.to),
      amount: edge.amount,
    });

    const originalDebts = originalEdges.map(toSimplifiedBalance);
    const simplifiedDebts = simplifiedEdges.map(toSimplifiedBalance);

    return {
      originalDebts,
      simplifiedDebts,
      transactionsSaved,
      activeDebts: simplify ? simplifiedDebts : originalDebts,
    };
  }, [balances, simplify]);
};

/**
 * Get debts involving a specific user
 */
export const useMySimplifiedDebts = (
  simplifiedBalances: UseSimplifiedBalancesReturn,
  currentUserId: string
): {
  iOwe: SimplifiedBalance[];
  owesMe: SimplifiedBalance[];
} => {
  return useMemo(() => {
    const { activeDebts } = simplifiedBalances;

    return {
      iOwe: activeDebts.filter(debt => debt.from_user_id === currentUserId),
      owesMe: activeDebts.filter(debt => debt.to_user_id === currentUserId),
    };
  }, [simplifiedBalances, currentUserId]);
};
