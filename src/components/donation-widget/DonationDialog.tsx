import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DonationSettings } from '@/types/donation';
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
import { HeartIcon, ArrowUpRightIcon, BanknoteIcon, XIcon } from "@/components/ui/icons";
interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DonationSettings;
}

export function DonationDialog({ open, onOpenChange, settings }: DonationDialogProps) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language as 'en' | 'vi';
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const donateMessage = settings.donate_message[currentLang] || settings.donate_message.en;

  const bankInfo = settings.bank_info;
  const hasBankInfo = bankInfo?.account && bankInfo?.bank;

  // Use selected bank or default to admin's configured bank
  const activeBankId = selectedBankId || bankInfo?.app || '';
  const bankDetails = activeBankId ? findBankById(activeBankId) : null;

  const handleOpenBankApp = (bankId?: string) => {
    const targetBankId = bankId || activeBankId;

    if (hasBankInfo && targetBankId && bankInfo.account && bankInfo.bank) {
      const deeplink = generateVietQRDeeplink(
        targetBankId,
        bankInfo.account,
        bankInfo.bank
      );

      window.location.href = deeplink;
      const bank = findBankById(targetBankId);
      toast.success(
        t('settings.donation.openingBankApp', 'Opening bank app...') +
        (bank ? ` (${bank.name})` : '')
      );
    } else {
      toast.info(t('settings.donation.scanQRCode', 'Please scan the QR code with your banking app'));
    }
  };

  const handleQRClick = () => {
    if (activeBankId) {
      handleOpenBankApp();
    } else {
      toast.info(t('settings.donation.selectBankFirst', 'Please select your bank app first'));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:p-0 max-sm:gap-0 max-sm:max-h-[88dvh] max-sm:overflow-hidden"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-background/90 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('common.cancel', 'Close')}
        >
          <XIcon className="h-4 w-4" />
        </button>

        <div className="sm:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        <div className="max-sm:max-h-[calc(88dvh-4.75rem)] max-sm:overflow-y-auto max-sm:px-4 max-sm:pb-4 max-sm:pt-3">
          <DialogHeader className="pr-12">
            <DialogTitle className="flex items-center gap-2">
              <HeartIcon className="h-5 w-5" style={{ color: '#D82D8B' }} />
              {settings.cta_text[currentLang] || settings.cta_text.en}
            </DialogTitle>
            <DialogDescription>
              {donateMessage}
            </DialogDescription>
          </DialogHeader>

          {settings.qr_code_image_url && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-col items-center gap-4">
                <p className="text-xs text-center" style={{ color: '#D82D8B' }}>
                  {t('settings.donation.includeMomo', 'Include Momo')}
                </p>
                <button
                  onClick={handleQRClick}
                  className="group relative aspect-square w-full max-w-[280px] rounded-lg border bg-white p-2 cursor-pointer hover:shadow-lg transition-shadow"
                  aria-label={t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                >
                  <img
                    src={settings.qr_code_image_url}
                    alt="QR Code"
                    className="h-full w-full object-contain"
                  />
                  {hasBankInfo && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <span className="text-white text-sm font-medium px-3 text-center">
                        {t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                      </span>
                    </div>
                  )}
                </button>

                {!hasBankInfo && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t('settings.donation.scanQRCodeHint', 'Scan the QR code with your banking app')}
                  </p>
                )}
              </div>
            </>
          )}

          {settings.bank_info && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                {settings.bank_info.accountName && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Account Name:</span>
                    <span className="font-medium text-right break-words">{settings.bank_info.accountName}</span>
                  </div>
                )}
                {settings.bank_info.account && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-medium text-right break-all">{settings.bank_info.account}</span>
                  </div>
                )}
                {settings.bank_info.bank && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium text-right break-words">{settings.bank_info.bank}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {hasBankInfo && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-col items-center space-y-3 pb-1">
                <div className="w-full max-w-sm space-y-2">
                  <Label htmlFor="bank-select" className="text-sm font-medium flex items-center justify-center gap-2">
                    <BanknoteIcon className="h-4 w-4" />
                    {t('settings.donation.selectYourBank', 'Select Your Bank App')}
                  </Label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger id="bank-select" className="w-full">
                      <SelectValue placeholder={
                        bankInfo?.app && findBankById(bankInfo.app)?.name ||
                        t('settings.donation.chooseBank', 'Choose your bank app')
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
                      {t('settings.donation.openBankApp', 'Open {{bankName}} App', { bankName: bankDetails.name })}
                      <ArrowUpRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {t('settings.donation.bankAppHint', 'Opens {{bankName}} app to complete payment', { bankName: bankDetails.shortName })}
                    </p>
                  </div>
                )}

                {!bankDetails && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t('settings.donation.selectBankToOpen', 'Select a bank app to open it directly')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sm:hidden border-t bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={handleClose}
          >
            {t('common.cancel', 'Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
