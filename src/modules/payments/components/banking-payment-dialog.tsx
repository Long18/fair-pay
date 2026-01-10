import React from 'react';
import { ExpenseSplit } from '@/modules/expenses/types';

interface BankingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  split: ExpenseSplit & {
    profiles?: {
      id: string;
      full_name: string;
      email?: string;
    };
  };
  amount: number;
  onPaymentComplete?: () => void;
}

export function BankingPaymentDialog({
  open,
  onOpenChange,
  split,
  amount,
  onPaymentComplete,
}: BankingPaymentDialogProps) {
  // Placeholder implementation - will be completed in task 2
  return null;
}
