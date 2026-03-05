import React, { useState, useEffect } from 'react';
import { useHaptics } from "@/hooks/use-haptics";
import { useTranslation } from 'react-i18next';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getSemanticStatusColors } from '@/lib/status-colors';
import { toast } from 'sonner';
import {
  RefreshCwIcon,
  CopyIcon,
  CheckCircle2Icon,
  CalendarIcon,
  XCircleIcon,
  AlertCircleIcon
} from '@/components/ui/icons';
import { ExpenseSplit } from '@/modules/expenses/types';
import { momoAPI } from '@/lib/momo/api';
import { useMomoPayment } from '@/hooks/payment/use-momo-payment';
import { formatNumber } from '@/lib/locale-utils';

interface MomoPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  split: ExpenseSplit;
  amount: number;
  onPaymentComplete?: () => void;
}

export function MomoPaymentDialog({
  open,
  onOpenChange,
  split,
  amount,
  onPaymentComplete,
}: MomoPaymentDialogProps) {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [isRechecking, setIsRechecking] = useState(false);
  const creationAttemptedRef = React.useRef(false);

  const {
    paymentRequest,
    isLoading,
    isCreating,
    status,
    error,
    createPaymentRequest,
    recheckPayment,
    subscribeToUpdates,
  } = useMomoPayment(split.id);
  const { tap, success } = useHaptics();

  // Create payment request when dialog opens (only once)
  useEffect(() => {
    if (open && !paymentRequest && !isLoading && !isCreating && identity?.id && !creationAttemptedRef.current) {
      creationAttemptedRef.current = true;
      createPaymentRequest(amount);
    }

    // Reset ref when dialog closes
    if (!open) {
      creationAttemptedRef.current = false;
    }
  }, [open, paymentRequest, isLoading, isCreating, identity?.id, amount]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (open && paymentRequest?.id) {
      const unsubscribe = subscribeToUpdates(() => {
        // Payment verified via webhook
        success();
        toast.success(t('payments.momo.paymentVerified', 'Payment verified successfully!'));
        onPaymentComplete?.();
        onOpenChange(false);
      });

      return () => {
        unsubscribe?.();
      };
    }
  }, [open, paymentRequest?.id, subscribeToUpdates, onPaymentComplete, onOpenChange, t]);

  const handleRecheck = async () => {
    if (!paymentRequest?.reference_code) return;

    setIsRechecking(true);
    try {
      const verified = await recheckPayment();
      if (verified) {
        success();
        toast.success(t('payments.momo.paymentVerified', 'Payment verified successfully!'));
        onPaymentComplete?.();
        onOpenChange(false);
      } else {
        toast.info(t('payments.momo.paymentNotFound', 'Payment not found yet. Please wait a moment and try again.'));
      }
    } catch (error) {
      console.error('Error rechecking payment:', error);
      toast.error(t('payments.momo.recheckError', 'Failed to check payment status'));
    } finally {
      setIsRechecking(false);
    }
  };

  const handleCopyReference = () => {
    if (paymentRequest?.reference_code) {
      tap();
      navigator.clipboard.writeText(paymentRequest.reference_code);
      toast.success(t('payments.momo.referenceCopied', 'Reference code copied!'));
    }
  };

  const getStatusBadge = () => {
    const successColors = getSemanticStatusColors('success');
    const warningColors = getSemanticStatusColors('warning');
    
    switch (status) {
      case 'verified':
        return (
          <Badge className={`gap-1 ${successColors.bg} ${successColors.text} ${successColors.border}`}>
            <CheckCircle2Icon className="h-3 w-3" />
            {t('payments.momo.status.verified', 'Verified')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircleIcon className="h-3 w-3" />
            {t('payments.momo.status.failed', 'Failed')}
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="gap-1">
            <CalendarIcon className="h-3 w-3" />
            {t('payments.momo.status.expired', 'Expired')}
          </Badge>
        );
      default:
        return (
          <Badge className={`gap-1 ${warningColors.bg} ${warningColors.text} ${warningColors.border}`}>
            <CalendarIcon className="h-3 w-3" />
            {t('payments.momo.status.pending', 'Waiting for payment')}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {t('payments.momo.title', 'Pay via MoMo')}
            {paymentRequest && getStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            {t('payments.momo.description', 'Scan the QR code with your MoMo app to pay')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Display */}
          <div className="text-center py-2">
            <p className="text-2xl font-bold">
              {formatNumber(amount)} VND
            </p>
          </div>

          <Separator />

          {/* QR Code Section */}
          {isLoading || isCreating ? (
            <div className="flex flex-col items-center py-8">
              <Skeleton className="h-64 w-64 rounded-lg" />
              <Skeleton className="h-4 w-32 mt-4" />
            </div>
          ) : paymentRequest ? (
            <div className="flex flex-col items-center space-y-4">
              {/* QR Code */}
              <div className="relative w-64 h-64 rounded-lg border bg-white p-2">
                <img
                  src={momoAPI.generatePaymentQR(amount, paymentRequest.reference_code)}
                  alt="MoMo QR Code"
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Reference Code */}
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <code className="text-sm font-mono">
                  {paymentRequest.reference_code}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyReference}
                  className="h-6 w-6"
                >
                  <CopyIcon className="h-3 w-3" />
                </Button>
              </div>

              {/* Instructions */}
              <Alert>
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>
                  {t('payments.momo.instructions',
                    'Please include the reference code in the transfer note'
                  )}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>
                {error || t('payments.momo.error', 'Failed to create payment request')}
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>

            <Button
              onClick={handleRecheck}
              disabled={!paymentRequest || isRechecking || status === 'verified'}
            >
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isRechecking ? 'animate-spin' : ''}`} />
              {t('payments.momo.recheck', 'I already paid, recheck')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
