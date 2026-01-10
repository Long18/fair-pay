/**
 * Payment Utilities
 * 
 * Helper functions for calculating payment states and partial payment percentages.
 * Used across the application for consistent payment state display.
 * 
 * @see .kiro/specs/transaction-clarity-ux-improvements/PARTIAL-PAYMENT-SEMANTICS.md
 */

/**
 * Payment state type definition
 */
export type PaymentState = 'paid' | 'unpaid' | 'partial';

/**
 * Calculate the partial payment percentage
 * 
 * Formula: (settled_amount / computed_amount) × 100
 * 
 * @param settledAmount - The cumulative amount that has been settled
 * @param computedAmount - The total amount owed for the split
 * @returns Percentage as a number (0-100), rounded to 1 decimal place
 * 
 * @example
 * calculatePartialPercentage(50000, 100000) // Returns 50.0
 * calculatePartialPercentage(33333, 100000) // Returns 33.3
 * calculatePartialPercentage(0, 100000)     // Returns 0.0
 */
export function calculatePartialPercentage(
  settledAmount: number,
  computedAmount: number
): number {
  // Validate inputs
  if (computedAmount <= 0) {
    console.warn('calculatePartialPercentage: computedAmount must be > 0');
    return 0;
  }

  if (settledAmount < 0) {
    console.warn('calculatePartialPercentage: settledAmount cannot be negative');
    return 0;
  }

  // Calculate percentage
  const percentage = (settledAmount / computedAmount) * 100;

  // Round to 1 decimal place
  return Math.round(percentage * 10) / 10;
}

/**
 * Determine the payment state of a split
 * 
 * States:
 * - 'unpaid': No payment has been made (is_settled = false)
 * - 'partial': Some payment made but not full amount (0 < settled_amount < computed_amount)
 * - 'paid': Full payment received (settled_amount >= computed_amount)
 * 
 * @param isSettled - Boolean flag indicating if any settlement has occurred
 * @param settledAmount - The cumulative amount that has been settled
 * @param computedAmount - The total amount owed for the split
 * @returns Payment state: 'paid', 'unpaid', or 'partial'
 * 
 * @example
 * getPaymentState(false, 0, 100000)       // Returns 'unpaid'
 * getPaymentState(true, 50000, 100000)    // Returns 'partial'
 * getPaymentState(true, 100000, 100000)   // Returns 'paid'
 * getPaymentState(true, 100001, 100000)   // Returns 'paid' (overpayment treated as paid)
 */
export function getPaymentState(
  isSettled: boolean,
  settledAmount: number,
  computedAmount: number
): PaymentState {
  // Not settled at all
  if (!isSettled) {
    return 'unpaid';
  }

  // Validate amounts
  const settled = settledAmount || 0;
  const computed = computedAmount || 0;

  // Fully paid (or overpaid due to rounding)
  // Use small epsilon (0.01) to handle floating point precision issues
  if (settled >= computed - 0.01) {
    return 'paid';
  }

  // Partially paid
  if (settled > 0 && settled < computed) {
    return 'partial';
  }

  // Edge case: is_settled = true but settled_amount = 0
  // Treat as unpaid (data inconsistency)
  return 'unpaid';
}

/**
 * Calculate the remaining amount to be paid
 * 
 * @param settledAmount - The cumulative amount that has been settled
 * @param computedAmount - The total amount owed for the split
 * @returns Remaining amount (always >= 0)
 * 
 * @example
 * calculateRemainingAmount(50000, 100000)  // Returns 50000
 * calculateRemainingAmount(100000, 100000) // Returns 0
 * calculateRemainingAmount(0, 100000)      // Returns 100000
 */
export function calculateRemainingAmount(
  settledAmount: number,
  computedAmount: number
): number {
  const settled = settledAmount || 0;
  const computed = computedAmount || 0;
  const remaining = computed - settled;

  // Ensure non-negative (handle overpayment edge case)
  return Math.max(0, remaining);
}

/**
 * Format payment state for display
 * 
 * @param state - Payment state ('paid', 'unpaid', 'partial')
 * @param percentage - Optional percentage for partial payments
 * @returns Formatted display string
 * 
 * @example
 * formatPaymentState('paid')           // Returns 'Paid'
 * formatPaymentState('unpaid')         // Returns 'Unpaid'
 * formatPaymentState('partial', 45.5)  // Returns 'Partial (45.5%)'
 */
export function formatPaymentState(
  state: PaymentState,
  percentage?: number
): string {
  switch (state) {
    case 'paid':
      return 'Paid';
    case 'unpaid':
      return 'Unpaid';
    case 'partial':
      if (percentage !== undefined) {
        return `Partial (${percentage}%)`;
      }
      return 'Partial';
    default:
      return 'Unknown';
  }
}

/**
 * Validate settlement amount
 * 
 * Checks if a proposed settlement amount is valid according to business rules:
 * - Must be greater than 0
 * - Must not exceed remaining amount
 * 
 * @param amount - Proposed settlement amount
 * @param settledAmount - Current settled amount
 * @param computedAmount - Total computed amount
 * @returns Object with isValid flag and optional error message
 * 
 * @example
 * validateSettlementAmount(50000, 0, 100000)
 * // Returns { isValid: true }
 * 
 * validateSettlementAmount(0, 0, 100000)
 * // Returns { isValid: false, error: 'Settlement amount must be greater than 0' }
 * 
 * validateSettlementAmount(60000, 50000, 100000)
 * // Returns { isValid: false, error: 'Settlement amount cannot exceed remaining amount (50000)' }
 */
export function validateSettlementAmount(
  amount: number,
  settledAmount: number,
  computedAmount: number
): { isValid: boolean; error?: string } {
  // Check if amount is positive
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Settlement amount must be greater than 0',
    };
  }

  // Calculate remaining amount
  const remaining = calculateRemainingAmount(settledAmount, computedAmount);

  // Check if amount exceeds remaining
  if (amount > remaining) {
    return {
      isValid: false,
      error: `Settlement amount cannot exceed remaining amount (${remaining})`,
    };
  }

  return { isValid: true };
}
