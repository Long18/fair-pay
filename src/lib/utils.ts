import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
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
