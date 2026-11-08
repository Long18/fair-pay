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
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QrCodeIcon, CreditCardIcon, ChevronDownIcon, SparklesIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { ExpenseSplit } from '@/modules/expenses/types';
import { VietQRPaymentDialog } from './vietqr-payment-dialog';
import { SepayPaymentDialog } from './sepay-payment-dialog';
import { MomoManualPaymentDialog } from './momo-manual-payment-dialog';
import { usePayeeBankSettings } from '@/hooks/payment/use-bank-settings';
import { usePayeeMomoInfo } from '@/hooks/payment/use-momo-info-settings';
import { usePayeeSepaySettings } from '@/hooks/payment/use-sepay-settings';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-haptics';
import {
  PaymentMethodMenuItem,
  paymentMethodDropdownContentClass,
} from './payment-method-menu-item';

interface PaymentMethodDropdownProps {
  split: ExpenseSplit & {
    profiles?: {
      id: string;
      full_name: string;
      email?: string;
    };
  };
  payeeId: string;
  payeeName?: string;
  allowSepay?: boolean;
  /** When set (e.g. debt net balance), overrides split remainder for payment amount. */
  amountOverride?: number;
  /** SePay order source; defaults to expense split. */
  sepaySource?: { type: 'DEBT' | 'EXPENSE'; id: string };
  paymentDescription?: string;
  className?: string;
  disabled?: boolean;
  onPaymentComplete?: () => void;
}

export function PaymentMethodDropdown({
  split,
  payeeId,
  payeeName,
  allowSepay = true,
  amountOverride,
  sepaySource,
  paymentDescription,
  className,
  disabled = false,
  onPaymentComplete,
}: PaymentMethodDropdownProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [vietqrDialogOpen, setVietqrDialogOpen] = useState(false);
  const [sepayDialogOpen, setSepayDialogOpen] = useState(false);
  const [momoManualDialogOpen, setMomoManualDialogOpen] = useState(false);

  const { isConfigured: isVietQRConfigured, isLoading } = usePayeeBankSettings(payeeId);
  const { isConfigured: isSepayConfigured, isLoading: isSepayLoading } = usePayeeSepaySettings(payeeId);
  const { isConfigured: isMomoManualConfigured, isLoading: isMomoManualLoading } =
    usePayeeMomoInfo(payeeId);

  if (isLoading || isSepayLoading || isMomoManualLoading) return null;
  if (split.is_settled) return null;

  const remainingAmount =
    amountOverride ?? split.computed_amount - (split.settled_amount || 0);
  if (remainingAmount <= 0) return null;

  const sepaySourceType = sepaySource?.type ?? 'EXPENSE';
  const sepaySourceId = sepaySource?.id ?? (split.expense_id || split.id);
  const transferDescription =
    paymentDescription ??
    `FairPay: ${split.expense_id?.slice(0, 8) ?? split.id.slice(0, 8)}`;

  // Collect available payment methods
  const methods: { id: string; handler: () => void }[] = [];

  if (isVietQRConfigured) {
    methods.push({ id: 'vietqr', handler: () => {
      tap();
      setVietqrDialogOpen(true);
    }});
  }

  if (allowSepay && isSepayConfigured) {
    methods.push({ id: 'sepay', handler: () => {
      tap();
      setSepayDialogOpen(true);
    }});
  }

  if (isMomoManualConfigured) {
    methods.push({
      id: 'momo-manual',
      handler: () => {
        tap();
        setMomoManualDialogOpen(true);
      },
    });
  }

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
      payeeName={payeeName || split.profiles?.full_name || 'recipient'}
      amount={remainingAmount}
      description={transferDescription}
      onPaymentComplete={handleVietQRPaymentComplete}
    />
  );

  const isDebtPlaceholderSplit = split.user_id == null && split.expense_id === split.id;

  const momoManualDialog = (
    <MomoManualPaymentDialog
      open={momoManualDialogOpen}
      onOpenChange={setMomoManualDialogOpen}
      payeeId={payeeId}
      payeeName={payeeName || split.profiles?.full_name || 'recipient'}
      amount={remainingAmount}
      expenseSplitId={isDebtPlaceholderSplit ? null : split.id}
      expenseId={isDebtPlaceholderSplit ? null : split.expense_id}
      onPaymentComplete={onPaymentComplete}
    />
  );

  const sepayDialog = (
    <SepayPaymentDialog
      open={sepayDialogOpen}
      onOpenChange={handleSepayDialogClose}
      payeeId={payeeId}
      payeeName={payeeName || split.profiles?.full_name || 'recipient'}
      amount={remainingAmount}
      sourceType={sepaySourceType}
      sourceId={sepaySourceId}
      description={transferDescription}
      onPaymentComplete={handleSepayPaymentComplete}
    />
  );

  // Single method: render as a simple button
  if (methods.length === 1) {
    const method = methods[0];
    const isSepay = method.id === 'sepay';
    const label =
      method.id === 'vietqr'
        ? t('payments.payViaVietQR', 'Pay via VietQR')
        : method.id === 'momo-manual'
          ? t('payments.payViaMomo', 'Pay via MoMo')
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
          {isSepay && (
            <Badge className="ml-2 bg-emerald-500/20 text-emerald-100 border-emerald-400/30 text-[10px] px-1.5 py-0">
              <SparklesIcon size={10} className="text-emerald-200" />
              Best Choice
            </Badge>
          )}
        </Button>
        {vietqrDialog}
        {sepayDialog}
        {momoManualDialog}
      </>
    );
  }

  // Multiple methods: render as dropdown
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800',
              className,
            )}
          >
            <CreditCardIcon className="h-4 w-4 mr-2" />
            {t('payments.pay', 'Pay')}
            <ChevronDownIcon className="h-3.5 w-3.5 ml-1.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className={paymentMethodDropdownContentClass}
        >
          {isVietQRConfigured && (
            <PaymentMethodMenuItem
              icon={QrCodeIcon}
              iconClassName="text-blue-600"
              title={t('payments.vietqr.label', 'VietQR')}
              description={t('payments.vietqr.sublabel', 'Scan QR with banking app')}
              onClick={methods.find((m) => m.id === 'vietqr')?.handler}
            />
          )}
          {isMomoManualConfigured && (
            <PaymentMethodMenuItem
              icon={QrCodeIcon}
              iconClassName="text-primary"
              title={t('payments.momo.label', 'MoMo QR')}
              description={t('payments.momo.sublabel', 'Scan payee MoMo QR')}
              onClick={methods.find((m) => m.id === 'momo-manual')?.handler}
            />
          )}
          {allowSepay && isSepayConfigured && (
            <PaymentMethodMenuItem
              icon={CreditCardIcon}
              iconClassName="text-green-600"
              title={t('payments.sepay.label', 'SePay')}
              description={t('payments.sepay.sublabel', 'Pay via SePay gateway')}
              onClick={methods.find((m) => m.id === 'sepay')?.handler}
              trailing={
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-[10px] px-1.5 py-0">
                  <SparklesIcon size={10} />
                  Best Choice
                </Badge>
              }
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {vietqrDialog}
      {sepayDialog}
      {momoManualDialog}
    </>
  );
}
