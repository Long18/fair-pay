/**
 * Status Color Token Usage Examples
 * 
 * This file demonstrates how to use the status color token system.
 * DO NOT import this file in production code - it's for reference only.
 */

import { 
  getPaymentStateColors, 
  getOweStatusColors, 
  getSemanticStatusColors,
  getOweStatusFromBalance,
  getPaymentStateFromAmounts,
} from './status-colors';

// Example 1: Payment State Badge
export function PaymentStateBadgeExample() {
  const paidColors = getPaymentStateColors('paid');
  const unpaidColors = getPaymentStateColors('unpaid');
  const partialColors = getPaymentStateColors('partial');

  return (
    <div className="flex gap-2">
      <span className={`px-3 py-1 rounded-md ${paidColors.bg} ${paidColors.text}`}>
        Paid
      </span>
      <span className={`px-3 py-1 rounded-md ${unpaidColors.bg} ${unpaidColors.text}`}>
        Unpaid
      </span>
      <span className={`px-3 py-1 rounded-md ${partialColors.bg} ${partialColors.text}`}>
        50% Paid
      </span>
    </div>
  );
}

// Example 2: Owe Status Indicator
export function OweStatusIndicatorExample({ balance }: { balance: number }) {
  const status = getOweStatusFromBalance(balance);
  const colors = getOweStatusColors(status);

  return (
    <div className={`flex items-center gap-2 ${colors.bg} p-3 rounded-lg`}>
      <span className={colors.icon}>
        {status === 'owe' ? '↓' : status === 'owed' ? '↑' : '−'}
      </span>
      <span className={colors.text}>
        {status === 'owe' ? 'You owe' : status === 'owed' ? 'Owes you' : 'Settled'}
      </span>
    </div>
  );
}

// Example 3: Dynamic Payment State
export function DynamicPaymentStateExample({ 
  settledAmount, 
  totalAmount 
}: { 
  settledAmount: number; 
  totalAmount: number;
}) {
  const state = getPaymentStateFromAmounts(settledAmount, totalAmount);
  const colors = getPaymentStateColors(state);

  return (
    <div className={`${colors.bg} ${colors.border} border p-4 rounded-lg`}>
      <h3 className={colors.text}>
        Payment Status: {state.toUpperCase()}
      </h3>
      <p className={colors.text}>
        {settledAmount} / {totalAmount} paid
      </p>
    </div>
  );
}

// Example 4: Semantic Status Alert
export function SemanticStatusAlertExample({ type }: { type: 'success' | 'warning' | 'error' | 'info' }) {
  const colors = getSemanticStatusColors(type);

  return (
    <div className={`${colors.bg} ${colors.border} border-l-4 p-4`}>
      <div className="flex items-center gap-2">
        <span className={colors.icon}>●</span>
        <span className={colors.text}>
          {type === 'success' && 'Operation completed successfully'}
          {type === 'warning' && 'Please review this action'}
          {type === 'error' && 'An error occurred'}
          {type === 'info' && 'Additional information available'}
        </span>
      </div>
    </div>
  );
}

// Example 5: Split Card with Status
export function SplitCardExample({ 
  userName, 
  amount, 
  settledAmount 
}: { 
  userName: string; 
  amount: number; 
  settledAmount: number;
}) {
  const state = getPaymentStateFromAmounts(settledAmount, amount);
  const colors = getPaymentStateColors(state);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{userName}</span>
        <span className={`px-2 py-1 rounded text-xs ${colors.bg} ${colors.text}`}>
          {state}
        </span>
      </div>
      <div className="text-lg font-bold">
        ₫{amount.toLocaleString()}
      </div>
      {state === 'partial' && (
        <div className={`text-sm ${colors.text} mt-1`}>
          ₫{settledAmount.toLocaleString()} paid
        </div>
      )}
    </div>
  );
}
