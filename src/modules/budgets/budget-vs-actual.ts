export interface BudgetRow {
  category: string;
  budgetAmount: number;
  actualAmount: number;
}

export interface BudgetVsActual {
  category: string;
  budgetAmount: number;
  actualAmount: number;
  remaining: number;
  percentUsed: number;
  overBudget: boolean;
}

/**
 * Merge monthly budgets with category spending actuals.
 * Categories with a budget but no spend appear with actual 0.
 * Categories with spend but no budget are omitted (budget-first view).
 */
export function computeBudgetVsActual(
  budgets: Array<{ category: string; amount: number }>,
  actuals: Array<{ category: string; amount: number }>,
): BudgetVsActual[] {
  const actualByCategory = new Map<string, number>();
  for (const row of actuals) {
    const key = row.category.trim();
    if (!key) continue;
    actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + row.amount);
  }

  return budgets
    .map((budget) => {
      const category = budget.category.trim();
      const budgetAmount = Number(budget.amount) || 0;
      const actualAmount = actualByCategory.get(category) ?? 0;
      const remaining = budgetAmount - actualAmount;
      const percentUsed =
        budgetAmount > 0 ? Math.min(999, (actualAmount / budgetAmount) * 100) : actualAmount > 0 ? 100 : 0;
      return {
        category,
        budgetAmount,
        actualAmount,
        remaining,
        percentUsed,
        overBudget: actualAmount > budgetAmount,
      };
    })
    .filter((row) => row.category.length > 0)
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function currentYearMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
