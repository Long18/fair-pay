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
 * Simplify debts using greedy algorithm
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

  // Step 1: Calculate net balance for each person
  const balances = new Map<string, number>();

  for (const debt of debts) {
    // Debtor loses money (negative balance)
    balances.set(debt.from, (balances.get(debt.from) || 0) - debt.amount);
    // Creditor gains money (positive balance)
    balances.set(debt.to, (balances.get(debt.to) || 0) + debt.amount);
  }

  // Step 2: Separate into creditors (positive) and debtors (negative)
  const creditors: Array<{ id: string; amount: number }> = [];
  const debtors: Array<{ id: string; amount: number }> = [];

  for (const [userId, balance] of balances.entries()) {
    if (balance > 0.01) {  // Creditor (owed money)
      creditors.push({ id: userId, amount: balance });
    } else if (balance < -0.01) {  // Debtor (owes money)
      debtors.push({ id: userId, amount: -balance });  // Store as positive
    }
    // Skip if balance is ~0 (already settled)
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

    // Determine payment amount (minimum of what's owed and what's needed)
    const paymentAmount = Math.min(creditor.amount, debtor.amount);

    // Create simplified debt edge
    simplified.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(paymentAmount * 100) / 100,  // Round to 2 decimals
    });

    // Update remaining amounts
    creditor.amount -= paymentAmount;
    debtor.amount -= paymentAmount;

    // Move to next creditor/debtor if current one is settled
    if (creditor.amount < 0.01) creditorIndex++;
    if (debtor.amount < 0.01) debtorIndex++;
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

