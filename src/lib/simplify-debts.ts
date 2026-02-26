/**
 * Debt Simplification Algorithm
 *
 * This algorithm reduces the number of transactions needed to settle all debts
 * while keeping the total amount each person pays/receives unchanged.
 *
 * Example:
 * - Original: A owes B $20, B owes C $20
 * - Simplified: A owes C $20 (B doesn't need to be involved)
 *
 * Algorithm:
 * 1. Calculate net balance for each person (sum of all debts)
 * 2. Create two groups: creditors (positive balance) and debtors (negative balance)
 * 3. Match debtors with creditors, starting with largest amounts
 * 4. Create direct payments that minimize total number of transactions
 */

export interface DebtEdge {
  from: string;  // user_id who owes
  to: string;    // user_id who is owed
  amount: number;
}

export interface SimplifiedDebts {
  original: DebtEdge[];
  simplified: DebtEdge[];
  transactionsSaved: number;
}

/**
 * Round a number to 2 decimal places
 */
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Simplify debts using greedy algorithm with rounding compensation
 * @param debts Array of debt edges (who owes whom)
 * @returns Simplified debt structure with both original and simplified debts
 */
export function simplifyDebts(debts: DebtEdge[]): SimplifiedDebts {
  if (debts.length === 0) {
    return {
      original: [],
      simplified: [],
      transactionsSaved: 0,
    };
  }

  // Step 1: Calculate net balance for each person, rounded to 2 decimal places (Req 1.2)
  const balances = new Map<string, number>();

  for (const debt of debts) {
    balances.set(debt.from, (balances.get(debt.from) || 0) - debt.amount);
    balances.set(debt.to, (balances.get(debt.to) || 0) + debt.amount);
  }

  // Round all balances to 2 decimal places and zero out near-zero balances (Req 1.3)
  for (const [userId, balance] of balances.entries()) {
    const rounded = roundTo2(balance);
    balances.set(userId, Math.abs(rounded) <= 0.01 ? 0 : rounded);
  }

  // Step 2: Separate into creditors (positive) and debtors (negative)
  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [userId, balance] of balances.entries()) {
    if (balance > 0) {
      creditors.push({ id: userId, amount: balance });
    } else if (balance < 0) {
      debtors.push({ id: userId, amount: -balance });
    }
  }

  // Sort by amount descending (greedy approach - handle largest debts first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Step 3: Match debtors with creditors
  const simplified: DebtEdge[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const paymentAmount = roundTo2(Math.min(creditor.amount, debtor.amount));

    if (paymentAmount > 0) {
      simplified.push({
        from: debtor.id,
        to: creditor.id,
        amount: paymentAmount,
      });
    }

    creditor.amount = roundTo2(creditor.amount - paymentAmount);
    debtor.amount = roundTo2(debtor.amount - paymentAmount);

    if (creditor.amount <= 0.01) creditorIndex++;
    if (debtor.amount <= 0.01) debtorIndex++;
  }

  // Step 4: Rounding compensation (Req 9.5)
  // Check if rounding caused net balance discrepancy > 0.01 for any member
  // and adjust the largest transaction to compensate
  if (simplified.length > 0) {
    const originalBalances = new Map<string, number>();
    for (const debt of debts) {
      originalBalances.set(debt.from, (originalBalances.get(debt.from) || 0) - debt.amount);
      originalBalances.set(debt.to, (originalBalances.get(debt.to) || 0) + debt.amount);
    }

    const simplifiedBalances = new Map<string, number>();
    for (const debt of simplified) {
      simplifiedBalances.set(debt.from, (simplifiedBalances.get(debt.from) || 0) - debt.amount);
      simplifiedBalances.set(debt.to, (simplifiedBalances.get(debt.to) || 0) + debt.amount);
    }

    const allUsers = new Set([...originalBalances.keys(), ...simplifiedBalances.keys()]);

    // Find the user with the largest discrepancy
    let maxDiscrepancyUser: string | null = null;
    let maxDiscrepancy = 0;

    for (const userId of allUsers) {
      const origBalance = roundTo2(originalBalances.get(userId) || 0);
      const simpBalance = roundTo2(simplifiedBalances.get(userId) || 0);
      const discrepancy = Math.abs(origBalance - simpBalance);

      if (discrepancy > 0.01 && discrepancy > maxDiscrepancy) {
        maxDiscrepancy = discrepancy;
        maxDiscrepancyUser = userId;
      }
    }

    if (maxDiscrepancyUser !== null) {
      const origBalance = roundTo2(originalBalances.get(maxDiscrepancyUser) || 0);
      const simpBalance = roundTo2(simplifiedBalances.get(maxDiscrepancyUser) || 0);
      const adjustment = roundTo2(origBalance - simpBalance);

      // Find the largest transaction involving this user and adjust it
      let largestIdx = -1;
      let largestAmount = 0;

      for (let i = 0; i < simplified.length; i++) {
        const edge = simplified[i];
        if ((edge.from === maxDiscrepancyUser || edge.to === maxDiscrepancyUser) && edge.amount > largestAmount) {
          largestAmount = edge.amount;
          largestIdx = i;
        }
      }

      if (largestIdx >= 0) {
        const edge = simplified[largestIdx];
        // If user is a debtor (from), they need more negative balance → increase amount
        // If user is a creditor (to), they need more positive balance → increase amount
        if (edge.from === maxDiscrepancyUser) {
          // User is debtor: origBalance is more negative than simpBalance → adjustment < 0
          // Need to increase the debt amount (make balance more negative)
          edge.amount = roundTo2(edge.amount - adjustment);
        } else {
          // User is creditor: origBalance is more positive than simpBalance → adjustment > 0
          // Need to increase the credit amount (make balance more positive)
          edge.amount = roundTo2(edge.amount + adjustment);
        }

        // Remove edge if amount became zero or negative
        if (edge.amount <= 0) {
          simplified.splice(largestIdx, 1);
        }
      }
    }
  }

  return {
    original: debts,
    simplified,
    transactionsSaved: Math.max(0, debts.length - simplified.length),
  };
}

/**
 * Check if two debt structures are equivalent (same net balances)
 * Used for testing and validation
 */
export function areDebtsEquivalent(debts1: DebtEdge[], debts2: DebtEdge[]): boolean {
  const getBalances = (debts: DebtEdge[]): Map<string, number> => {
    const balances = new Map<string, number>();
    for (const debt of debts) {
      balances.set(debt.from, (balances.get(debt.from) || 0) - debt.amount);
      balances.set(debt.to, (balances.get(debt.to) || 0) + debt.amount);
    }
    return balances;
  };

  const balances1 = getBalances(debts1);
  const balances2 = getBalances(debts2);

  // Check if all users have same balance in both structures
  const allUsers = new Set([...balances1.keys(), ...balances2.keys()]);

  for (const userId of allUsers) {
    const balance1 = balances1.get(userId) || 0;
    const balance2 = balances2.get(userId) || 0;

    if (Math.abs(balance1 - balance2) > 0.01) {
      return false;
    }
  }

  return true;
}

/**
 * Format debt edge for display
 */
export function formatDebtEdge(debt: DebtEdge, getUserName: (id: string) => string): string {
  return `${getUserName(debt.from)} owes ${getUserName(debt.to)} ${debt.amount.toFixed(2)}`;
}
