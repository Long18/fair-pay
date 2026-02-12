/**
 * Payment Method Dropdown
 *
 * Dropdown button that shows available payment methods (VietQR, payOS).
 * When only one method is available, renders as a single button.
 * When multiple methods exist, renders as a split button with dropdown.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QrCodeIcon, CreditCardIcon, ChevronDownIcon, ExternalLinkIcon } from '@/components/ui/icons';
import { ExpenseSplit } from '@/modules/expenses/types';
import { VietQRPaymentDialog } from './vietqr-payment-dialog';
import { usePayeeBankSettings } from '@/hooks/use-bank-settings';
import { createPayOSLink } from '@/lib/payos';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';

interface PaymentMethodDropdownProps {
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

export function PaymentMethodDropdown({
  split,
  payeeId,
  className,
  disabled = false,
  onPaymentComplete,
}: PaymentMethodDropdownProps) {
  const { t } = useTranslation();
  const [vietqrDialogOpen, setVietqrDialogOpen] = useState(false);
  const [isPayOSLoading, setIsPayOSLoading] = useState(false);

  const { isConfigured: isVietQRConfigured, isLoading } = usePayeeBankSettings(payeeId);

  if (isLoading) return null;
  if (split.is_settled) return null;

  const remainingAmount = split.computed_amount - (split.settled_amount || 0);
  if (remainingAmount <= 0) return null;

  const hasVietQR = isVietQRConfigured;
  // payOS is always available as a payment option (backend handles config check)
  const hasPayOS = true;

  const availableMethods = [
    hasVietQR && 'vietqr',
    hasPayOS && 'payos',
  ].filter(Boolean);

  // No payment methods available
  if (availableMethods.length === 0) return null;

  const handleVietQRClick = () => {
    triggerHaptic('medium');
    setVietqrDialogOpen(true);
  };

  const handlePayOSClick = async () => {
    triggerHaptic('medium');
    setIsPayOSLoading(true);

    try {
      const currentUrl = window.location.href;
      const result = await createPayOSLink({
        amount: Math.round(remainingAmount),
        description: 'FairPay',
        returnUrl: currentUrl,
        cancelUrl: currentUrl,
        buyerName: split.profiles?.full_name,
        buyerEmail: split.profiles?.email,
      });

      // Open payOS checkout in new tab
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('payOS error:', error);
      toast.error(t('payments.payos.error', 'Failed to create payment link. Please try again.'));
    } finally {
      setIsPayOSLoading(false);
    }
  };

  const handleVietQRDialogClose = (open: boolean) => {
    setVietqrDialogOpen(open);
  };

  const handleVietQRPaymentComplete = () => {
    setVietqrDialogOpen(false);
    onPaymentComplete?.();
  };

  // Single method: render as a simple button
  if (availableMethods.length === 1) {
    if (hasVietQR) {
      return (
        <>
          <Button
            variant="default"
            size="sm"
            onClick={handleVietQRClick}
            disabled={disabled}
            className={cn(
              "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-h-[44px]",
              className
            )}
          >
            <QrCodeIcon className="h-4 w-4 mr-2" />
            {t('payments.payViaVietQR', 'Pay via VietQR')}
          </Button>
          <VietQRPaymentDialog
            open={vietqrDialogOpen}
            onOpenChange={handleVietQRDialogClose}
            payeeId={payeeId}
            payeeName={split.profiles?.full_name || 'recipient'}
            amount={remainingAmount}
            description={`FairPay: ${split.expense_id?.slice(0, 8)}`}
            onPaymentComplete={handleVietQRPaymentComplete}
          />
        </>
      );
    }

    // Only payOS
    return (
      <Button
        variant="default"
        size="sm"
        onClick={handlePayOSClick}
        disabled={disabled || isPayOSLoading}
        className={cn(
          "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white min-h-[44px]",
          className
        )}
      >
        {isPayOSLoading ? (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          <CreditCardIcon className="h-4 w-4 mr-2" />
        )}
        {t('payments.payViaPayOS', 'Pay via payOS')}
      </Button>
    );
  }

  // Multiple methods: render as dropdown
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            disabled={disabled || isPayOSLoading}
            className={cn(
              "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-h-[44px]",
              className
            )}
          >
            <CreditCardIcon className="h-4 w-4 mr-2" />
            {t('payments.pay', 'Pay')}
            <ChevronDownIcon className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          {hasVietQR && (
            <DropdownMenuItem
              onClick={handleVietQRClick}
              className="cursor-pointer py-2.5"
            >
              <QrCodeIcon className="h-4 w-4 mr-2.5 text-blue-600" />
              <div className="flex flex-col">
                <span className="font-medium">{t('payments.vietqr.label', 'VietQR')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('payments.vietqr.sublabel', 'Scan QR with banking app')}
                </span>
              </div>
            </DropdownMenuItem>
          )}
          {hasPayOS && (
            <DropdownMenuItem
              onClick={handlePayOSClick}
              disabled={isPayOSLoading}
              className="cursor-pointer py-2.5"
            >
              {isPayOSLoading ? (
                <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mr-2.5" />
              ) : (
                <CreditCardIcon className="h-4 w-4 mr-2.5 text-emerald-600" />
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{t('payments.payos.label', 'payOS')}</span>
                  <ExternalLinkIcon className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {t('payments.payos.sublabel', 'Online payment gateway')}
                </span>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <VietQRPaymentDialog
        open={vietqrDialogOpen}
        onOpenChange={handleVietQRDialogClose}
        payeeId={payeeId}
        payeeName={split.profiles?.full_name || 'recipient'}
        amount={remainingAmount}
        description={`FairPay: ${split.expense_id?.slice(0, 8)}`}
        onPaymentComplete={handleVietQRPaymentComplete}
      />
    </>
  );
}
