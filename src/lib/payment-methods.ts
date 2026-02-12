/**
 * Payment Methods Configuration
 *
 * Centralized constants for payment method options with icons and colors.
 */

export const PAYMENT_METHODS = {
  cash: { icon: '💵', label: 'Cash', color: 'text-green-600' },
  bank_transfer: { icon: '🏦', label: 'Bank Transfer', color: 'text-blue-600' },
  vietqr: { icon: '📱', label: 'VietQR', color: 'text-blue-600' },
  zalopay: { icon: '🔵', label: 'ZaloPay', color: 'text-blue-500' },
  vnpay: { icon: '🔴', label: 'VNPay', color: 'text-red-600' },
  other: { icon: '📋', label: 'Other', color: 'text-gray-600' },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export function getPaymentMethodInfo(method: PaymentMethod | string | null) {
  return PAYMENT_METHODS[(method as PaymentMethod) || 'cash'] || PAYMENT_METHODS.cash;
}

export function getPaymentMethodOptions() {
  return Object.entries(PAYMENT_METHODS).map(([value, config]) => ({
    value,
    displayLabel: `${config.icon} ${config.label}`,
    ...config,
  }));
}
