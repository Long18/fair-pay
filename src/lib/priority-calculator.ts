/**
 * Settlement Priority Calculator
 *
 * Determines which debts should be settled first based on:
 * - Amount owed (higher = more urgent)
 * - Time since last expense (recent activity = higher priority)
 * - Number of expenses (more expenses = more urgent)
 */

export type PriorityLevel = 'high' | 'medium' | 'low';

interface PriorityCalculationParams {
  amount: number;
  lastExpenseDate: string | null;
  expenseCount: number;
}

/**
 * Calculate settlement priority for a debt
 *
 * @param amount - Total amount owed
 * @param lastExpenseDate - Date of most recent expense
 * @param expenseCount - Number of expenses contributing to debt
 * @returns Priority level ('high', 'medium', 'low')
 *
 * @example
 * const priority = calculatePriority({
 *   amount: 500000,
 *   lastExpenseDate: '2026-01-15',
 *   expenseCount: 3
 * }); // 'high'
 */
export function calculatePriority({
  amount,
  lastExpenseDate,
  expenseCount,
}: PriorityCalculationParams): PriorityLevel {
  const daysSinceLastExpense = lastExpenseDate
    ? Math.floor(
        (Date.now() - new Date(lastExpenseDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : Infinity;

  // High priority: Large amount OR very recent activity
  if (amount > 500000 || daysSinceLastExpense < 7) {
    return 'high';
  }

  // Medium priority: Moderate amount OR multiple expenses OR recent activity
  if (amount > 200000 || expenseCount > 5 || daysSinceLastExpense < 14) {
    return 'medium';
  }

  // Low priority: Small amount AND old
  return 'low';
}

/**
 * Get priority label for display
 *
 * @param priority - Priority level
 * @returns Display label with emoji
 */
export function getPriorityLabel(priority: PriorityLevel): string {
  switch (priority) {
    case 'high':
      return 'Priority';
    case 'medium':
      return 'Settle Soon';
    case 'low':
      return 'Can Wait';
  }
}

/**
 * Get priority color classes
 *
 * @param priority - Priority level
 * @returns Tailwind classes for styling
 */
export function getPriorityColors(priority: PriorityLevel): {
  border: string;
  text: string;
  bg: string;
} {
  switch (priority) {
    case 'high':
      return {
        border: 'border-red-500',
        text: 'text-red-700',
        bg: 'bg-red-50',
      };
    case 'medium':
      return {
        border: 'border-yellow-500',
        text: 'text-yellow-700',
        bg: 'bg-yellow-50',
      };
    case 'low':
      return {
        border: 'border-gray-500',
        text: 'text-gray-700',
        bg: 'bg-gray-50',
      };
  }
}

/**
 * Sort debts by priority (high first)
 *
 * @param debts - Array of debts with priority info
 * @returns Sorted array (high → medium → low)
 */
export function sortByPriority<T extends { priority: PriorityLevel }>(
  debts: T[]
): T[] {
  const priorityOrder: Record<PriorityLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...debts].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}
