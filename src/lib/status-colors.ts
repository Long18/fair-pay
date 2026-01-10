/**
 * Status Color Token System
 * 
 * Centralized status color tokens for consistent visual indicators across the application.
 * This prevents hardcoded Tailwind classes and ensures design system compliance.
 * 
 * @see Requirements 8.1, 8.2, 8.3 - Consistent Status Indicators
 */

/**
 * Payment state color tokens
 * Used for expense payment status (Paid, Unpaid, Partially Paid)
 */
export const paymentStateColors = {
  paid: {
    bg: 'bg-green-100 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  unpaid: {
    bg: 'bg-orange-100 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  partial: {
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
  },
} as const;

/**
 * Owe status color tokens
 * Used for indicating debt direction (you owe, owed to you, neutral)
 */
export const oweStatusColors = {
  owe: {
    bg: 'bg-red-100 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  owed: {
    bg: 'bg-green-100 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  neutral: {
    bg: 'bg-gray-100 dark:bg-gray-950/30',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
  },
} as const;

/**
 * Semantic status color tokens
 * Used for general success/warning/error states
 */
export const semanticStatusColors = {
  success: {
    bg: 'bg-green-100 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
  },
  warning: {
    bg: 'bg-orange-100 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
  },
} as const;

/**
 * Type definitions for status colors
 */
export type PaymentState = keyof typeof paymentStateColors;
export type OweStatus = keyof typeof oweStatusColors;
export type SemanticStatus = keyof typeof semanticStatusColors;

export type StatusColorSet = {
  bg: string;
  text: string;
  border: string;
  icon: string;
};

/**
 * Get payment state colors
 * 
 * @param state - Payment state (paid, unpaid, partial)
 * @returns Color token set for the payment state
 * 
 * @example
 * const colors = getPaymentStateColors('paid');
 * <div className={colors.bg}>
 *   <span className={colors.text}>Paid</span>
 * </div>
 */
export function getPaymentStateColors(state: PaymentState): StatusColorSet {
  return paymentStateColors[state];
}

/**
 * Get owe status colors
 * 
 * @param status - Owe status (owe, owed, neutral)
 * @returns Color token set for the owe status
 * 
 * @example
 * const colors = getOweStatusColors('owe');
 * <div className={colors.bg}>
 *   <ArrowDownIcon className={colors.icon} />
 *   <span className={colors.text}>You owe</span>
 * </div>
 */
export function getOweStatusColors(status: OweStatus): StatusColorSet {
  return oweStatusColors[status];
}

/**
 * Get semantic status colors
 * 
 * @param status - Semantic status (success, warning, error, info)
 * @returns Color token set for the semantic status
 * 
 * @example
 * const colors = getSemanticStatusColors('success');
 * <Alert className={colors.bg}>
 *   <AlertIcon className={colors.icon} />
 *   <span className={colors.text}>Operation successful</span>
 * </Alert>
 */
export function getSemanticStatusColors(status: SemanticStatus): StatusColorSet {
  return semanticStatusColors[status];
}

/**
 * Get owe status from balance amount
 * 
 * @param balance - Balance amount (positive = owed to you, negative = you owe)
 * @returns Owe status
 * 
 * @example
 * const status = getOweStatusFromBalance(-50000); // 'owe'
 * const colors = getOweStatusColors(status);
 */
export function getOweStatusFromBalance(balance: number): OweStatus {
  if (balance > 0) return 'owed';
  if (balance < 0) return 'owe';
  return 'neutral';
}

/**
 * Get payment state from split data
 * 
 * @param settledAmount - Amount settled
 * @param totalAmount - Total amount owed
 * @returns Payment state
 * 
 * @example
 * const state = getPaymentStateFromAmounts(50000, 100000); // 'partial'
 * const colors = getPaymentStateColors(state);
 */
export function getPaymentStateFromAmounts(
  settledAmount: number,
  totalAmount: number
): PaymentState {
  if (settledAmount >= totalAmount) return 'paid';
  if (settledAmount > 0) return 'partial';
  return 'unpaid';
}
