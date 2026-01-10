import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { BanknoteIcon } from '@/components/ui/icons';
import { ExpenseSplit } from '@/modules/expenses/types';
import { BankingPaymentDialog } from './banking-payment-dialog';
import { useDonationSettings } from '@/hooks/use-donation-settings';
import { cn } from '@/lib/utils';

interface BankingPaymentButtonProps {
  split: ExpenseSplit & {
    profiles?: {
      id: string;
      full_name: string;
      email?: string;
    };
  };
  className?: string;
  disabled?: boolean;
  onPaymentComplete?: () => void;
}

export function BankingPaymentButton({
  split,
  className,
  disabled = false,
  onPaymentComplete,
}: BankingPaymentButtonProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const { data: donationSettings, isLoading } = useDonationSettings();

  // Don't show button if loading
  if (isLoading) {
    return null;
  }

  // Don't show button if donation settings not configured or bank_info missing
  if (!donationSettings || !donationSettings.bank_info) {
    return null;
  }

  // Don't show button if already settled
  if (split.is_settled) {
    return null;
  }

  const remainingAmount = split.computed_amount - (split.settled_amount || 0);

  // Don't show button if no remaining amount
  if (remainingAmount <= 0) {
    return null;
  }

  const handlePaymentComplete = () => {
    setDialogOpen(false);
    setIsOpening(false);
    onPaymentComplete?.();
  };

  const handleOpenDialog = () => {
    if (isOpening) return;
    setIsOpening(true);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setIsOpening(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={handleOpenDialog}
        disabled={disabled || isOpening}
        className={cn(
          "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white",
          className
        )}
      >
        <BanknoteIcon className="h-4 w-4 mr-2" />
        {t('payments.payViaBanking', 'Pay via Banking')}
      </Button>

      <BankingPaymentDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        split={split}
        amount={remainingAmount}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}
