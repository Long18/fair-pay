/**
 * SePay QR Payment Dialog
 *
 * Shows VietQR code for bank transfer payment.
 * Creates order via edge function, displays QR from qr.sepay.vn, polls for status.
 * SePay detects the transfer via webhook and confirms payment.
 */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  CopyIcon,
} from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { triggerHaptic } from '@/lib/haptics';
import { useSepayOrder } from '@/hooks/use-sepay-order';

interface SepayPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payeeId: string;
  payeeName: string;
  amount: number;
  currency?: string;
  sourceType: 'DEBT' | 'EXPENSE';
  sourceId: string;
  description?: string;
  onPaymentComplete?: () => void;
}

export function SepayPaymentDialog({
  open,
  onOpenChange,
  payeeId,
  payeeName,
  amount,
  currency = '₫',
  sourceType,
  sourceId,
  description,
  onPaymentComplete,
}: SepayPaymentDialogProps) {
  const { t } = useTranslation();
  const {
    order,
    qrUrl,
    paymentCode,
    status,
    isCreating,
    isPolling,
    error,
    createOrder,
    stopPolling,
    reset,
  } = useSepayOrder();

  const hasCreatedRef = useRef(false);

  // Create order when dialog opens
  useEffect(() => {
    if (open && !order && !isCreating && !error && !hasCreatedRef.current) {
      hasCreatedRef.current = true;
      createOrder({
        source_type: sourceType,
        source_id: sourceId,
        payee_user_id: payeeId,
        amount,
        description: description || `FairPay: ${sourceId.slice(0, 8)}`,
      });
    }
  }, [open, order, isCreating, error, createOrder, sourceType, sourceId, payeeId, amount, description]);

  useEffect(() => {
    if (status === 'PAID') {
      triggerHaptic('success');
      toast.success(t('payments.sepay.paymentSuccess', 'Payment confirmed!'));
      onPaymentComplete?.();
    } else if (status === 'PARTIAL_PAID') {
      triggerHaptic('medium');
      const paidAmount = order?.paid_amount ?? 0;
      const remaining = amount - paidAmount;
      toast.info(
        t('payments.sepay.partialPaymentReceived', {
          defaultValue: `Partial payment received: ${formatNumber(paidAmount)} ${currency}. Remaining: ${formatNumber(remaining)} ${currency}`,
          paid: formatNumber(paidAmount),
          remaining: formatNumber(remaining),
          currency,
        })
      );
      onPaymentComplete?.();
    }
  }, [status, t, onPaymentComplete, order, amount, currency]);

  const handleCopyCode = () => {
    if (paymentCode) {
      navigator.clipboard.writeText(paymentCode);
      triggerHaptic('light');
      toast.success(t('payments.sepay.codeCopied', 'Payment code copied!'));
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopPolling();
      hasCreatedRef.current = false;
      setTimeout(reset, 300);
    }
    onOpenChange(nextOpen);
  };

  const isPending = status === 'PENDING' || isPolling;
  const isPaid = status === 'PAID';
  const isPartialPaid = status === 'PARTIAL_PAID';
  const isFailed = status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED';

  const footerButtons = (
    <div className="flex gap-2 w-full">
      <Button variant="outline" onClick={() => handleClose(false)} className="flex-1 min-h-[44px]">
        {isPaid || isPartialPaid ? t('common.done', 'Done') : t('common.close', 'Close')}
      </Button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleClose}
      title={t('payments.sepay.title', 'Pay via QR Transfer')}
      description={t('payments.sepay.description', 'Scan QR code with your banking app to transfer')}
      footer={footerButtons}
    >
      <div className="space-y-4">
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground mb-1">
            {t('payments.sepay.payTo', 'Pay to')} {payeeName}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-primary">
            {formatNumber(amount)} {currency}
          </p>
        </div>

        <Separator />

        {isCreating && (
          <div className="flex flex-col items-center py-8">
            <Skeleton className="h-48 w-48 rounded-lg" />
            <Skeleton className="h-4 w-32 mt-4" />
            <p className="text-sm text-muted-foreground mt-2">
              {t('payments.sepay.creating', 'Creating payment QR...')}
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isPending && !isCreating && qrUrl && (
          <div className="flex flex-col items-center space-y-4">
            {/* QR Code Image */}
            <div className="bg-white p-3 rounded-xl shadow-sm border">
              <img
                src={qrUrl}
                alt="QR Payment Code"
                className="w-48 h-48 sm:w-56 sm:h-56"
                loading="eager"
              />
            </div>

            {/* Momo text per project rules */}
            <p className="text-xs text-center" style={{ color: '#D82D8B' }}>
              {t('settings.donation.includeMomo', 'Include Momo')}
            </p>

            {/* Payment code */}
            {paymentCode && (
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2">
                <span className="text-xs text-muted-foreground">
                  {t('payments.sepay.paymentCode', 'Payment code')}:
                </span>
                <code className="text-sm font-mono font-semibold">{paymentCode}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                  className="h-7 w-7 p-0"
                  aria-label="Copy payment code"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-sm text-muted-foreground">
                {t('payments.sepay.waitingForPayment', 'Waiting for payment confirmation...')}
              </p>
            </div>

            <Alert>
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {t('payments.sepay.qrInstructions',
                  'Open your banking app, scan the QR code, and complete the transfer. Payment will be confirmed automatically within seconds.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {isPaid && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle2Icon className="h-12 w-12 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                {t('payments.sepay.paymentConfirmed', 'Payment Confirmed')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('payments.sepay.paymentConfirmedDesc', 'Your payment has been processed successfully.')}
              </p>
            </div>
          </div>
        )}

        {isPartialPaid && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4">
              <AlertCircleIcon className="h-12 w-12 text-amber-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                {t('payments.sepay.partialPaymentTitle', 'Partial Payment Received')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('payments.sepay.partialPaymentDesc', {
                  defaultValue: `Received ${formatNumber(order?.paid_amount ?? 0)} ${currency} of ${formatNumber(amount)} ${currency}. The remaining amount has been recorded.`,
                  paid: formatNumber(order?.paid_amount ?? 0),
                  total: formatNumber(amount),
                  currency,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('payments.sepay.partialPaymentRemaining', {
                  defaultValue: `Remaining: ${formatNumber(amount - (order?.paid_amount ?? 0))} ${currency}`,
                  remaining: formatNumber(amount - (order?.paid_amount ?? 0)),
                  currency,
                })}
              </p>
            </div>
          </div>
        )}

        {isFailed && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {status === 'EXPIRED'
                ? t('payments.sepay.expired', 'Payment order has expired. Please try again.')
                : t('payments.sepay.failed', 'Payment failed or was cancelled. Please try again.')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </BottomSheet>
  );
}
