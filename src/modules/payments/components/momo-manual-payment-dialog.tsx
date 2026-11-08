/**
 * Pay a payee via their uploaded MoMo QR (manual confirm on receive — no auto-settle).
 */

import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircleIcon, CheckCircle2Icon } from '@/components/ui/icons';
import { usePayeeMomoInfo } from '@/hooks/payment/use-momo-info-settings';
import { useMomoManualPaymentClaim } from '@/hooks/payment/use-momo-manual-payment-claim';
import { cn } from '@/lib/utils';
import { getSemanticStatusColors } from '@/lib/status-colors';
import { useHaptics } from '@/hooks/use-haptics';
import { toast } from 'sonner';
import { journeyTracking } from '@/lib/journey-tracking';
import { paymentMethodSheetClass } from './payment-method-menu-item';

const warningColors = getSemanticStatusColors('warning');

const vndCurrencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

interface MomoManualPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payeeId: string;
  payeeName?: string;
  amount: number;
  currency?: string;
  expenseSplitId?: string | null;
  expenseId?: string | null;
  onPaymentComplete?: () => void;
}

export function MomoManualPaymentDialog({
  open,
  onOpenChange,
  payeeId,
  payeeName,
  amount,
  currency = 'VND',
  expenseSplitId,
  expenseId,
  onPaymentComplete,
}: MomoManualPaymentDialogProps) {
  const { t } = useTranslation();
  const { tap, success } = useHaptics();
  const { momoInfo, isLoading, isConfigured } = usePayeeMomoInfo(payeeId);
  const { reportPaymentClaim, isReporting } = useMomoManualPaymentClaim();

  if (isLoading || !isConfigured) {
    return null;
  }

  const displayName = payeeName || momoInfo?.accountName || 'recipient';

  const handleOpenChange = (next: boolean) => {
    if (next && open !== next) {
      journeyTracking.trackEvent({
        event_name: 'payment_momo_manual_opened',
        event_category: 'payment',
        page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
        flow_name: 'payment',
        step_name: 'momo_manual_opened',
        properties: { payee_id: payeeId, amount },
      });
    }
    onOpenChange(next);
  };

  const handleReportPaid = async () => {
    tap();
    const result = await reportPaymentClaim({
      payeeId,
      amount,
      expenseSplitId,
      expenseId,
      currency,
    });

    if (!result.success) {
      toast.error(
        t('payments.momo.claimError', 'Could not send payment notice. {{message}}', {
          message: result.error ?? '',
        }),
      );
      return;
    }

    success();
    journeyTracking.trackEvent({
      event_name: 'payment_momo_manual_claimed',
      event_category: 'payment',
      page_path: typeof window !== 'undefined' ? window.location.pathname : '/',
      flow_name: 'payment',
      step_name: 'momo_manual_claimed',
      properties: {
        payee_id: payeeId,
        amount,
        already_pending: result.alreadyPending ?? false,
      },
    });

    toast.success(
      result.alreadyPending
        ? t(
            'payments.momo.claimAlreadyPending',
            'You already reported this payment — waiting for {{name}} to confirm.',
            { name: payeeName || momoInfo?.accountName || t('payments.unknownFriend', 'Friend') },
          )
        : t(
            'payments.momo.claimSuccess',
            'Submitted — waiting for {{name}} to confirm receipt.',
            { name: payeeName || momoInfo?.accountName || t('payments.unknownFriend', 'Friend') },
          ),
    );

    onPaymentComplete?.();
    onOpenChange(false);
  };

  const footerButtons = (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] w-full sm:w-auto"
        onClick={() => onOpenChange(false)}
        disabled={isReporting}
      >
        {t('common.cancel', 'Cancel')}
      </Button>
      <Button
        type="button"
        className="min-h-[44px] w-full sm:w-auto"
        onClick={handleReportPaid}
        disabled={isReporting}
      >
        <CheckCircle2Icon className="mr-2 h-4 w-4" />
        {isReporting
          ? t('payments.momo.claimSubmitting', 'Submitting…')
          : t('payments.momo.done', 'I have paid')}
      </Button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      className={paymentMethodSheetClass}
      title={t('payments.momo.title', 'Pay via MoMo')}
      description={t('payments.momo.manualPayDescription', 'Pay {{amount}} to {{name}}', {
        amount: vndCurrencyFormatter.format(amount),
        name: displayName,
      })}
      footer={footerButtons}
    >
      <div className="space-y-4">
        <div className="py-2 text-center">
          <p className="mb-1 text-sm text-muted-foreground">
            {t('payments.vietqr.payTo', 'Pay to')} {displayName}
          </p>
          <p className="text-2xl font-bold text-primary sm:text-3xl">
            {vndCurrencyFormatter.format(amount)}
          </p>
        </div>

        <Alert className={cn(warningColors.border, warningColors.bg)}>
          <AlertCircleIcon className={cn('h-4 w-4', warningColors.icon)} />
          <AlertDescription className={cn('text-sm', warningColors.text)}>
            {t(
              'payments.momo.payerManualHint',
              'After you transfer in MoMo, tap "I have paid" so the recipient can confirm in FairPay.',
            )}
          </AlertDescription>
        </Alert>

        <Separator />

        <div className="flex flex-col items-center gap-3 py-2">
          {momoInfo?.qrCodeImageUrl ? (
            <div className="w-full max-w-56 rounded-lg border bg-white p-2 sm:max-w-64">
              <img
                src={momoInfo.qrCodeImageUrl}
                alt={t('payments.momo.qrAlt', 'MoMo payment QR')}
                className="aspect-square h-auto w-full object-contain"
              />
            </div>
          ) : null}
          <div className="w-full space-y-1 text-center text-sm">
            {momoInfo?.accountName && (
              <p className="text-muted-foreground">
                {t('payments.momo.accountNameLabel', 'Account name')}:{' '}
                <span className="font-medium text-foreground">{momoInfo.accountName}</span>
              </p>
            )}
            {momoInfo?.phone && (
              <p className="text-muted-foreground">
                {t('payments.momo.phoneLabel', 'Phone')}:{' '}
                <span className="font-medium text-foreground">{momoInfo.phone}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
