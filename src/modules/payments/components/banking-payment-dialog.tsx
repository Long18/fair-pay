import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { generateVietQRDeeplink, findBankById, VIETQR_BANKS } from '@/lib/vietqr-banks';
import { toast } from 'sonner';
import { BanknoteIcon, ArrowUpRightIcon } from '@/components/ui/icons';
import { ExpenseSplit } from '@/modules/expenses/types';
import { useUserSettings } from '@/hooks/use-user-settings';

interface BankingPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  split: ExpenseSplit & {
    profiles?: {
      id: string;
      full_name: string;
      email?: string;
    };
  };
  payeeId: string; // ID of the user who is owed money
  amount: number;
  onPaymentComplete?: () => void;
}

export function BankingPaymentDialog({
  open,
  onOpenChange,
  split,
  payeeId,
  amount,
  onPaymentComplete: _onPaymentComplete,
}: BankingPaymentDialogProps) {
  const { t } = useTranslation();
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  
  // Fetch payee's banking settings (NOT admin's donation settings)
  const { data: payeeSettings, isLoading } = useUserSettings(payeeId);

  const bankInfo = payeeSettings?.bank_info;
  const hasBankInfo = bankInfo?.account && bankInfo?.bank;

  // Use selected bank or default to payee's configured bank
  const activeBankId = selectedBankId || bankInfo?.app || '';
  const bankDetails = activeBankId ? findBankById(activeBankId) : null;

  // Subtask 2.1: Implement VietQR deeplink generation using payee's account
  const handleOpenBankApp = (bankId?: string) => {
    const targetBankId = bankId || activeBankId;

    if (hasBankInfo && targetBankId && bankInfo.account && bankInfo.bank) {
      try {
        // Include payment amount and payee name in description
        const description = `FairPay: ${split.profiles?.full_name || 'Payment'}`;
        
        const deeplink = generateVietQRDeeplink(
          targetBankId,
          bankInfo.account, // Payee's account number
          bankInfo.bank,    // Payee's bank code
          amount.toString(), // Include payment amount
          description // Include payee name in description
        );

        window.location.href = deeplink;
        
        const bank = findBankById(targetBankId);
        toast.success(
          t('payments.banking.openingBankApp', 'Opening bank app...') +
          (bank ? ` (${bank.name})` : '')
        );
      } catch (error) {
        toast.error(t('payments.banking.failedToOpen', 'Failed to open bank app'));
      }
    } else {
      toast.info(t('payments.banking.scanQRCode', 'Please scan the QR code with your banking app'));
    }
  };

  // Subtask 2.2: Implement QR code click handler
  const handleQRClick = () => {
    if (activeBankId) {
      handleOpenBankApp();
    } else {
      toast.info(t('payments.banking.selectBankFirst', 'Please select your bank app first'));
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BanknoteIcon className="h-5 w-5 text-blue-600" />
            {t('payments.banking.title', 'Pay via Banking')}
          </DialogTitle>
          <DialogDescription>
            {t('payments.banking.description', 'Pay {{amount}} to {{name}}', {
              amount: new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(amount),
              name: split.profiles?.full_name || 'recipient',
            })}
          </DialogDescription>
        </DialogHeader>

        {payeeSettings?.qr_code_image_url && (
          <>
            <Separator />
            <div className="flex flex-col items-center py-4 gap-4">
              <button
                onClick={handleQRClick}
                className="relative w-64 h-64 rounded-lg border bg-white p-2 cursor-pointer hover:shadow-lg transition-shadow group"
                aria-label={t('payments.banking.tapToOpenBank', 'Tap to open bank app')}
              >
                <img
                  src={payeeSettings.qr_code_image_url}
                  alt="QR Code"
                  className="h-full w-full object-contain"
                />
                {hasBankInfo && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <span className="text-white text-sm font-medium">
                      {t('payments.banking.tapToOpenBank', 'Tap to open bank app')}
                    </span>
                  </div>
                )}
              </button>

              {!hasBankInfo && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('payments.banking.scanQRCodeHint', 'Scan the QR code with your banking app')}
                </p>
              )}
            </div>
          </>
        )}

        {bankInfo && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              {bankInfo.accountName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-medium">{bankInfo.accountName}</span>
                </div>
              )}
              {bankInfo.account && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">{bankInfo.account}</span>
                </div>
              )}
              {bankInfo.bank && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-medium">{bankInfo.bank}</span>
                </div>
              )}
            </div>
          </>
        )}

        {hasBankInfo && (
          <>
            <Separator />
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="w-full max-w-sm space-y-2">
                <Label htmlFor="bank-select" className="text-sm font-medium flex items-center justify-center gap-2">
                  <BanknoteIcon className="h-4 w-4" />
                  {t('payments.banking.selectYourBank', 'Select Your Bank App')}
                </Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger id="bank-select" className="w-full">
                    <SelectValue placeholder={
                      bankInfo?.app && findBankById(bankInfo.app)?.name ||
                      t('payments.banking.chooseBank', 'Choose your bank app')
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {VIETQR_BANKS.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{bank.name}</span>
                          <span className="text-xs text-muted-foreground">({bank.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bankDetails && (
                <div className="w-full max-w-sm space-y-3">
                  <Button
                    onClick={() => handleOpenBankApp()}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                  >
                    <BanknoteIcon className="mr-2 h-5 w-5" />
                    {t('payments.banking.openBankApp', 'Open {{bankName}} App', { bankName: bankDetails.name })}
                    <ArrowUpRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {t('payments.banking.bankAppHint', 'Opens {{bankName}} app to complete payment', { bankName: bankDetails.shortName })}
                  </p>
                </div>
              )}

              {!bankDetails && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('payments.banking.selectBankToOpen', 'Select a bank app to open it directly')}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
