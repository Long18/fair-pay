/**
 * SePay Payment Dialog
 *
 * Shows SePay checkout flow with animated beam during processing.
 * Creates order via edge function, auto-submits form to SePay, polls for status.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { toast } from 'sonner';
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  ExternalLinkIcon,
  WalletIcon,
  FairPayIcon,
  BanknoteIcon,
} from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { triggerHaptic } from '@/lib/haptics';
import { useSepayOrder } from '@/hooks/use-sepay-order';
import { cn } from '@/lib/utils';

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
    formAction,
    formFields,
    status,
    isCreating,
    isPolling,
    error,
    createOrder,
    stopPolling,
    reset,
  } = useSepayOrder();

  // Beam refs for animated payment flow
  const containerRef = useRef<HTMLDivElement>(null);
  const payerRef = useRef<HTMLDivElement>(null);
  const sepayRef = useRef<HTMLDivElement>(null);
  const payeeRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const hasSubmittedRef = useRef(false);

  // Create order when dialog opens
  useEffect(() => {
    if (open && !order && !isCreating && !error) {
      hasSubmittedRef.current = false;
      createOrder({
        source_type: sourceType,
        source_id: sourceId,
        payee_user_id: payeeId,
        amount,
        description: description || `FairPay: ${sourceId.slice(0, 8)}`,
      });
    }
  }, [open, order, isCreating, error, createOrder, sourceType, sourceId, payeeId, amount, description]);

  // Auto-submit form to SePay when form data is ready
  useEffect(() => {
    if (formAction && formFields && formRef.current && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
      triggerHaptic('medium');
      // Small delay to let user see the "redirecting" state
      const timer = setTimeout(() => {
        formRef.current?.submit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formAction, formFields]);

  // Handle payment completion
  useEffect(() => {
    if (status === 'PAID') {
      triggerHaptic('success');
      toast.success(t('payments.sepay.paymentSuccess', 'Payment confirmed!'));
      onPaymentComplete?.();
    }
  }, [status, t, onPaymentComplete]);

  // Manual redirect to SePay (fallback button)
  const handleManualRedirect = useCallback(() => {
    if (formRef.current) {
      triggerHaptic('medium');
      formRef.current.submit();
    }
  }, []);

  // Reset on close
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopPolling();
      hasSubmittedRef.current = false;
      setTimeout(reset, 300);
    }
    onOpenChange(nextOpen);
  };

  const isPending = status === 'PENDING' || isPolling;
  const isPaid = status === 'PAID';
  const isFailed = status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED';

  const footerButtons = (
    <div className="flex gap-2 w-full">
      <Button
        variant="outline"
        onClick={() => handleClose(false)}
        className="flex-1 min-h-[44px]"
      >
        {t('common.close', 'Close')}
      </Button>
      {formAction && formFields && !isPaid && !isFailed && (
        <Button
          onClick={handleManualRedirect}
          className="flex-1 min-h-[44px]"
        >
          <ExternalLinkIcon className="h-4 w-4 mr-2" />
          {t('payments.sepay.goToPayment', 'Go to Payment')}
        </Button>
      )}
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleClose}
      title={t('payments.sepay.title', 'Pay via SePay')}
      description={t('payments.sepay.description', 'Complete payment through SePay gateway')}
      footer={footerButtons}
    >
      <div className="space-y-4">
        {/* Hidden form for SePay redirect */}
        {formAction && formFields && (
          <form
            ref={formRef}
            method="POST"
            action={formAction}
            style={{ display: 'none' }}
          >
            {Object.entries(formFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
          </form>
        )}

        {/* Amount Display */}
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground mb-1">
            {t('payments.sepay.payTo', 'Pay to')} {payeeName}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-primary">
            {formatNumber(amount)} {currency}
          </p>
        </div>

        <Separator />

        {/* Loading / Creating State */}
        {isCreating && (
          <div className="flex flex-col items-center py-8">
            <Skeleton className="h-24 w-full max-w-xs rounded-lg" />
            <Skeleton className="h-4 w-32 mt-4" />
            <p className="text-sm text-muted-foreground mt-2">
              {t('payments.sepay.creating', 'Creating payment order...')}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Pending / Polling State - Animated Beam */}
        {isPending && !isCreating && (
          <div className="flex flex-col items-center space-y-4">
            {/* Animated Beam Payment Flow */}
            <div
              ref={containerRef}
              className="relative flex w-full max-w-xs mx-auto items-center justify-between px-6"
              style={{ minHeight: 80 }}
            >
              <div
                ref={payerRef}
                className="relative z-10 flex items-center justify-center rounded-xl border bg-background p-2.5 shadow-sm size-10 animate-beam-node-float"
              >
                <WalletIcon size={16} className="text-primary" />
              </div>

              <div
                ref={sepayRef}
                className="relative z-10 flex items-center justify-center rounded-2xl border-2 border-primary/30 bg-background p-3 shadow-lg animate-beam-pulse"
              >
                <FairPayIcon size={28} className="rounded-md" />
              </div>

              <div
                ref={payeeRef}
                className="relative z-10 flex items-center justify-center rounded-xl border bg-background p-2.5 shadow-sm size-10 animate-beam-node-float"
                style={{ animationDelay: '0.3s' }}
              >
                <BanknoteIcon size={16} className="text-green-500" />
              </div>

              <AnimatedBeam
                containerRef={containerRef}
                fromRef={payerRef}
                toRef={sepayRef}
                curvature={-0.15}
                duration={2.2}
                delay={0}
                gradientStartColor="#3b82f6"
                gradientStopColor="#6366f1"
              />
              <AnimatedBeam
                containerRef={containerRef}
                fromRef={sepayRef}
                toRef={payeeRef}
                curvature={-0.15}
                duration={2.2}
                delay={0.2}
                gradientStartColor="#22c55e"
                gradientStopColor="#10b981"
              />
            </div>

            <p className="text-sm text-muted-foreground animate-beam-pulse">
              {formAction
                ? t('payments.sepay.redirecting', 'Redirecting to SePay payment page...')
                : t('payments.sepay.waitingForPayment', 'Waiting for payment confirmation...')
              }
            </p>

            {/* Manual redirect button */}
            {formAction && formFields && (
              <Button
                variant="outline"
                onClick={handleManualRedirect}
                className="min-h-[44px]"
              >
                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                {t('payments.sepay.goToPayment', 'Go to Payment')}
              </Button>
            )}

            <Alert>
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>
                {t('payments.sepay.instructions',
                  'Complete the payment on the SePay page. This dialog will update automatically when you return.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Success State */}
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

        {/* Failed State */}
        {isFailed && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {status === 'EXPIRED'
                ? t('payments.sepay.expired', 'Payment order has expired. Please try again.')
                : t('payments.sepay.failed', 'Payment failed or was cancelled. Please try again.')
              }
            </AlertDescription>
          </Alert>
        )}
      </div>
    </BottomSheet>
  );
}
