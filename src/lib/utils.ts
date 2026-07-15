import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const vndZeroDecimalFormatter = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return vndZeroDecimalFormatter.format(Math.round(Math.abs(value)));
}

// Re-export status color helpers for convenient access
export {
  getPaymentStateColors,
  getOweStatusColors,
  getSemanticStatusColors,
  getOweStatusFromBalance,
  getPaymentStateFromAmounts,
  paymentStateColors,
  oweStatusColors,
  semanticStatusColors,
  type PaymentState,
  type OweStatus,
  type SemanticStatus,
  type StatusColorSet,
} from './status-colors';
