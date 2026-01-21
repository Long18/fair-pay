/**
 * VietQR Payment Dialog
 *
 * Shows a VietQR code for the user to scan and pay.
 * Displays the payee's bank QR with exact amount.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  CopyIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  QrCodeIcon,
  ExternalLinkIcon,
} from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';
import { triggerHaptic } from '@/lib/haptics';
import { usePayeeBankSettings } from '@/hooks/use-bank-settings';
import {
  generateVietQRUrl,
  generatePaymentReference,
  formatTransferDescription,
  getBankByCode,
  createVietQRConfig,
} from '@/lib/vietqr';

interface VietQRPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payeeId: string;
  payeeName: string;
  amount: number;
  currency?: string;
  description?: string;
  onPaymentComplete?: () => void;
}

export function VietQRPaymentDialog({
  open,
  onOpenChange,
  payeeId,
  payeeName,
  amount,
  currency = '₫',
  description,
  onPaymentComplete,
}: VietQRPaymentDialogProps) {
  const { t } = useTranslation();
  const { bankInfo, isLoading, isConfigured } = usePayeeBankSettings(payeeId);
  const [hasCopied, setHasCopied] = useState(false);

  // Generate payment reference once when dialog opens
  const reference = useMemo(() => {
    return open ? generatePaymentReference() : '';
  }, [open]);

  // Generate transfer description
  const transferInfo = useMemo(() => {
    return formatTransferDescription(reference, description);
  }, [reference, description]);

  // Generate QR URL
  const qrUrl = useMemo(() => {
    if (!bankInfo?.bank || !bankInfo?.account || !bankInfo?.accountName) {
      return null;
    }

    try {
      const config = createVietQRConfig({
        bankCode: bankInfo.bank,
        accountNo: bankInfo.account,
        accountName: bankInfo.accountName,
      });
      if (!config) return null;

      return generateVietQRUrl(config, {
        amount: Math.round(amount),
        addInfo: transferInfo,
      });
    } catch (err) {
      console.error('Error generating VietQR:', err);
      return null;
    }
  }, [bankInfo, amount, transferInfo]);

  const bank = bankInfo?.bank ? getBankByCode(bankInfo.bank) : null;

  const handleCopyReference = () => {
    navigator.clipboard.writeText(transferInfo);
    setHasCopied(true);
    triggerHaptic('light');
    toast.success(t('payments.vietqr.copied', 'Transfer content copied!'));
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCopyAccountNo = () => {
    if (bankInfo?.account) {
      navigator.clipboard.writeText(bankInfo.account);
      triggerHaptic('light');
      toast.success(t('payments.vietqr.accountCopied', 'Account number copied!'));
    }
  };

  const handleDone = () => {
    triggerHaptic('success');
    onPaymentComplete?.();
    onOpenChange(false);
  };

  const footerButtons = (
    <div className="flex gap-2 w-full">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="flex-1 min-h-[44px]"
      >
        {t('common.cancel', 'Cancel')}
      </Button>
      <Button
        onClick={handleDone}
        disabled={!isConfigured}
        className="flex-1 min-h-[44px]"
      >
        <CheckCircle2Icon className="h-4 w-4 mr-2" />
        {t('payments.vietqr.done', 'I have paid')}
      </Button>
    </div>
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('payments.vietqr.title', 'Pay via VietQR')}
      description={t('payments.vietqr.description', 'Scan the QR code with your banking app')}
      footer={footerButtons}
    >
      <div className="space-y-4">
        {/* Amount Display */}
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground mb-1">
            {t('payments.vietqr.payTo', 'Pay to')} {payeeName}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-primary">
            {formatNumber(amount)} {currency}
          </p>
        </div>

        <Separator />

        {/* QR Code Section */}
        {isLoading ? (
          <div className="flex flex-col items-center py-8">
            <Skeleton className="h-64 w-64 rounded-lg" />
            <Skeleton className="h-4 w-32 mt-4" />
          </div>
        ) : !isConfigured ? (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {t('payments.vietqr.notConfigured', '{{name}} has not configured their bank account for VietQR payments.', { name: payeeName })}
            </AlertDescription>
          </Alert>
        ) : qrUrl ? (
          <div className="flex flex-col items-center space-y-4">
            {/* QR Code */}
            <div className="relative w-64 h-64 rounded-lg border bg-white p-2 shadow-sm">
              <img
                src={qrUrl}
                alt="VietQR Code"
                className="h-full w-full object-contain"
                loading="eager"
              />
            </div>

            {/* Bank Info */}
            <div className="w-full space-y-2 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('payments.vietqr.bank', 'Bank')}
                </span>
                <Badge variant="secondary">
                  {bank?.shortName || bankInfo?.bank}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('payments.vietqr.account', 'Account')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAccountNo}
                  className="h-auto py-1 px-2 font-mono"
                >
                  {bankInfo?.account}
                  <CopyIcon className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('payments.vietqr.accountName', 'Name')}
                </span>
                <span className="text-sm font-medium">{bankInfo?.accountName}</span>
              </div>
            </div>

            {/* Transfer Content */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  {t('payments.vietqr.transferContent', 'Transfer content')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyReference}
                  className="h-auto py-1 px-2"
                >
                  {hasCopied ? (
                    <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="p-2 bg-accent rounded border font-mono text-sm break-all">
                {transferInfo}
              </div>
            </div>

            {/* Instructions */}
            <Alert>
              <QrCodeIcon className="h-4 w-4" />
              <AlertDescription>
                {t('payments.vietqr.instructions',
                  'Open your banking app, scan this QR code, and confirm the payment.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              {t('payments.vietqr.error', 'Failed to generate QR code. Please try again.')}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </BottomSheet>
  );
}
