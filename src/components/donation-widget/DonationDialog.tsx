import React from 'react';
import { useTranslation } from 'react-i18next';
import { DonationSettings } from '@/types/donation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Heart } from 'lucide-react';
import { generateVietQRDeeplink } from '@/lib/vietqr-banks';
import { toast } from 'sonner';

interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DonationSettings;
}

export function DonationDialog({ open, onOpenChange, settings }: DonationDialogProps) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language as 'en' | 'vi';

  const donateMessage = settings.donate_message[currentLang] || settings.donate_message.en;

  const handleQRClick = () => {
    if (settings.bank_info?.app && settings.bank_info?.account && settings.bank_info?.bank) {
      const deeplink = generateVietQRDeeplink(
        settings.bank_info.app,
        settings.bank_info.account,
        settings.bank_info.bank
      );

      // Try to open the deeplink
      window.location.href = deeplink;
      toast.success(t('settings.donation.openingBankApp', 'Opening bank app...'));
    } else {
      toast.info(t('settings.donation.scanQRCode', 'Please scan the QR code with your banking app'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {settings.cta_text[currentLang] || settings.cta_text.en}
          </DialogTitle>
          <DialogDescription>
            {donateMessage}
          </DialogDescription>
        </DialogHeader>

        {settings.qr_code_image_url && (
          <>
            <Separator />
            <div className="flex flex-col items-center py-4 gap-2">
              <button
                onClick={handleQRClick}
                className="relative w-64 h-64 rounded-lg border bg-white p-2 cursor-pointer hover:shadow-lg transition-shadow group"
                aria-label={t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
              >
                <img
                  src={settings.qr_code_image_url}
                  alt="QR Code"
                  className="h-full w-full object-contain"
                />
                {settings.bank_info?.app && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <span className="text-white text-sm font-medium">
                      {t('settings.donation.tapToOpenBank', 'Tap to open bank app')}
                    </span>
                  </div>
                )}
              </button>
              {settings.bank_info?.app && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('settings.donation.tapHint', 'Tap QR code to open banking app directly')}
                </p>
              )}
            </div>
          </>
        )}

        {settings.bank_info && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              {settings.bank_info.accountName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-medium">{settings.bank_info.accountName}</span>
                </div>
              )}
              {settings.bank_info.account && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">{settings.bank_info.account}</span>
                </div>
              )}
              {settings.bank_info.bank && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="font-medium">{settings.bank_info.bank}</span>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
