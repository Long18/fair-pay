/**
 * Status Color Token System
 * 
 * Centralized status color tokens for consistent visual indicators across the application.
 * Uses CSS custom properties from the design token system for theme-aware colors.
 * 
 * @see Requirements 8.1, 8.2, 8.3 - Consistent Status Indicators
 */

/**
 * Payment state color tokens
 * Used for expense payment status (Paid, Unpaid, Partially Paid)
 */
export const paymentStateColors = {
  paid: {
    bg: 'bg-status-success-bg',
    text: 'text-status-success-foreground',
    border: 'border-status-success-border',
    icon: 'text-status-success',
  },
  unpaid: {
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning-foreground',
    border: 'border-status-warning-border',
    icon: 'text-status-warning',
  },
  partial: {
    bg: 'bg-status-info-bg',
    text: 'text-status-info-foreground',
    border: 'border-status-info-border',
    icon: 'text-status-info',
  },
} as const;

/**
 * Owe status color tokens
 * Used for indicating debt direction (you owe, owed to you, neutral)
 */
export const oweStatusColors = {
  owe: {
    bg: 'bg-status-error-bg',
    text: 'text-status-error-foreground',
    border: 'border-status-error-border',
    icon: 'text-semantic-negative',
  },
  owed: {
    bg: 'bg-status-success-bg',
    text: 'text-status-success-foreground',
    border: 'border-status-success-border',
    icon: 'text-semantic-positive',
  },
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: 'text-semantic-neutral',
  },
} as const;

/**
 * Semantic status color tokens
 * Used for general success/warning/error states
 */
export const semanticStatusColors = {
  success: {
    bg: 'bg-status-success-bg',
    text: 'text-status-success-foreground',
    border: 'border-status-success-border',
    icon: 'text-status-success',
  },
  warning: {
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning-foreground',
    border: 'border-status-warning-border',
    icon: 'text-status-warning',
  },
  error: {
    bg: 'bg-status-error-bg',
    text: 'text-status-error-foreground',
    border: 'border-status-error-border',
    icon: 'text-status-error',
  },
  info: {
    bg: 'bg-status-info-bg',
    text: 'text-status-info-foreground',
    border: 'border-status-info-border',
    icon: 'text-status-info',
  },
} as const;

/**
 * Debt status color tokens
 * Used for group debt cards with enhanced states (hover, badge)
 */
export const DEBT_STATUS_COLORS = {
  owe: {
    bg: 'bg-status-error-bg',
    text: 'text-semantic-negative',
    border: 'border-status-error-border',
    badge: 'bg-status-error-bg text-status-error-foreground',
    hover: 'hover:bg-status-error-bg/80',
  },
  owed: {
    bg: 'bg-status-success-bg',
    text: 'text-semantic-positive',
    border: 'border-status-success-border',
    badge: 'bg-status-success-bg text-status-success-foreground',
    hover: 'hover:bg-status-success-bg/80',
  },
  settled: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    badge: 'bg-muted text-muted-foreground',
    hover: 'hover:bg-muted/80',
  },
  pending: {
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning',
    border: 'border-status-warning-border',
    badge: 'bg-status-warning-bg text-status-warning-foreground',
    hover: 'hover:bg-status-warning-bg/80',
  },
} as const;

/**
 * Type definitions for status colors
 */
export type PaymentState = keyof typeof paymentStateColors;
export type OweStatus = keyof typeof oweStatusColors;
export type SemanticStatus = keyof typeof semanticStatusColors;
export type DebtStatus = keyof typeof DEBT_STATUS_COLORS;

export type StatusColorSet = {
  bg: string;
  text: string;
  border: string;
  icon: string;
};

/**
 * Get payment state colors
 */
export function getPaymentStateColors(state: PaymentState): StatusColorSet {
  return paymentStateColors[state];
}

/**
 * Get owe status colors
 */
export function getOweStatusColors(status: OweStatus): StatusColorSet {
  return oweStatusColors[status];
}

/**
 * Get semantic status colors
 */
export function getSemanticStatusColors(status: SemanticStatus): StatusColorSet {
  return semanticStatusColors[status];
}

/**
 * Get owe status from balance amount
 */
export function getOweStatusFromBalance(balance: number): OweStatus {
  if (balance > 0) return 'owed';
  if (balance < 0) return 'owe';
  return 'neutral';
}

/**
 * Get payment state from split data
 */
export function getPaymentStateFromAmounts(
  settledAmount: number,
  totalAmount: number
): PaymentState {
  if (settledAmount >= totalAmount) return 'paid';
  if (settledAmount > 0) return 'partial';
  return 'unpaid';
}
