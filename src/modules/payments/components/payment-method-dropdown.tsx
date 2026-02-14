/**
 * Payment Method Dropdown
 *
 * Dropdown button that shows available payment methods.
 * When only one method is available, renders as a single button.
 * When multiple methods exist, renders as a dropdown with options.
 *
 * Currently supports: VietQR
 * Extensible for future payment methods.
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
import { QrCodeIcon, CreditCardIcon, ChevronDownIcon } from '@/components/ui/icons';
import { ExpenseSplit } from '@/modules/expenses/types';
import { VietQRPaymentDialog } from './vietqr-payment-dialog';
import { SepayPaymentDialog } from './sepay-payment-dialog';
import { usePayeeBankSettings } from '@/hooks/use-bank-settings';
import { usePayeeSepaySettings } from '@/hooks/use-sepay-settings';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';

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
  const [sepayDialogOpen, setSepayDialogOpen] = useState(false);

  const { isConfigured: isVietQRConfigured, isLoading } = usePayeeBankSettings(payeeId);
  const { isConfigured: isSepayConfigured, isLoading: isSepayLoading } = usePayeeSepaySettings(payeeId);

  if (isLoading || isSepayLoading) return null;
  if (split.is_settled) return null;

  const remainingAmount = split.computed_amount - (split.settled_amount || 0);
  if (remainingAmount <= 0) return null;

  // Collect available payment methods
  const methods: { id: string; handler: () => void }[] = [];

  if (isVietQRConfigured) {
    methods.push({ id: 'vietqr', handler: () => {
      triggerHaptic('medium');
      setVietqrDialogOpen(true);
    }});
  }

  if (isSepayConfigured) {
    methods.push({ id: 'sepay', handler: () => {
      triggerHaptic('medium');
      setSepayDialogOpen(true);
    }});
  }

  // Future: add more methods here

  if (methods.length === 0) return null;

  const handleVietQRDialogClose = (open: boolean) => {
    setVietqrDialogOpen(open);
  };

  const handleVietQRPaymentComplete = () => {
    setVietqrDialogOpen(false);
    onPaymentComplete?.();
  };

  const handleSepayDialogClose = (open: boolean) => {
    setSepayDialogOpen(open);
  };

  const handleSepayPaymentComplete = () => {
    setSepayDialogOpen(false);
    onPaymentComplete?.();
  };

  const vietqrDialog = (
    <VietQRPaymentDialog
      open={vietqrDialogOpen}
      onOpenChange={handleVietQRDialogClose}
      payeeId={payeeId}
      payeeName={split.profiles?.full_name || 'recipient'}
      amount={remainingAmount}
      description={`FairPay: ${split.expense_id?.slice(0, 8)}`}
      onPaymentComplete={handleVietQRPaymentComplete}
    />
  );

  const sepayDialog = (
    <SepayPaymentDialog
      open={sepayDialogOpen}
      onOpenChange={handleSepayDialogClose}
      payeeId={payeeId}
      payeeName={split.profiles?.full_name || 'recipient'}
      amount={remainingAmount}
      sourceType="EXPENSE"
      sourceId={split.expense_id || split.id}
      description={`FairPay: ${split.expense_id?.slice(0, 8)}`}
      onPaymentComplete={handleSepayPaymentComplete}
    />
  );

  // Single method: render as a simple button
  if (methods.length === 1) {
    const method = methods[0];
    const label = method.id === 'vietqr'
      ? t('payments.payViaVietQR', 'Pay via VietQR')
      : t('payments.payViaSePay', 'Pay via SePay');

    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={method.handler}
          disabled={disabled}
          className={cn(
            "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-h-[44px]",
            className
          )}
        >
          <QrCodeIcon className="h-4 w-4 mr-2" />
          {label}
        </Button>
        {vietqrDialog}
        {sepayDialog}
      </>
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
            disabled={disabled}
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
          {isVietQRConfigured && (
            <DropdownMenuItem
              onClick={methods.find(m => m.id === 'vietqr')?.handler}
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
          {isSepayConfigured && (
            <DropdownMenuItem
              onClick={methods.find(m => m.id === 'sepay')?.handler}
              className="cursor-pointer py-2.5"
            >
              <CreditCardIcon className="h-4 w-4 mr-2.5 text-green-600" />
              <div className="flex flex-col">
                <span className="font-medium">{t('payments.sepay.label', 'SePay')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('payments.sepay.sublabel', 'Pay via SePay gateway')}
                </span>
              </div>
            </DropdownMenuItem>
          )}
          {/* Future payment methods go here */}
        </DropdownMenuContent>
      </DropdownMenu>
      {vietqrDialog}
      {sepayDialog}
    </>
  );
}
