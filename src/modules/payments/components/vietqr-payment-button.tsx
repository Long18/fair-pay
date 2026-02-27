/**
 * VietQR Payment Button
 *
 * Button that opens VietQR payment dialog with dynamic QR code.
 * Replaces MomoPaymentButton for Vietnamese bank transfers.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QrCodeIcon } from '@/components/ui/icons';
import { ExpenseSplit } from '@/modules/expenses/types';
import { VietQRPaymentDialog } from './vietqr-payment-dialog';
import { usePayeeBankSettings } from '@/hooks/payment/use-bank-settings';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

interface VietQRPaymentButtonProps {
  split: ExpenseSplit & {
    profiles?: {
      id: string;
      full_name: string;
      email?: string;
    };
  };
  payeeId: string;
  className?: string;
  disabled?: boolean;
  onPaymentComplete?: () => void;
}

export function VietQRPaymentButton({
  split,
  payeeId,
  className,
  disabled = false,
  onPaymentComplete,
}: VietQRPaymentButtonProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const { isConfigured, isLoading } = usePayeeBankSettings(payeeId);

  // Don't show button if loading
  if (isLoading) {
    return null;
  }

  // Don't show button if payee hasn't configured banking information
  if (!isConfigured) {
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
    triggerHaptic('medium');
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
          "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-h-[44px]",
          className
        )}
      >
        <QrCodeIcon className="h-4 w-4 mr-2" />
        {t('payments.payViaVietQR', 'Pay via VietQR')}
      </Button>

      <VietQRPaymentDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        payeeId={payeeId}
        payeeName={split.profiles?.full_name || 'recipient'}
        amount={remainingAmount}
        description={`FairPay: ${split.expense_id?.slice(0, 8)}`}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}
