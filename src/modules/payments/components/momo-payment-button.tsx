import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { BanknoteIcon } from '@/components/ui/icons';
import { ExpenseSplit } from '@/modules/expenses/types';
import { MomoPaymentDialog } from './momo-payment-dialog';
import { momoAPI } from '@/lib/momo/api';
import { cn } from '@/lib/utils';

interface MomoPaymentButtonProps {
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

export function MomoPaymentButton({
  split,
  className,
  disabled = false,
  onPaymentComplete,
}: MomoPaymentButtonProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Don't show button if already settled or MoMo is not configured
  if (split.is_settled || !momoAPI.isConfigured()) {
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

  const remainingAmount = split.computed_amount - (split.settled_amount || 0);

  if (remainingAmount <= 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={handleOpenDialog}
        disabled={disabled || isOpening}
        className={cn(
          "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white",
          className
        )}
      >
        <BanknoteIcon className="h-4 w-4 mr-2" />
        {t('payments.payViaMomo', 'Pay via MoMo')}
      </Button>

      <MomoPaymentDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        split={split}
        amount={remainingAmount}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}
